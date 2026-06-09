import { ExternalLink } from 'lucide-react'
import { type AdEvent } from '../hooks/useAdEvents'
import { formatAddress, formatX1T, timeAgo } from '../lib/chain'
import { maculatusTestnet } from '../lib/chain'

interface EventRowProps {
  event: AdEvent
  highlight?: boolean
}

export default function EventRow({ event, highlight }: EventRowProps) {
  const explorerTxUrl = `${maculatusTestnet.blockExplorers.default.url}/tx/${event.transactionHash}`
  const explorerAddrUrl = `${maculatusTestnet.blockExplorers.default.url}/address/${event.user}`

  return (
    <div className={`flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 hover:bg-white/5 group ${highlight ? 'bg-brand-600/5 border border-brand-600/20' : ''}`}>
      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={explorerAddrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-gray-300 hover:text-brand-400 transition-colors"
          >
            {formatAddress(event.user)}
          </a>
          <span className="text-xs text-gray-600">watched an ad</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {timeAgo(event.timestamp)} · Block #{event.blockNumber.toString()}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <div className="text-sm font-semibold text-emerald-400">
            +{formatX1T(event.reward)} X1T
          </div>
        </div>
        <a
          href={explorerTxUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-brand-400 hover:bg-brand-400/10 transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}
