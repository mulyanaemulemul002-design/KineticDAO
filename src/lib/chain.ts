/// <reference types="vite/client" />
import { createPublicClient, http, defineChain, parseAbiItem } from 'viem'

export const maculatusTestnet = defineChain({
  id: 10778,
  name: 'Maculatus Testnet',
  nativeCurrency: { decimals: 18, name: 'X1T', symbol: 'X1T' },
  rpcUrls: {
    default: { http: ['https://maculatus-rpc.x1eco.com'] },
  },
  blockExplorers: {
    default: { name: 'X1T Explorer', url: 'https://explorer.x1eco.com' },
  },
  testnet: true,
})

export const publicClient = createPublicClient({
  chain: maculatusTestnet,
  transport: http('https://maculatus-rpc.x1eco.com'),
})

export const CONTRACT_ADDRESS = (
  import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'
) as `0x${string}`

// ─── ABIs ─────────────────────────────────────────────────────────────────────

export const KINETIC_ABI = [
  // State reads
  { type: 'function', name: 'miningPoolRemaining', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalMinedTokens',   inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalMiningCycles',  inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'uniqueMiners',        inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  // User views
  {
    type: 'function', name: 'getUserStats',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: '_totalEarned', type: 'uint256' },
      { name: '_cycleCount',  type: 'uint256' },
      { name: '_lastMineAt',  type: 'uint256' },
      { name: '_cooldown',    type: 'uint256' },
      { name: '_canMine',     type: 'bool'    },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'canMine',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'cooldownRemaining',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'getAllocation',
    inputs: [],
    outputs: [
      { name: 'mining',    type: 'uint256' },
      { name: 'investor',  type: 'uint256' },
      { name: 'team',      type: 'uint256' },
      { name: 'ecosystem', type: 'uint256' },
      { name: 'total',     type: 'uint256' },
    ],
    stateMutability: 'pure',
  },
  {
    type: 'function', name: 'previewReward',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'reward', type: 'uint256' }, { name: 'tier', type: 'uint8' }],
    stateMutability: 'view',
  },
  // Write
  {
    type: 'function', name: 'mine',
    inputs: [],
    outputs: [{ name: 'reward', type: 'uint256' }, { name: 'tier', type: 'uint8' }],
    stateMutability: 'nonpayable',
  },
  // Events — tier: 0=APES 1=BASIC 2=HOKI
  {
    type: 'event', name: 'AdWatched',
    inputs: [
      { name: 'user',      type: 'address', indexed: true  },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'reward',    type: 'uint256', indexed: false },
      { name: 'tier',      type: 'uint8',   indexed: false },
    ],
  },
  {
    type: 'event', name: 'MiningCycleCompleted',
    inputs: [
      { name: 'user',          type: 'address', indexed: true  },
      { name: 'cycleId',       type: 'uint256', indexed: true  },
      { name: 'reward',        type: 'uint256', indexed: false },
      { name: 'tier',          type: 'uint8',   indexed: false },
      { name: 'timestamp',     type: 'uint256', indexed: false },
      { name: 'poolRemaining', type: 'uint256', indexed: false },
    ],
  },
] as const

export const AD_WATCHED_EVENT = parseAbiItem(
  'event AdWatched(address indexed user, uint256 timestamp, uint256 reward, uint8 tier)'
)

export const MINING_COMPLETED_EVENT = parseAbiItem(
  'event MiningCycleCompleted(address indexed user, uint256 indexed cycleId, uint256 reward, uint8 tier, uint256 timestamp, uint256 poolRemaining)'
)

// ─── Token Allocation Constants (mirrors contract) ────────────────────────────
export const TOTAL_SUPPLY    = 1_000_000_000n * 10n ** 18n
export const MINING_POOL     =   700_000_000n * 10n ** 18n
export const INVESTOR_POOL   =   100_000_000n * 10n ** 18n
export const TEAM_POOL       =    25_000_000n * 10n ** 18n
export const ECOSYSTEM_POOL  =   175_000_000n * 10n ** 18n
export const MINING_CYCLE_S  = 12 * 3600

// ─── Reward Tier Labels ───────────────────────────────────────────────────────
export type RewardTier = 0 | 1 | 2
export const TIER_LABEL: Record<RewardTier, string> = { 0: 'Apes', 1: 'Basic', 2: 'Hoki' }
export const TIER_RANGE: Record<RewardTier, string> = {
  0: '0.01 – 0.09 X1T',
  1: '1 X1T',
  2: '3 – 5 X1T',
}
export const TIER_COLOR: Record<RewardTier, string> = {
  0: '#ff9090', // red-ish
  1: '#A8E6FF', // glacier
  2: '#60ffb0', // green
}

// ─── Utilities ────────────────────────────────────────────────────────────────
export function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function formatX1T(wei: bigint, decimals = 3): string {
  const x = Number(wei) / 1e18
  if (x === 0) return '0'
  if (x < 0.001) return '< 0.001'
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(2)}M`
  if (x >= 1_000)     return `${(x / 1_000).toFixed(2)}K`
  return x.toFixed(decimals)
}

export function formatDuration(seconds: number): { h: string; m: string; s: string } {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return {
    h: h.toString().padStart(2, '0'),
    m: m.toString().padStart(2, '0'),
    s: s.toString().padStart(2, '0'),
  }
}

export function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
