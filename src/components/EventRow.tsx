import { ExternalLink } from 'lucide-react'
import { formatAddress, formatX1T, timeAgo, maculatusTestnet } from '../lib/chain'

interface EventRowProps {
  user:        `0x${string}`
  timestamp:   number
  reward:      bigint
  txHash:      `0x${string}`
  blockNumber: bigint
  highlight?:  boolean
}

export default function EventRow({ user, timestamp, reward, txHash, blockNumber, highlight }: EventRowProps) {
  const txUrl   = `${maculatusTestnet.blockExplorers.default.url}/tx/${txHash}`
  const addrUrl = `${maculatusTestnet.blockExplorers.default.url}/address/${user}`

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 group hover:bg-[rgba(168,230,255,0.03)] ${
      highlight ? 'bg-[rgba(168,230,255,0.04)]' : ''
    }`}>
      {/* Dot */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(96,255,176,0.08)', border: '1px solid rgba(96,255,176,0.15)' }}>
        <div className="w-2 h-2 rounded-full bg-[#60ffb0]" />
      </div>

      {/* Address + time */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <a href={addrUrl} target="_blank" rel="noopener noreferrer"
            className="font-mono text-sm text-[rgba(168,230,255,0.7)] hover:text-[#A8E6FF] transition-colors">
            {formatAddress(user)}
          </a>
          <span className="text-subtle text-xs">mined</span>
        </div>
        <div className="text-subtle text-xs mt-0.5">
          {timeAgo(timestamp)} · Block #{blockNumber.toString()}
        </div>
      </div>

      {/* Reward */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-sm font-bold text-[#60ffb0] font-mono">
          +{formatX1T(reward)} X1T
        </div>
        <a href={txUrl} target="_blank" rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted hover:text-[#A8E6FF]
            hover:bg-[rgba(168,230,255,0.08)] transition-all">
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
