import { Wallet, LogOut, Loader2 } from 'lucide-react'
import { useWallet } from '../hooks/useWallet'
import { formatAddress } from '../lib/chain'

export default function WalletButton() {
  const { address, isConnecting, connect, disconnect } = useWallet()

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <div className="address-pill flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
          {formatAddress(address)}
        </div>
        <button
          onClick={disconnect}
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="btn-primary text-sm py-2 px-4"
    >
      {isConnecting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Wallet className="w-3.5 h-3.5" />
      )}
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
