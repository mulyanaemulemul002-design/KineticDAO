import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Activity, BarChart3, Zap, Menu, X } from 'lucide-react'
import { useWallet } from '../hooks/useWallet'
import { formatAddress } from '../lib/chain'
import WalletButton from './WalletButton'
import NetworkBadge from './NetworkBadge'
import clsx from 'clsx'

const navLinks = [
  { to: '/', label: 'Home', icon: Zap },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/activity', label: 'Activity', icon: Activity },
]

export default function Navbar() {
  const location = useLocation()
  const { address } = useWallet()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/30 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">
              Kinetic<span className="text-gradient">DAO</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={clsx(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  location.pathname === to
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <NetworkBadge />
            <WalletButton />
          </div>

          <button
            className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 space-y-1 animate-fade-in">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  location.pathname === to
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <NetworkBadge />
              <WalletButton />
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
