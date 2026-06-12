import { ethers } from 'ethers'

// ─── Network ──────────────────────────────────────────────────────────────────
export const RPC_URL      = 'https://maculatus-rpc.x1eco.com'
export const CHAIN_ID     = 10778
export const EXPLORER_URL = 'https://maculatus-scan.x1eco.com'

// Address updated after redeploy — set EXPO_PUBLIC_MINING_ADDRESS in .env or hardcode below
export const MINING_ADDRESS =
  process.env.EXPO_PUBLIC_MINING_ADDRESS ?? '0xf3b9297d7f99b1f5f8293a397d15da262848aa24'

// ─── Blueprint Phase 1 constants ─────────────────────────────────────────────
export const RANK_1_LIMIT = 500_000_000_000 // 500B pts
export const RANK_2_LIMIT = 750_000_000_000 // 750B pts
export const RANK_3_LIMIT = 875_000_000_000 // 875B pts

export const POINTS_PER_KNTC = 1_250        // 1250 pts = 1 KNTC
export const SESSION_MAX_S   = 24 * 3600    // 24h session
export const MINING_CYCLE_S  = 24 * 3600    // 24h cooldown

// ─── Tier display ─────────────────────────────────────────────────────────────
export const TIER_LABEL  = ['Apes', 'Basic', 'Hoki']
export const TIER_COLOR  = ['#ff9090', '#A8E6FF', '#60ffb0']
export const TIER_RATE   = ['10,000 pts/h', '50,000 pts/h', '200,000 pts/h']
export const TIER_CHANCE = ['20%', '70%', '10%']

// ─── Rank display ─────────────────────────────────────────────────────────────
export const RANK_NAME: Record<number, string> = {
  1: 'Rank 1 — Full Rate',
  2: 'Rank 2 — Halving x0.5',
  3: 'Rank 3 — Halving x0.25',
}
export const RANK_COLOR: Record<number, string> = {
  1: '#60ffb0',
  2: '#ffd060',
  3: '#ff9090',
}

// ─── ABI — Blueprint Phase 1 ─────────────────────────────────────────────────
const MINING_ABI = [
  'function mine() returns (uint256 ratePerHour, uint8 tier)',
  'function getUserDashboard(address _user) view returns (uint256 pendingClaim, uint256 totalMined, uint256 totalClaimed, uint256 cycleCount, uint256 lastMineAt, uint256 cooldown, bool canMine, bool tgeActive, uint256 ratePerHour, uint256 sessionTimeLeft, uint256 estimatedKNTC)',
  'function getProtocolStats() view returns (uint256 _totalCycles, uint256 _uniqueMiners, uint256 _totalPointsMinted, uint256 _totalTokensClaimed, uint256 _pointsRemaining, bool _tgeActive)',
  'function getCurrentRank() view returns (uint8 rank, uint256 quotaFillPct)',
  'function pendingPoints(address _user) view returns (uint256)',
  'function claimTokens()',
  'event MiningSessionStarted(address indexed user, uint256 indexed cycleId, uint256 ratePerHour, uint8 tier, uint256 timestamp, uint256 totalPointsMinted)',
  'event MiningCycleCompleted(address indexed user, uint256 indexed cycleId, uint256 reward, uint8 tier, uint256 timestamp, uint256 poolRemaining)',
  'event InactivityBurn(address indexed user, uint256 burnedPoints, uint256 timestamp)',
]

// ─── Provider / Contract factories ───────────────────────────────────────────
export function getProvider() {
  return new ethers.providers.JsonRpcProvider(RPC_URL, { chainId: CHAIN_ID, name: 'maculatus' })
}

export function getReadContract() {
  return new ethers.Contract(MINING_ADDRESS, MINING_ABI, getProvider())
}

export function getWalletContract(privateKey: string) {
  const wallet = new ethers.Wallet(privateKey, getProvider())
  return { wallet, contract: new ethers.Contract(MINING_ADDRESS, MINING_ABI, wallet) }
}

// ─── getUserStats ─────────────────────────────────────────────────────────────
export interface UserStats {
  pendingClaim:    ethers.BigNumber
  totalMined:      ethers.BigNumber
  totalClaimed:    ethers.BigNumber
  cycleCount:      number
  lastMineAt:      number
  cooldown:        number
  canMine:         boolean
  tgeActive:       boolean
  ratePerHour:     ethers.BigNumber
  sessionTimeLeft: number
  estimatedKNTC:   ethers.BigNumber
}

