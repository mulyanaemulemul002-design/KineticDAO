import { type LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: string
  subValue?: string
  icon: LucideIcon
  iconColor?: string
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
}

export default function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  iconColor = 'text-brand-400',
  trend,
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-xl bg-white/5" />
          <div className="w-16 h-4 rounded bg-white/5" />
        </div>
        <div className="w-24 h-7 rounded bg-white/5 mb-1" />
        <div className="w-32 h-4 rounded bg-white/5" />
      </div>
    )
  }

  return (
    <div className="card p-5 hover:border-white/20 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('p-2 rounded-xl bg-white/5', iconColor.replace('text-', 'group-hover:bg-').replace('400', '400/10'))}>
          <Icon className={clsx('w-4.5 h-4.5', iconColor)} />
        </div>
        {trend && (
          <span className={clsx(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            trend === 'up' ? 'text-emerald-400 bg-emerald-400/10' :
            trend === 'down' ? 'text-red-400 bg-red-400/10' :
            'text-gray-400 bg-white/5'
          )}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </span>
        )}
      </div>
      <div className="stat-value text-2xl mb-0.5">{value}</div>
      <div className="stat-label">{label}</div>
      {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
    </div>
  )
}
