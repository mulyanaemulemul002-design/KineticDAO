import { useQuery } from '@tanstack/react-query'
import { publicClient, AD_WATCHED_ABI, CONTRACT_ADDRESS, maculatusTestnet } from '../lib/chain'
import { parseAbiItem } from 'viem'

export interface AdEvent {
  user: `0x${string}`
  timestamp: number
  reward: bigint
  transactionHash: `0x${string}`
  blockNumber: bigint
}

const AD_WATCHED_EVENT = parseAbiItem('event AdWatched(address indexed user, uint256 timestamp, uint256 reward)')

async function fetchAdEvents(userAddress?: `0x${string}`): Promise<AdEvent[]> {
  try {
    const latestBlock = await publicClient.getBlockNumber()
    const fromBlock = latestBlock > 10000n ? latestBlock - 10000n : 0n

    const logs = await publicClient.getLogs({
      address: CONTRACT_ADDRESS,
      event: AD_WATCHED_EVENT,
      args: userAddress ? { user: userAddress } : undefined,
      fromBlock,
      toBlock: latestBlock,
    })

    return logs.map(log => ({
      user: log.args.user!,
      timestamp: Number(log.args.timestamp!),
      reward: log.args.reward!,
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
    })).reverse()
  } catch {
    return []
  }
}

export function useAdEvents(userAddress?: `0x${string}`) {
  return useQuery({
    queryKey: ['adEvents', userAddress],
    queryFn: () => fetchAdEvents(userAddress),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

export function useUserStats(userAddress?: `0x${string}`) {
  return useQuery({
    queryKey: ['userStats', userAddress],
    queryFn: async () => {
      if (!userAddress) return { totalEarned: 0n, adsWatched: 0, balance: 0n }

      const [balance, events] = await Promise.all([
        publicClient.getBalance({ address: userAddress }).catch(() => 0n),
        fetchAdEvents(userAddress),
      ])

      const totalEarned = events.reduce((sum, e) => sum + e.reward, 0n)
      return {
        totalEarned,
        adsWatched: events.length,
        balance,
      }
    },
    enabled: !!userAddress,
    refetchInterval: 30_000,
  })
}

export function useGlobalStats() {
  return useQuery({
    queryKey: ['globalStats'],
    queryFn: async () => {
      try {
        const latestBlock = await publicClient.getBlockNumber()
        const fromBlock = latestBlock > 50000n ? latestBlock - 50000n : 0n

        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: AD_WATCHED_EVENT,
          fromBlock,
          toBlock: latestBlock,
        })

        const totalRewards = logs.reduce((sum, log) => sum + (log.args.reward ?? 0n), 0n)
        const uniqueUsers = new Set(logs.map(l => l.args.user)).size

        return {
          totalAdsWatched: logs.length,
          totalRewardsDistributed: totalRewards,
          uniqueParticipants: uniqueUsers,
          latestBlock,
        }
      } catch {
        return {
          totalAdsWatched: 0,
          totalRewardsDistributed: 0n,
          uniqueParticipants: 0,
          latestBlock: 0n,
        }
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useNetworkStatus() {
  return useQuery({
    queryKey: ['networkStatus'],
    queryFn: async () => {
      try {
        const [blockNumber, chainId] = await Promise.all([
          publicClient.getBlockNumber(),
          publicClient.getChainId(),
        ])
        return {
          isOnline: true,
          blockNumber,
          chainId,
          chainName: maculatusTestnet.name,
        }
      } catch {
        return {
          isOnline: false,
          blockNumber: 0n,
          chainId: 0,
          chainName: maculatusTestnet.name,
        }
      }
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  })
}
