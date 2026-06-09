import { useProtocolStats } from '../hooks/useMining'
import { MINING_POOL, INVESTOR_POOL, TEAM_POOL, ECOSYSTEM_POOL, formatX1T } from '../lib/chain'
import { Pickaxe, TrendingUp, Users, Leaf } from 'lucide-react'

const ALLOCATIONS = [
  {
    key: 'mining',
    label: 'Mining Pool',
    icon: Pickaxe,
    amount: MINING_POOL,
    pct: 60,
    color: '#A8E6FF',
    glow: 'rgba(168,230,255,0.3)',
    description: 'Distributed to miners over time via 12h cycles',
  },
  {
    key: 'investor',
    label: 'Investors',
    icon: TrendingUp,
    amount: INVESTOR_POOL,
    pct: 15,
    color: '#ffd060',
    glow: 'rgba(255,208,96,0.3)',
    description: 'Allocated to early investors and backers',
  },
  {
    key: 'team',
    label: 'Team / Dev',
    icon: Users,
    amount: TEAM_POOL,
    pct: 10,
    color: '#c090ff',
    glow: 'rgba(192,144,255,0.3)',
    description: 'Core development team allocation',
  },
  {
    key: 'ecosystem',
    label: 'Ecosystem',
    icon: Leaf,
    amount: ECOSYSTEM_POOL,
    pct: 15,
    color: '#60ffb0',
    glow: 'rgba(96,255,176,0.3)',
    description: 'Grants, partnerships, and ecosystem growth',
  },
]

export default function TokenAllocation() {
  const { data: stats } = useProtocolStats()

  const minedPct = stats
    ? Number((stats.totalMined * 10000n) / MINING_POOL) / 100
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-white text-lg">Token Allocation</h3>
        <span className="text-muted text-sm">500M X1T Total</span>
      </div>

      {/* Visual bar */}
      <div className="h-3 rounded-full overflow-hidden flex gap-0.5">
        {ALLOCATIONS.map(a => (
          <div key={a.key} style={{ width: `${a.pct}%`, background: a.color, opacity: 0.85 }} />
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {ALLOCATIONS.map(({ key, label, icon: Icon, amount, pct, color, glow, description }) => (
          <div key={key} className="stat-box flex items-center gap-3 group hover:border-[rgba(168,230,255,0.12)] transition-colors">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `rgba(${hexToRgb(color)},0.1)`, border: `1px solid rgba(${hexToRgb(color)},0.2)` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-white text-sm">{label}</span>
                <span className="font-mono text-sm font-bold" style={{ color }}>
                  {formatX1T(amount)} X1T
                </span>
              </div>
              <div className="progress-track" style={{ height: '4px' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  width: key === 'mining' && stats
                    ? `${Math.min(minedPct, 100)}%`
                    : '0%',
                  background: `linear-gradient(90deg,${color}80,${color})`,
                  transition: 'width 1s ease',
                  boxShadow: `0 0 6px ${glow}`,
                }} />
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-muted text-xs">{description}</span>
                <span className="text-subtle text-xs">{pct}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mining pool depletion note */}
      {stats && (
        <div className="card-inner p-3 flex items-center justify-between">
          <span className="text-muted text-xs">Mining pool mined</span>
          <span className="font-mono text-xs text-[#A8E6FF] font-bold">
            {formatX1T(stats.totalMined)} / {formatX1T(MINING_POOL)} X1T ({minedPct.toFixed(4)}%)
          </span>
        </div>
      )}
    </div>
  )
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
