import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { publicClient, CONTRACT_ADDRESS, KINETIC_ABI, MINING_CYCLE_S } from '../lib/chain'
import { getWalletClient } from '../lib/wallet'

// ─── Protocol-level stats ─────────────────────────────────────────────────────

export function useProtocolStats() {
  return useQuery({
    queryKey: ['protocolStats'],
    queryFn: async () => {
      try {
        const [poolRemaining, totalMined, totalCycles, miners] = await Promise.all([
          publicClient.readContract({ address: CONTRACT_ADDRESS, abi: KINETIC_ABI, functionName: 'miningPoolRemaining' }),
          publicClient.readContract({ address: CONTRACT_ADDRESS, abi: KINETIC_ABI, functionName: 'totalMinedTokens' }),
          publicClient.readContract({ address: CONTRACT_ADDRESS, abi: KINETIC_ABI, functionName: 'totalMiningCycles' }),
          publicClient.readContract({ address: CONTRACT_ADDRESS, abi: KINETIC_ABI, functionName: 'uniqueMiners' }),
        ])
        return {
          poolRemaining: poolRemaining as bigint,
          totalMined:    totalMined    as bigint,
          totalCycles:   totalCycles   as bigint,
          uniqueMiners:  miners        as bigint,
        }
      } catch {
        return null
      }
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

// ─── User mining stats ────────────────────────────────────────────────────────

export function useUserMiningStats(address?: `0x${string}`) {
  return useQuery({
    queryKey: ['userMiningStats', address],
    queryFn: async () => {
      if (!address) return null
      try {
        const result = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: KINETIC_ABI,
          functionName: 'getUserStats',
          args: [address],
        }) as [bigint, bigint, bigint, bigint, boolean]

        return {
          totalEarned: result[0],
          cycleCount:  result[1],
          lastMineAt:  result[2],
          cooldown:    result[3],
          canMine:     result[4],
        }
      } catch {
        return {
          totalEarned: 0n,
          cycleCount:  0n,
          lastMineAt:  0n,
          cooldown:    0n,
          canMine:     true,
        }
      }
    },
    enabled: !!address,
    refetchInterval: 10_000,
    staleTime: 5_000,
  })
}

// ─── Mining history events ────────────────────────────────────────────────────

export interface MiningEvent {
  user:          `0x${string}`
  cycleId:       bigint
  reward:        bigint
  tier:          number
  timestamp:     number
  poolRemaining: bigint
  txHash:        `0x${string}`
  blockNumber:   bigint
}

async function fetchMiningEvents(userAddress?: `0x${string}`): Promise<MiningEvent[]> {
  try {
    const latest    = await publicClient.getBlockNumber()
    const fromBlock = latest > 10000n ? latest - 10000n : 0n

    const logs = await publicClient.getLogs({
      address: CONTRACT_ADDRESS,
      event: {
        type: 'event',
        name: 'MiningCycleCompleted',
        inputs: [
          { name: 'user',          type: 'address', indexed: true  },
          { name: 'cycleId',       type: 'uint256', indexed: true  },
          { name: 'reward',        type: 'uint256', indexed: false },
          { name: 'tier',          type: 'uint8',   indexed: false },
          { name: 'timestamp',     type: 'uint256', indexed: false },
          { name: 'poolRemaining', type: 'uint256', indexed: false },
        ],
      } as const,
      args: userAddress ? { user: userAddress } : undefined,
      fromBlock,
      toBlock: latest,
    })

    return logs.map(l => ({
      user:          l.args.user!,
      cycleId:       l.args.cycleId!,
      reward:        l.args.reward!,
      tier:          Number(l.args.tier ?? 1),
      timestamp:     Number(l.args.timestamp!),
      poolRemaining: l.args.poolRemaining!,
      txHash:        l.transactionHash,
      blockNumber:   l.blockNumber,
    })).reverse()
  } catch {
    return []
  }
}

export function useMiningEvents(userAddress?: `0x${string}`) {
  return useQuery({
    queryKey: ['miningEvents', userAddress],
    queryFn:  () => fetchMiningEvents(userAddress),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

// ─── Mine action ──────────────────────────────────────────────────────────────

export type MineStatus = 'idle' | 'watching' | 'confirming' | 'mining' | 'success' | 'error'

export function useMineAction(address?: `0x${string}`) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<MineStatus>('idle')
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [reward, setReward] = useState<bigint | null>(null)
  const [tier,   setTier]   = useState<number | null>(null)
  const [error,  setError]  = useState<string | null>(null)

  const execute = useCallback(async () => {
    if (!address) { setError('Wallet not connected'); return }
    const wc = getWalletClient()
    if (!wc) { setError('No wallet client'); return }

    setStatus('confirming')
    setError(null)
    setReward(null)
    setTier(null)
    setTxHash(null)

    try {
      const [account] = await wc.getAddresses()

      setStatus('mining')
      const hash = await wc.writeContract({
        address: CONTRACT_ADDRESS,
        abi: KINETIC_ABI,
        functionName: 'mine',
        account,
        chain: null,
      })
      setTxHash(hash)

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      // Parse reward + tier from MiningCycleCompleted event
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue
        try {
          const { decodeEventLog } = await import('viem')
          const decoded = decodeEventLog({
            abi: KINETIC_ABI,
            eventName: 'MiningCycleCompleted',
            data: log.data,
            topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
          })
          if (decoded.args && 'reward' in decoded.args) {
            setReward(decoded.args.reward as bigint)
          }
          if (decoded.args && 'tier' in decoded.args) {
            setTier(Number(decoded.args.tier))
          }
          break
        } catch { /* try next log */ }
      }

      setStatus('success')
      queryClient.invalidateQueries({ queryKey: ['userMiningStats', address] })
      queryClient.invalidateQueries({ queryKey: ['miningEvents'] })
      queryClient.invalidateQueries({ queryKey: ['protocolStats'] })
    } catch (err) {
      setStatus('error')
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg.includes('cooldown active') ? 'Mining cooldown active. Wait for next cycle.' :
        msg.includes('User rejected')   ? 'Transaction rejected.' :
        msg.includes('low balance')     ? 'Contract balance too low. Contact admin.' :
        'Transaction failed. Try again.'
      )
    }
  }, [address, queryClient])

  const reset = useCallback(() => {
    setStatus('idle')
    setTxHash(null)
    setReward(null)
    setTier(null)
    setError(null)
  }, [])

  return { status, txHash, reward, tier, error, execute, reset }
}

// ─── Live countdown ───────────────────────────────────────────────────────────

export function useMiningCountdown(cooldownSeconds: number) {
  const [remaining, setRemaining] = useState(cooldownSeconds)

  useEffect(() => {
    setRemaining(cooldownSeconds)
    if (cooldownSeconds <= 0) return
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(id); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [cooldownSeconds])

  const progress = MINING_CYCLE_S > 0
    ? Math.max(0, Math.min(1, 1 - remaining / MINING_CYCLE_S))
    : 1

  return { remaining, progress }
}
