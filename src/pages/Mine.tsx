import { useState } from 'react'
import { Pickaxe, Wallet, AlertCircle, Loader2, AlertTriangle, Frown, Smile, Star } from 'lucide-react'
import { useWallet } from '../hooks/useWallet'
import { useUserMiningStats, useMineAction, useProtocolStats } from '../hooks/useMining'
import { formatKNTC, formatAddress, CONTRACT_ADDRESS, TIER_LABEL, TIER_COLOR, TIER_RANGE } from '../lib/chain'
import AdPlayer from '../components/AdPlayer'
import MiningClock from '../components/MiningClock'
import MiningResult from '../components/MiningResult'
import TokenAllocation from '../components/TokenAllocation'
import WalletButton from '../components/WalletButton'

type Phase = 'watch' | 'mine' | 'result'

const TIER_ICONS = [Frown, Smile, Star]

export default function Mine() {
  const { address, isOnCorrectChain } = useWallet()
  const { data: stats, isLoading: statsLoading } = useUserMiningStats(address ?? undefined)
  const { data: protocol } = useProtocolStats()
  const { status, txHash, reward, tier, error, execute, reset } = useMineAction(address ?? undefined)
  const [phase, setPhase] = useState<Phase>('watch')

  const canMine    = stats?.canMine ?? true
  const cooldown   = Number(stats?.cooldown ?? 0n)
  const cycles     = Number(stats?.cycleCount ?? 0n)
  const totalEarned = stats?.totalEarned ?? 0n
  const contractNotDeployed = CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000'

  function handleAdComplete() { setPhase('mine') }

  async function handleMine() {
    await execute()
    setPhase('result')
  }

  function handleReset() {
    reset()
    setPhase('watch')
  }

  const showResult = status === 'success' || (phase === 'result' && status !== 'error')

  // ── Not connected ────────────────────────────────────────────────────────
  if (!address) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: 'rgba(168,230,255,0.08)', border: '1px solid rgba(168,230,255,0.15)' }}>
          <Wallet className="w-7 h-7 text-[#A8E6FF]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Connect Wallet to Mine</h2>
        <p className="text-muted mb-8">
          Connect your Web3 wallet to Maculatus Testnet to start watching ads and earning KNTC tokens.
        </p>
        <div className="flex justify-center"><WalletButton /></div>
      </div>
    )
  }

  if (!isOnCorrectChain) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center animate-fade-in">
        <AlertCircle className="w-12 h-12 text-[#ffd060] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-3">Wrong Network</h2>
        <p className="text-muted mb-8">Switch to Maculatus Testnet (Chain ID: 10778) to use KineticDAO.</p>
        <WalletButton />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Demo mode warning */}
      {contractNotDeployed && (
        <div className="mb-6 p-4 rounded-xl flex items-start gap-3"
          style={{ background: 'rgba(255,208,96,0.08)', border: '1px solid rgba(255,208,96,0.2)' }}>
          <AlertTriangle className="w-4 h-4 text-[#ffd060] mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <span className="text-[#ffd060] font-semibold">Demo Mode — </span>
            <span className="text-muted">
              Contract not deployed. Set{' '}
              <code className="font-mono text-xs bg-[rgba(0,0,0,0.3)] px-1 py-0.5 rounded">VITE_CONTRACT_ADDRESS</code>
              {' '}in <code className="font-mono text-xs bg-[rgba(0,0,0,0.3)] px-1 py-0.5 rounded">.env</code> to connect. UI flow is fully functional.
            </span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── LEFT: main mining area ── */}
        <div className="lg:col-span-3 space-y-5">

          <div>
            <h1 className="text-2xl font-bold text-white">Mine KNTC</h1>
            <p className="text-muted text-sm mt-1">
              Watch a 15s ad to start a 12-hour mining cycle. Reward varies by luck tier.
            </p>
          </div>

          {/* Tier legend */}
          <div className="grid grid-cols-3 gap-2">
            {([0, 1, 2] as const).map(t => {
              const Icon = TIER_ICONS[t]
              const color = TIER_COLOR[t]
              return (
                <div key={t} className="stat-box text-center py-3 px-2">
                  <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                  <div className="text-xs font-bold" style={{ color }}>{TIER_LABEL[t]}</div>
                  <div className="text-subtle text-xs mt-0.5">{TIER_RANGE[t]}</div>
                  <div className="text-subtle text-[10px] mt-0.5">
                    {t === 0 ? '8% chance' : t === 1 ? '89% chance' : '3% chance'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Main card */}
          <div className="card-glow overflow-hidden">
            {/* Status header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(168,230,255,0.06)]">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${canMine ? 'bg-[#60ffb0] animate-pulse-glacier' : 'bg-[#A8E6FF]'}`} />
                <span className="text-sm font-semibold text-white">
                  {statsLoading ? 'Loading...' : canMine ? 'Ready to Mine' : 'Cooldown Active'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {totalEarned > 0n && (
                  <span className="badge badge-glacier">{formatKNTC(totalEarned)} KNTC earned</span>
                )}
                <span className="text-muted text-xs font-mono">{formatAddress(address)}</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-5">
              {showResult ? (
                <MiningResult reward={reward} tier={tier} txHash={txHash} onReset={handleReset} />
              ) : (
                <>
                  <AdPlayer onComplete={handleAdComplete} disabled={!canMine || phase !== 'watch'} />

                  {/* Mine button after ad watched */}
                  {phase === 'mine' && canMine && (
                    <div className="mt-5 animate-slide-up">
                      <div className="card-inner p-4 mb-4 text-center">
                        <div className="text-white font-semibold mb-1">Ad watched! Start your mining cycle.</div>
                        <div className="text-muted text-sm">
                          Reward pool:&nbsp;
                          <span className="text-[#ff9090] font-mono">0.01–0.09</span>
                          {' '}·{' '}
                          <span className="text-[#A8E6FF] font-mono">1</span>
                          {' '}·{' '}
                          <span className="text-[#60ffb0] font-mono">3–5</span>
                          {' '}KNTC
                        </div>
                      </div>

                      {error && (
                        <div className="mb-4 p-3 rounded-xl flex items-center gap-2"
                          style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}>
                          <AlertCircle className="w-4 h-4 text-[#ff9090] flex-shrink-0" />
                          <span className="text-[#ff9090] text-sm">{error}</span>
                        </div>
                      )}

                      <button
                        onClick={handleMine}
                        disabled={status === 'confirming' || status === 'mining'}
                        className="btn-primary w-full justify-center text-base py-3.5">
                        {status === 'confirming' ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Confirm in Wallet...</>
                        ) : status === 'mining' ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Mining on-chain...</>
                        ) : (
                          <><Pickaxe className="w-4 h-4" />Start Mining Cycle</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Cooldown state */}
                  {!canMine && phase === 'watch' && (
                    <div className="mt-5">
                      <div className="card-inner p-4 text-center">
                        <div className="text-muted text-sm mb-1">Next cycle available in</div>
                        <div className="text-white font-bold text-2xl font-mono">
                          {Math.floor(cooldown / 3600)}h {Math.floor((cooldown % 3600) / 60)}m
                        </div>
                        <div className="text-subtle text-xs mt-1">Mining cycles reset every 12 hours</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Cycles Done',  value: cycles.toString(),               color: '#A8E6FF' },
              { label: 'Total Earned', value: `${formatKNTC(totalEarned)} KNTC`, color: '#60ffb0' },
              { label: 'Per Day',      value: '2x',                            color: '#ffd060' },
            ].map(({ label, value, color }) => (
              <div key={label} className="stat-box text-center">
                <div className="font-bold text-xl" style={{ color }}>{value}</div>
                <div className="text-muted text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: clock + allocation ── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card-glow p-6 flex flex-col items-center">
            <h3 className="font-bold text-white mb-5">Mining Cycle</h3>
            <MiningClock cooldownSeconds={cooldown} cycleCount={cycles} />
          </div>

          {protocol && (
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-white text-sm">Protocol Stats</h3>
              {[
                { label: 'Total Cycles',   value: protocol.totalCycles.toString(),             color: '#A8E6FF' },
                { label: 'Unique Miners',  value: protocol.uniqueMiners.toString(),            color: '#A8E6FF' },
                { label: 'Pool Remaining', value: `${formatKNTC(protocol.poolRemaining)} KNTC`, color: '#60ffb0' },
                { label: 'Pool Size',      value: '700M KNTC',                                  color: '#ffd060' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-muted text-sm">{label}</span>
                  <span className="font-mono text-sm font-semibold" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card p-5">
            <TokenAllocation />
          </div>
        </div>
      </div>
    </div>
  )
}