export async function getUserStats(address: string): Promise<UserStats> {
  const c = getReadContract()
  const r = await c.getUserDashboard(address)
  return {
    pendingClaim:    r.pendingClaim    as ethers.BigNumber,
    totalMined:      r.totalMined      as ethers.BigNumber,
    totalClaimed:    r.totalClaimed    as ethers.BigNumber,
    cycleCount:      Number(r.cycleCount),
    lastMineAt:      Number(r.lastMineAt),
    cooldown:        Number(r.cooldown),
    canMine:         r.canMine         as boolean,
    tgeActive:       r.tgeActive       as boolean,
    ratePerHour:     r.ratePerHour     as ethers.BigNumber,
    sessionTimeLeft: Number(r.sessionTimeLeft),
    estimatedKNTC:   r.estimatedKNTC   as ethers.BigNumber,
  }
}

// ─── getCurrentRank ───────────────────────────────────────────────────────────
export async function getCurrentRank(): Promise<{ rank: number; quotaFillPct: number }> {
  const c = getReadContract()
  const r = await c.getCurrentRank()
  return { rank: Number(r.rank), quotaFillPct: Number(r.quotaFillPct) }
}

// ─── getProtocolStats ─────────────────────────────────────────────────────────
export async function getProtocolStats() {
  const c = getReadContract()
  const r = await c.getProtocolStats()
  return {
    totalCycles:       Number(r._totalCycles),
    uniqueMiners:      Number(r._uniqueMiners),
    totalPointsMinted: r._totalPointsMinted  as ethers.BigNumber,
    totalTokensClaimed:r._totalTokensClaimed as ethers.BigNumber,
    pointsRemaining:   r._pointsRemaining    as ethers.BigNumber,
    tgeActive:         r._tgeActive          as boolean,
  }
}

// ─── triggerMine ──────────────────────────────────────────────────────────────
export async function triggerMine(privateKey: string): Promise<{
  ratePerHour: ethers.BigNumber
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
      if (decoded.name === 'MiningSessionStarted') {
        return {
          ratePerHour: decoded.args.ratePerHour,
          tier:        Number(decoded.args.tier),
          txHash:      receipt.transactionHash,
        }
      }
    } catch {}
  }
  return {
    ratePerHour: ethers.BigNumber.from(0),
    tier: 1,
    txHash: receipt.transactionHash,
  }
}

// ─── getRecentEvents ──────────────────────────────────────────────────────────
export async function getRecentEvents(limit = 30) {
  const provider = getProvider()
  const contract = getReadContract()
  const latest   = await provider.getBlockNumber()
  const from     = Math.max(0, latest - 50000)
  const filter   = contract.filters.MiningSessionStarted()
  const logs     = await contract.queryFilter(filter, from, 'latest')
  return logs
    .slice(-limit)
    .reverse()
    .map(log => ({
      address:     log.args?.user        as string,
      ratePerHour: log.args?.ratePerHour as ethers.BigNumber,
      tier:        Number(log.args?.tier),
      timestamp:   Number(log.args?.timestamp),
      txHash:      log.transactionHash,
    }))
}

// ─── Real-time live points calculation (client-side) ─────────────────────────
export function computeLivePoints(
  accumulatedPoints: ethers.BigNumber,
  ratePerHour: ethers.BigNumber,
  lastMiningTime: number,
): ethers.BigNumber {
  if (ratePerHour.isZero() || lastMiningTime === 0) return accumulatedPoints
  const now     = Math.floor(Date.now() / 1000)
  const elapsed = Math.min(now - lastMiningTime, SESSION_MAX_S)
  const sessionPts = ratePerHour.mul(elapsed).div(3600)
  return accumulatedPoints.add(sessionPts)
}

// ─── Format helpers ───────────────────────────────────────────────────────────
export function formatPoints(pts: ethers.BigNumber | number): string {
  const n = typeof pts === 'number' ? pts : pts.toNumber()
  if (n === 0) return '0'
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(0)
}

export function formatRate(ratePerHour: ethers.BigNumber | number): string {
  const n = typeof ratePerHour === 'number' ? ratePerHour : ratePerHour.toNumber()
  if (n === 0) return '—'
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K pts/h`
  return `${n} pts/h`
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

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(x => x.toString().padStart(2, '0')).join(':')
}
