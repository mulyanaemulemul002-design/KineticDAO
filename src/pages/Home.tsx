import { ArrowRight, Zap, Shield, Eye, TrendingUp, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGlobalStats, useAdEvents } from '../hooks/useAdEvents'
import { useWallet } from '../hooks/useWallet'
import { formatX1T } from '../lib/chain'
import WalletButton from '../components/WalletButton'
import EventRow from '../components/EventRow'

const features = [
  {
    icon: Eye,
    title: 'Watch & Earn',
    description: 'Every ad impression you watch generates real X1T token rewards, recorded on-chain instantly.',
    color: 'text-brand-400',
    bg: 'bg-brand-400/10',
  },
  {
    icon: Shield,
    title: 'Fully Transparent',
    description: 'No black-box tracking. Every impression is an immutable event on the X1T Ecochain.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    icon: TrendingUp,
    title: 'DAO Governance',
    description: 'Token holders govern the protocol — vote on ad policies, reward rates, and treasury use.',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
  },
]

export default function Home() {
  const { address } = useWallet()
  const { data: stats } = useGlobalStats()
  const { data: events } = useAdEvents()

  return (
    <div className="min-h-screen">
      <section className="relative pt-24 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-600/5 blur-3xl" />
          <div className="absolute top-20 right-1/4 w-64 h-64 rounded-full bg-orange-500/5 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-600/15 border border-brand-600/30 text-brand-400 text-xs font-semibold mb-8 animate-fade-in">
            <Zap className="w-3 h-3" />
            Live on X1T Ecochain · Maculatus Testnet
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6 leading-tight animate-slide-up">
            Earn X1T by{' '}
            <span className="text-gradient">Watching Ads</span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up">
            KineticDAO is a decentralized Ad-to-Earn protocol. Every impression is recorded on-chain
            — transparent, verifiable, and rewarded in X1T tokens.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 animate-slide-up">
            {address ? (
              <Link to="/dashboard" className="btn-primary text-base px-7 py-3.5">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="scale-110">
                <WalletButton />
              </div>
            )}
            <Link to="/activity" className="btn-secondary text-base px-7 py-3.5">
              View Live Activity
            </Link>
          </div>

          {stats && (
            <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto animate-fade-in">
              {[
                { value: stats.totalAdsWatched.toLocaleString(), label: 'Ads Watched' },
                { value: stats.uniqueParticipants.toLocaleString(), label: 'Participants' },
                { value: formatX1T(stats.totalRewardsDistributed), label: 'X1T Distributed' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-600 animate-bounce">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">How It Works</h2>
            <p className="text-gray-400">Three steps to transparent, on-chain ad rewards.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card p-6 hover:border-white/20 transition-all group">
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {events && events.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
              <Link to="/activity" className="text-sm text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="card divide-y divide-white/5 overflow-hidden">
              {events.slice(0, 5).map((event) => (
                <EventRow key={event.transactionHash} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card p-10 glow-blue">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Earn?</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to the Maculatus Testnet and start earning X1T tokens for every ad you watch.
            </p>
            {address ? (
              <Link to="/dashboard" className="btn-primary text-base px-8 py-3.5">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <WalletButton />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
