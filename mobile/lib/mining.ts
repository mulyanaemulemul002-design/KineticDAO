import { ethers } from 'ethers'

export const RPC_URL        = 'https://maculatus-rpc.x1eco.com'
export const MINING_ADDRESS = '0xf3b9297d7f99b1f5f8293a397d15da262848aa24'
export const CHAIN_ID       = 10778
export const EXPLORER_URL   = 'https://maculatus-scan.x1eco.com'

export const TIER_LABEL  = ['Apes', 'Basic', 'Hoki']
export const TIER_COLOR  = ['#ff9090', '#A8E6FF', '#60ffb0']
export const TIER_RANGE  = ['0.01–0.10 KNTC', '1 KNTC', '3–5 KNTC']
export const TIER_CHANCE = ['20%', '70%', '10%']

const MINING_ABI = [
  'function mine() returns (uint256 reward, uint8 tier)',
  'function getUserDashboard(address _user) view returns (uint256 pendingClaim, uint256 totalMined, uint256 totalClaimed, uint256 cycleCount, uint256 lastMineAt, uint256 cooldown, bool canMine, bool tgeActive)',
  'function getProtocolStats() view returns (uint256 _totalCycles, uint256 _uniqueMiners, uint256 _totalVirtualMined, uint256 _totalTokensClaimed, uint256 _poolRemaining, bool _tgeActive)',
  'function claimTokens()',
  'event MiningCycleCompleted(address indexed user, uint256 indexed cycleId, uint256 reward, uint8 tier, uint256 timestamp, uint256 poolRemaining)',
  'event AdWatched(address indexed user, uint256 timestamp, uint256 reward, uint8 tier)',
]

export function getProvider() {
  return new ethers.providers.JsonRpcProvider(RPC_URL, {
    chainId: CHAIN_ID,
    name: 'maculatus',
  })
}

export function getReadContract() {
  return new ethers.Contract(MINING_ADDRESS, MINING_ABI, getProvider())
}

export function getWalletContract(privateKey: string) {
  const wallet = new ethers.Wallet(privateKey, getProvider())
  return { wallet, contract: new ethers.Contract(MINING_ADDRESS, MINING_ABI, wallet) }
}

export async function getUserStats(address: string) {
  const c = getReadContract()
  const r = await c.getUserDashboard(address)
  return {
    pendingClaim: r.pendingClaim as ethers.BigNumber,
    totalMined:   r.totalMined  as ethers.BigNumber,
    totalClaimed: r.totalClaimed as ethers.BigNumber,
    cycleCount:   Number(r.cycleCount),
    lastMineAt:   Number(r.lastMineAt),
    cooldown:     Number(r.cooldown),
    canMine:      r.canMine    as boolean,
    tgeActive:    r.tgeActive  as boolean,
  }
}

export async function getProtocolStats() {
  const c = getReadContract()
  const r = await c.getProtocolStats()
  return {
    totalCycles:   Number(r._totalCycles),
    uniqueMiners:  Number(r._uniqueMiners),
    totalMined:    r._totalVirtualMined  as ethers.BigNumber,
    totalClaimed:  r._totalTokensClaimed as ethers.BigNumber,
    poolRemaining: r._poolRemaining      as ethers.BigNumber,
    tgeActive:     r._tgeActive          as boolean,
  }
}

export async function triggerMine(privateKey: string): Promise<{
  reward: ethers.BigNumber
  tier: number
  txHash: string
}> {
  const { contract } = getWalletContract(privateKey)
  const tx = await contract.mine()
  const receipt = await tx.wait()

  const iface = new ethers.utils.Interface(MINING_ABI)
  for (const log of receipt.logs) {
    try {
      const decoded = iface.parseLog(log)
      if (decoded.name === 'MiningCycleCompleted') {
        return {
          reward:  decoded.args.reward,
          tier:    Number(decoded.args.tier),
          txHash:  receipt.transactionHash,
        }
      }
    } catch {}
  }
  return { reward: ethers.BigNumber.from(0), tier: 1, txHash: receipt.transactionHash }
}

export async function getRecentEvents(limit = 30) {
  const provider = getProvider()
  const contract = getReadContract()
  const latest   = await provider.getBlockNumber()
  const from     = Math.max(0, latest - 50000)
  const filter   = contract.filters.MiningCycleCompleted()
  const logs     = await contract.queryFilter(filter, from, 'latest')
  return logs
    .slice(-limit)
    .reverse()
    .map(log => ({
      address:   log.args?.user   as string,
      reward:    log.args?.reward as ethers.BigNumber,
      tier:      Number(log.args?.tier),
      timestamp: Number(log.args?.timestamp),
      txHash:    log.transactionHash,
    }))
}

export function formatKNTC(wei: ethers.BigNumber, dec = 3): string {
  const x = parseFloat(ethers.utils.formatEther(wei))
  if (x === 0) return '0'
  if (x < 0.001) return '< 0.001'
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(2)}M`
  if (x >= 1_000)     return `${(x / 1_000).toFixed(2)}K`
  return x.toFixed(dec)
}

export function formatAddress(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function formatCooldown(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}
