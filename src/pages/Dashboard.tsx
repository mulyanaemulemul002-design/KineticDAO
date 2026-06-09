import { Wallet, TrendingUp, Eye, Coins, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react'
import { useWallet } from '../hooks/useWallet'
import { useUserStats, useAdEvents, useGlobalStats } from '../hooks/useAdEvents'
import { formatAddress, formatX1T, maculatusTestnet } from '../lib/chain'
import StatCard from '../components/StatCard'
import EventRow from '../components/EventRow'
import EmptyState from '../components/EmptyState'
import WalletButton from '../components/WalletButton'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { address, isOnCorrectChain } = useWallet()
  const { data: userStats, isLoading: statsLoading, refetch: refetchStats } = useUserStats(address ?? undefined)
  const { data: myEvents, isLoading: eventsLoading, refetch: refetchEvents } = useAdEvents(address ?? undefined)
  const { data: globalStats } = useGlobalStats()

  if (!address) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <EmptyState
          icon={Wallet}
          title="Connect Your Wallet"
          description="Connect your Web3 wallet to view your personal dashboard, earnings, and ad history."
          action={<WalletButton />}
        />
      </div>
    )
  }

  if (!isOnCorrectChain) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <EmptyState
          icon={AlertCircle}
          title="Wrong Network"
          description="Please switch to the Maculatus Testnet (Chain ID: 10778) to use KineticDAO."
          action={<WalletButton />}
        />
      </div>
    )
  }

  const handleRefresh = () => {
    refetchStats()
    refetchEvents()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-500 text-sm">Viewing</span>
            <a
              href={`${maculatusTestnet.blockExplorers.default.url}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-sm text-gray-300 hover:text-brand-400 transition-colors"
            >
              {formatAddress(address)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-secondary text-sm py-2 px-3.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Earned"
          value={userStats ? `${formatX1T(userStats.totalEarned)} X1T` : '—'}
          icon={Coins}
          iconColor="text-emerald-400"
          loading={statsLoading}
        />
        <StatCard
          label="Ads Watched"
          value={userStats ? userStats.adsWatched.toLocaleString() : '—'}
          icon={Eye}
          iconColor="text-brand-400"
          loading={statsLoading}
        />
        <StatCard
          label="Wallet Balance"
          value={userStats ? `${formatX1T(userStats.balance)} X1T` : '—'}
          icon={Wallet}
          iconColor="text-orange-400"
          loading={statsLoading}
        />
        <StatCard
          label="Global Ads"
          value={globalStats ? globalStats.totalAdsWatched.toLocaleString() : '—'}
          subValue="All participants"
          icon={TrendingUp}
          iconColor="text-purple-400"
          loading={!globalStats}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <h2 className="font-semibold text-white">My Ad History</h2>
            <Link to="/activity" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
              View all
            </Link>
          </div>
          {eventsLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : !myEvents || myEvents.length === 0 ? (
            <EmptyState
              icon={Eye}
              title="No ads watched yet"
              description="Your ad watch history will appear here once you start participating."
            />
          ) : (
            <div className="divide-y divide-white/5">
              {myEvents.slice(0, 10).map((event) => (
                <EventRow key={event.transactionHash} event={event} highlight />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4">Network Info</h3>
            <div className="space-y-3">
              {[
                { label: 'Network', value: maculatusTestnet.name },
                { label: 'Chain ID', value: maculatusTestnet.id.toString() },
                { label: 'Currency', value: maculatusTestnet.nativeCurrency.symbol },
                { label: 'RPC', value: 'maculatus-rpc.x1eco.com' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">{label}</span>
                  <span className="text-gray-200 text-sm font-medium font-mono text-right max-w-[160px] truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4">Protocol Stats</h3>
            <div className="space-y-3">
              {globalStats && [
                { label: 'Total Rewards', value: `${formatX1T(globalStats.totalRewardsDistributed)} X1T` },
                { label: 'Participants', value: globalStats.uniqueParticipants.toLocaleString() },
                { label: 'Latest Block', value: `#${globalStats.latestBlock.toString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">{label}</span>
                  <span className="text-emerald-400 text-sm font-semibold font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
