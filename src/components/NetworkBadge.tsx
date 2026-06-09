import { useNetworkStatus } from '../hooks/useAdEvents'
import { Wifi, WifiOff } from 'lucide-react'

export default function NetworkBadge() {
  const { data } = useNetworkStatus()

  if (!data) return null

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
      data.isOnline
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        : 'bg-red-500/10 border-red-500/20 text-red-400'
    }`}>
      {data.isOnline ? (
        <Wifi className="w-3 h-3" />
      ) : (
        <WifiOff className="w-3 h-3" />
      )}
      <span>{data.isOnline ? 'Maculatus Testnet' : 'Offline'}</span>
    </div>
  )
}
