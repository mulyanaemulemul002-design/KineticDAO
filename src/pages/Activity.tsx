import { useState } from 'react'
import { Activity, Search, RefreshCw, Filter } from 'lucide-react'
import { useAdEvents, useGlobalStats } from '../hooks/useAdEvents'
import { useNetworkStatus } from '../hooks/useAdEvents'
import EventRow from '../components/EventRow'
import EmptyState from '../components/EmptyState'
import { formatX1T } from '../lib/chain'

export default function ActivityPage() {
  const [search, setSearch] = useState('')
  const { data: events, isLoading, refetch, dataUpdatedAt } = useAdEvents()
  const { data: globalStats } = useGlobalStats()
  const { data: network } = useNetworkStatus()

  const filtered = events?.filter(e =>
    !search || e.user.toLowerCase().includes(search.toLowerCase()) ||
    e.transactionHash.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Activity</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            On-chain AdWatched events from the Maculatus Testnet
            {lastUpdated && ` · Updated ${lastUpdated}`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary text-sm py-2 px-3.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {globalStats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Events', value: globalStats.totalAdsWatched.toLocaleString(), color: 'text-white' },
            { label: 'Unique Earners', value: globalStats.uniqueParticipants.toLocaleString(), color: 'text-brand-400' },
            { label: 'Total Rewards', value: `${formatX1T(globalStats.totalRewardsDistributed)} X1T`, color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4 text-center">
              <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Filter by address or tx hash..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="btn-secondary text-sm px-3.5"
          >
            <Filter className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${network?.isOnline ? 'bg-emerald-400 animate-pulse-slow' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-400">
              {network?.isOnline ? 'Live' : 'Disconnected'} · Block #{network?.blockNumber?.toString() ?? '—'}
            </span>
          </div>
          <span className="text-xs text-gray-600">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            {search ? ' (filtered)' : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={search ? 'No matching events' : 'No events yet'}
            description={
              search
                ? 'Try a different address or transaction hash.'
                : 'AdWatched events from the last 10,000 blocks will appear here.'
            }
          />
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(event => (
              <EventRow key={event.transactionHash} event={event} />
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-white mb-3 text-sm">About This Data</h3>
        <p className="text-gray-500 text-sm leading-relaxed">
          All events shown are fetched directly from the X1T Ecochain (Maculatus Testnet) using the public RPC endpoint.
          No centralized database is used — data is sourced purely from on-chain <code className="font-mono text-brand-400 text-xs">AdWatched</code> events.
          Events cover the last 10,000 blocks and refresh every 30 seconds.
        </p>
      </div>
    </div>
  )
}
