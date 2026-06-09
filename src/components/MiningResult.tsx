import { CheckCircle, ExternalLink } from 'lucide-react'
import { formatX1T, maculatusTestnet } from '../lib/chain'

interface MiningResultProps {
  reward: bigint | null
  txHash: `0x${string}` | null
  onReset: () => void
}

export default function MiningResult({ reward, txHash, onReset }: MiningResultProps) {
  const explorerUrl = txHash ? `${maculatusTestnet.blockExplorers.default.url}/tx/${txHash}` : null

  return (
    <div className="card-accent p-8 text-center animate-slide-up">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
        style={{ background: 'rgba(96,255,176,0.1)', border: '1px solid rgba(96,255,176,0.25)' }}>
        <CheckCircle className="w-8 h-8 text-[#60ffb0]" />
      </div>

      <div className="text-muted text-sm font-semibold uppercase tracking-widest mb-2">
        Mining Cycle Complete
      </div>

      {reward !== null && reward > 0n ? (
        <div className="animate-count-up">
          <div className="text-5xl font-black text-white mb-1">
            +{formatX1T(reward)}
          </div>
          <div className="text-[#A8E6FF] font-bold text-lg">X1T Earned</div>
          <div className="text-muted text-sm mt-1">
            Transferred to your wallet
          </div>
        </div>
      ) : (
        <div className="text-xl font-bold text-white">
          Mining cycle recorded on-chain
        </div>
      )}

      {/* Transaction details */}
      {txHash && (
        <div className="mt-6 p-3 rounded-xl bg-[rgba(0,16,32,0.4)] border border-[rgba(168,230,255,0.08)]">
          <div className="text-muted text-xs mb-1">Transaction</div>
          <a href={explorerUrl!} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-[#A8E6FF] hover:text-white transition-colors">
            {txHash.slice(0, 20)}...{txHash.slice(-8)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <button onClick={onReset} className="btn-secondary mt-6 mx-auto">
        Back to Mining
      </button>
    </div>
  )
}
