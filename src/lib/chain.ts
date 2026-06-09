import { createPublicClient, http, defineChain } from 'viem'

export const maculatusTestnet = defineChain({
  id: 10778,
  name: 'Maculatus Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'X1T',
    symbol: 'X1T',
  },
  rpcUrls: {
    default: {
      http: ['https://maculatus-rpc.x1eco.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'X1T Explorer',
      url: 'https://explorer.x1eco.com',
    },
  },
  testnet: true,
})

export const publicClient = createPublicClient({
  chain: maculatusTestnet,
  transport: http('https://maculatus-rpc.x1eco.com'),
})

export const AD_WATCHED_ABI = [
  {
    type: 'event',
    name: 'AdWatched',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'reward', type: 'uint256', indexed: false },
    ],
  },
] as const

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`

export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatX1T(wei: bigint): string {
  const x1t = Number(wei) / 1e18
  if (x1t < 0.001) return '< 0.001'
  if (x1t >= 1_000_000) return `${(x1t / 1_000_000).toFixed(2)}M`
  if (x1t >= 1_000) return `${(x1t / 1_000).toFixed(2)}K`
  return x1t.toFixed(4)
}

export function timeAgo(timestampSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestampSeconds
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
