import { Link } from 'react-router-dom'
import { Wallet, Pickaxe, Coins, TrendingUp, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'
import { useWallet } from '../hooks/useWallet'
import { useUserMiningStats, useMiningEvents, useProtocolStats } from '../hooks/useMining'
import { formatX1T, formatAddress, maculatusTestnet } from '../lib/chain'
import StatCard from '../components/StatCard'
import EventRow from '../components/EventRow'
import EmptyState from '../components/EmptyState'
import WalletButton from '../components/WalletButton'
import MiningClock from '../components/MiningClock'

export default function Dashboard() {
  const { address, isOnCorrectChain } = useWallet()
  const { data: stats, isLoading: sLoading, refetch: refetchStats } = useUserMiningStats(address ?? undefined)
  const { data: events, isLoading: eLoading, refetch: refetchEvents } = useMiningEvents(address ?? undefined)
  const { data: protocol, refetch: refetchProtocol } = useProtocolStats()

  if (!address) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <EmptyState icon={Wallet} title="Connect Wallet" description="Connect your wallet to view your personal mining dashboard." action={<WalletButton />} />
      </div>
    )
  }

  if (!isOnCorrectChain) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <EmptyState icon={AlertCircle} title="Wrong Network" description="Switch to Maculatus Testnet (Chain ID: 10778)." action={<WalletButton />} />
      </div>
    )
  }

  const refresh = () => { refetchStats(); refetchEvents(); refetchProtocol() }

  const totalEarned = stats?.totalEarned ?? 0n
  const cycleCount  = Number(stats?.cycleCount ?? 0n)
  const cooldown    = Number(stats?.cooldown ?? 0n)
  const canMine     = stats?.canMine ?? true
  const lastMineAt  = Number(stats?.lastMineAt ?? 0n)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted text-sm">Wallet:</span>
            <a href={`${maculatusTestnet.blockExplorers.default.url}/address/${address}`}
              target="_blank" rel="noopener noreferrer"
              className="address-pill flex items-center gap-1 hover:border-[rgba(168,230,255,0.3)] transition-colors">
              {formatAddress(address)}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
        <button onClick={refresh} className="btn-secondary text-sm py-2 px-3.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Earned"  value={`${formatX1T(totalEarned)} X1T`} icon={Coins}    color="#60ffb0" loading={sLoading} />
        <StatCard label="Cycles Done"   value={cycleCount.toString()}            icon={Pickaxe}  color="#A8E6FF" loading={sLoading} />
        <StatCard label="Per Day"       value="2x"                               icon={TrendingUp} color="#ffd060" />
        <StatCard label="Pool Global"   value={protocol ? `${formatX1T(protocol.poolRemaining)} X1T` : '—'} sub="Remaining" icon={Coins} color="#c090ff" loading={!protocol} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Mining history */}
        <div className="lg:col-span-2 card-glow overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(168,230,255,0.06)]">
            <h2 className="font-bold text-white">My Mining History</h2>
            <Link to="/activity" className="btn-ghost text-xs py-1.5">All Activity</Link>
          </div>
          {eLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="shimmer h-14 rounded-xl" />
              ))}
            </div>
          ) : !events?.length ? (
            <EmptyState icon={Pickaxe} title="No mining cycles yet"
              description="Your mining history will appear here after your first cycle."
              action={<Link to="/mine" className="btn-primary text-sm py-2"><Pickaxe className="w-3.5 h-3.5" />Start Mining</Link>}
            />
          ) : (
            <div className="divide-y divide-[rgba(168,230,255,0.05)]">
              {events.slice(0, 10).map(e => (
                <EventRow key={e.txHash} user={e.user} timestamp={e.timestamp} reward={e.reward} txHash={e.txHash} blockNumber={e.blockNumber} highlight />
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Mining clock */}
          <div className="card-glow p-6 flex flex-col items-center">
            <h3 className="font-bold text-white mb-4 self-start">Next Cycle</h3>
            <MiningClock cooldownSeconds={cooldown} canMine={canMine} cycleCount={cycleCount} />
            {canMine && (
              <Link to="/mine" className="btn-primary w-full justify-center mt-4">
                <Pickaxe className="w-4 h-4" /> Mine Now
              </Link>
            )}
          </div>

          {/* Network info */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-white text-sm">Network</h3>
            {[
              { l: 'Network',    v: 'Maculatus Testnet' },
              { l: 'Chain ID',   v: '10778' },
              { l: 'Currency',   v: 'X1T' },
              { l: 'Cycle',      v: '12 hours' },
              { l: 'Last Mine',  v: lastMineAt > 0 ? new Date(lastMineAt * 1000).toLocaleString() : 'Never' },
            ].map(({ l, v }) => (
              <div key={l} className="flex justify-between">
                <span className="text-muted text-sm">{l}</span>
                <span className="text-white text-sm font-medium font-mono text-right max-w-[160px] truncate">{v}</span>
              </div>
            ))}
          </div>

          {/* Protocol totals */}
          {protocol && (
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-white text-sm">Protocol</h3>
              {[
                { l: 'Total Cycles',  v: protocol.totalCycles.toString(),           c: '#A8E6FF' },
                { l: 'Unique Miners', v: protocol.uniqueMiners.toString(),           c: '#A8E6FF' },
                { l: 'Total Mined',   v: `${formatX1T(protocol.totalMined)} X1T`,   c: '#60ffb0' },
              ].map(({ l, v, c }) => (
                <div key={l} className="flex justify-between">
                  <span className="text-muted text-sm">{l}</span>
                  <span className="font-mono text-sm font-bold" style={{ color: c }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
