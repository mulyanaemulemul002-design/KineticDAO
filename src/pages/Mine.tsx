import { useState } from 'react'
import { Pickaxe, Wallet, AlertCircle, Loader2, AlertTriangle, Frown, Smile, Star, Lock, Gift } from 'lucide-react'
import { useWallet } from '../hooks/useWallet'
import { useUserMiningStats, useMineAction, useClaimAction, useProtocolStats } from '../hooks/useMining'
import { formatKNTC, formatAddress, MINING_ADDRESS, TIER_LABEL, TIER_COLOR, TIER_RANGE, TIER_CHANCE } from '../lib/chain'
import AdModal from '../components/AdModal'
import MiningClock from '../components/MiningClock'
import MiningResult from '../components/MiningResult'
import WalletButton from '../components/WalletButton'

type Phase = 'idle' | 'ad' | 'mining' | 'result'

const TIER_ICONS = [Frown, Smile, Star]

export default function Mine() {
  const { address, isOnCorrectChain } = useWallet()
  const { data: stats, isLoading: statsLoading } = useUserMiningStats(address ?? undefined)
  const { data: protocol } = useProtocolStats()
  const { status, txHash, reward, tier, error, execute, reset } = useMineAction(address ?? undefined)
  const { status: claimStatus, execute: executeClaim, error: claimError } = useClaimAction(address ?? undefined)
  const [phase, setPhase] = useState<Phase>('idle')

  const canMine             = stats?.canMine ?? true
  const cooldown            = Number(stats?.cooldown ?? 0n)
  const cycles              = Number(stats?.cycleCount ?? 0n)
  const pendingClaim        = stats?.pendingClaim ?? 0n
  const tgeActive           = stats?.tgeActive   ?? false
  const contractNotDeployed = MINING_ADDRESS === '0x0000000000000000000000000000000000000000'

  // User clicks Mine — open ad popup
  function handleStartMine() {
    if (!canMine || phase !== 'idle') return
    setPhase('ad')
  }

  // Ad finished → auto-trigger on-chain mine
  async function handleAdComplete() {
    setPhase('mining')
    await execute()
    setPhase('result')
  }

  // User closes ad before it finishes (only if skippable)
  function handleAdClose() {
    setPhase('idle')
  }

  function handleReset() {
    reset()
    setPhase('idle')
  }

  const showResult = status === 'success' || phase === 'result'

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
          Connect your Web3 wallet to Maculatus Testnet to start watching ads and earning KNTC.
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

      {/* Ad popup overlay */}
      {phase === 'ad' && (
        <AdModal onComplete={handleAdComplete} onClose={handleAdClose} />
      )}

      {/* Demo mode warning */}
      {contractNotDeployed && (
        <div className="mb-6 p-4 rounded-xl flex items-start gap-3"
          style={{ background: 'rgba(255,208,96,0.08)', border: '1px solid rgba(255,208,96,0.2)' }}>
          <AlertTriangle className="w-4 h-4 text-[#ffd060] mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <span className="text-[#ffd060] font-semibold">Demo Mode — </span>
            <span className="text-muted">
              Contract not deployed. Set{' '}
              <code className="font-mono text-xs bg-[rgba(0,0,0,0.3)] px-1 py-0.5 rounded">VITE_MINING_ADDRESS</code>
              {' '}in <code className="font-mono text-xs bg-[rgba(0,0,0,0.3)] px-1 py-0.5 rounded">.env</code>{' '}
              to connect. UI flow is fully functional.
            </span>
          </div>
        </div>
      )}

      {/* Pre-TGE notice */}
      <div className="mb-6 p-4 rounded-xl flex items-start gap-3"
        style={{ background: 'rgba(168,230,255,0.05)', border: '1px solid rgba(168,230,255,0.12)' }}>
        <Lock className="w-4 h-4 text-[#A8E6FF] mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <span className="text-[#A8E6FF] font-semibold">Pre-TGE Mode — </span>
          <span className="text-muted">
            Rewards are recorded as <strong className="text-white">Kinetic Credits</strong> on-chain.
            Real KNTC tokens will be claimable after the Token Generation Event (TGE).
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── LEFT: main mining area ── */}
        <div className="lg:col-span-3 space-y-5">

          <div>
            <h1 className="text-2xl font-bold text-white">Mine KNTC</h1>
            <p className="text-muted text-sm mt-1">
              Click Mine to watch an ad — mining starts automatically when the ad ends.
            </p>
          </div>

          {/* Tier legend */}
          <div className="grid grid-cols-3 gap-2">
            {([0, 1, 2] as const).map(t => {
              const Icon  = TIER_ICONS[t]
              const color = TIER_COLOR[t]
              return (
                <div key={t} className="stat-box text-center py-3 px-2">
                  <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                  <div className="text-xs font-bold" style={{ color }}>{TIER_LABEL[t]}</div>
                  <div className="text-subtle text-xs mt-0.5">{TIER_RANGE[t]}</div>
                  <div className="text-subtle text-[10px] mt-0.5">{TIER_CHANCE[t]} chance</div>
                </div>
              )
            })}
          </div>

          {/* Main card */}
          <div className="card-glow overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(168,230,255,0.06)]">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  phase === 'mining' ? 'bg-[#ffd060] animate-pulse-glacier' :
                  canMine            ? 'bg-[#60ffb0] animate-pulse-glacier' :
                                       'bg-[#A8E6FF]'
                }`} />
                <span className="text-sm font-semibold text-white">
                  {statsLoading        ? 'Loading...'      :
                   phase === 'mining'  ? 'Recording on-chain...' :
                   canMine             ? 'Ready to Mine'   :
                                         'Cooldown Active'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {pendingClaim > 0n && (
                  <span className="badge badge-glacier">{formatKNTC(pendingClaim)} Credits</span>
                )}
                <span className="text-muted text-xs font-mono">{formatAddress(address)}</span>
              </div>
            </div>

            <div className="p-5">
              {showResult ? (
                <MiningResult reward={reward} tier={tier} txHash={txHash} onReset={handleReset} />
              ) : (
                <>
                  {/* Mine button + status */}
                  {canMine ? (
                    <div className="text-center py-6">
                      {phase === 'mining' ? (
                        <div className="space-y-4">
                          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center animate-pulse-glacier"
                            style={{ background: 'rgba(168,230,255,0.08)', border: '2px solid rgba(168,230,255,0.25)' }}>
                            <Loader2 className="w-8 h-8 text-[#A8E6FF] animate-spin" />
                          </div>
                          <div>
                            <div className="text-white font-semibold">
                              {status === 'confirming' ? 'Confirm in wallet...' : 'Recording on-chain...'}
                            </div>
                            <div className="text-muted text-sm mt-1">
                              Your mining cycle is being registered on KNTC blockchain
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center group-hover:scale-105 transition-transform"
                            style={{ background: 'rgba(96,255,176,0.08)', border: '2px solid rgba(96,255,176,0.25)' }}>
                            <Pickaxe className="w-8 h-8 text-[#60ffb0]" />
                          </div>
                          <div>
                            <div className="text-white font-semibold">Ready to start a mining cycle</div>
                            <div className="text-muted text-sm mt-1">
                              An ad will play (15–30s), then mining is recorded automatically
                            </div>
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="mt-4 p-3 rounded-xl flex items-center gap-2"
                          style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}>
                          <AlertCircle className="w-4 h-4 text-[#ff9090] flex-shrink-0" />
                          <span className="text-[#ff9090] text-sm">{error}</span>
                        </div>
                      )}

                      <button
                        onClick={handleStartMine}
                        disabled={phase === 'mining' || phase === 'ad'}
                        className="btn-primary mx-auto mt-4 text-base px-10 py-3.5">
                        <Pickaxe className="w-4 h-4" />
                        {phase === 'mining' ? 'Mining...' : 'Mine'}
                      </button>
                    </div>
                  ) : (
                    <div className="py-4">
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
              { label: 'Cycles Done',              value: cycles.toString(),                   color: '#A8E6FF' },
              { label: 'Kinetic Credits (Virtual)', value: `${formatKNTC(pendingClaim)} KNTC`, color: '#60ffb0' },
              { label: 'Per Day',                   value: '2x',                               color: '#ffd060' },
            ].map(({ label, value, color }) => (
              <div key={label} className="stat-box text-center">
                <div className="font-bold text-xl" style={{ color }}>{value}</div>
                <div className="text-muted text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Claim card */}
          <div className="card-glow p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white">Claim to Wallet</h3>
                <p className="text-muted text-xs mt-0.5">
                  {tgeActive
                    ? 'TGE is active — claim your KNTC tokens now.'
                    : 'Klaim akan terbuka otomatis saat TGE.'}
                </p>
              </div>
              <Gift className={`w-5 h-5 ${tgeActive ? 'text-[#60ffb0]' : 'text-muted'}`} />
            </div>

            <div className="card-inner p-3 mb-4 flex justify-between items-center">
              <span className="text-muted text-sm">Unclaimed Credits</span>
              <span className="font-mono font-bold text-[#60ffb0]">{formatKNTC(pendingClaim)} KNTC</span>
            </div>

            {claimError && (
              <div className="mb-3 p-3 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}>
                <AlertCircle className="w-4 h-4 text-[#ff9090] flex-shrink-0" />
                <span className="text-[#ff9090] text-sm">{claimError}</span>
              </div>
            )}

            <button
              onClick={tgeActive ? executeClaim : undefined}
              disabled={!tgeActive || pendingClaim === 0n || claimStatus === 'claiming' || claimStatus === 'confirming'}
              className="btn-primary w-full justify-center py-3"
              style={!tgeActive ? { opacity: 0.45, cursor: 'not-allowed' } : {}}>
              {!tgeActive ? (
                <><Lock className="w-4 h-4" />Klaim akan terbuka otomatis saat TGE</>
              ) : claimStatus === 'confirming' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Confirm in Wallet...</>
              ) : claimStatus === 'claiming' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Transferring KNTC...</>
              ) : claimStatus === 'success' ? (
                <><Gift className="w-4 h-4" />Claimed!</>
              ) : (
                <><Gift className="w-4 h-4" />Claim to Wallet</>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT: clock + protocol stats ── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card-glow p-6 flex flex-col items-center">
            <h3 className="font-bold text-white mb-5">Mining Cycle</h3>
            <MiningClock cooldownSeconds={cooldown} cycleCount={cycles} />
          </div>

          {protocol && (
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-white text-sm">Protocol Stats</h3>
              {[
                { label: 'Total Cycles',   value: protocol.totalCycles.toString(),              color: '#A8E6FF' },
                { label: 'Unique Miners',  value: protocol.uniqueMiners.toString(),             color: '#A8E6FF' },
                { label: 'Pool Remaining', value: `${formatKNTC(protocol.poolRemaining)} KNTC`, color: '#60ffb0' },
                { label: 'Pool Size',      value: '700M KNTC',                                  color: '#ffd060' },
                { label: 'TGE Status',     value: protocol.tgeActive ? 'Active' : 'Pre-Launch', color: protocol.tgeActive ? '#60ffb0' : '#ffd060' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-muted text-sm">{label}</span>
                  <span className="font-mono text-sm font-semibold" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
