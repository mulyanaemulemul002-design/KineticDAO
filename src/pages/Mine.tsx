import { Smartphone, Zap, Shield, Gift, ExternalLink } from 'lucide-react'

const FEATURES = [
  { icon: Zap,      color: '#A8E6FF', title: 'Ad-to-Earn Mining',   desc: 'Watch a 15–30s ad, then a 24-hour mining session starts on-chain. Points accrue linearly every second.' },
  { icon: Shield,   color: '#60ffb0', title: 'Fully On-Chain',      desc: 'Every mining cycle is recorded as a blockchain event. No database, no middleman.' },
  { icon: Gift,     color: '#ffd060', title: 'Claim After TGE',     desc: 'Credits accumulate on-chain during pre-TGE. Real KNTC tokens claimable after Token Generation Event.' },
]

export default function Mine() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 animate-fade-in">

      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'linear-gradient(135deg,#5ac8f0,#A8E6FF)', boxShadow: '0 0 40px rgba(168,230,255,0.35)' }}>
        <Smartphone className="w-9 h-9 text-[#001020]" />
      </div>

      <h1 className="text-3xl font-black text-white mb-3 text-center">Mining is on Mobile</h1>
      <p className="text-muted text-center max-w-md mb-10 leading-relaxed">
        The KineticDAO mining app has moved to mobile. Download the app to watch ads and start 24-hour mining sessions on-chain — once every day, points accumulate in real-time.
      </p>

      {/* Feature cards */}
      <div className="grid md:grid-cols-3 gap-4 max-w-3xl w-full mb-10">
        {FEATURES.map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="card p-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `rgba(${hexToRgb(color)},0.1)`, border: `1px solid rgba(${hexToRgb(color)},0.2)` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">{title}</h3>
            <p className="text-muted text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Dev QR instructions */}
      <div className="card-glow p-6 max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#60ffb0] animate-pulse-glacier" />
          <span className="text-[#60ffb0] text-sm font-semibold">Development Preview</span>
        </div>
        <p className="text-muted text-sm mb-4 leading-relaxed">
          The mobile app runs locally on port 8080. Start the <strong className="text-white">Start Mobile</strong> workflow in Replit, then scan the QR code with Expo Go.
        </p>

        <div className="card-inner p-3 rounded-xl font-mono text-xs text-[#A8E6FF] mb-4">
          Start Mobile → port 8080 → Scan QR with Expo Go
        </div>

        <a
          href="https://expo.dev/go"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary justify-center w-full">
          <ExternalLink className="w-4 h-4" />
          Get Expo Go
        </a>
      </div>

      {/* Contract info */}
      <div className="mt-8 p-4 rounded-xl max-w-md w-full text-center"
        style={{ background: 'rgba(168,230,255,0.04)', border: '1px solid rgba(168,230,255,0.1)' }}>
        <p className="text-subtle text-xs mb-1">KineticMining Contract</p>
        <a
          href="https://maculatus-scan.x1eco.com/address/0xf3b9297d7f99b1f5f8293a397d15da262848aa24"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#A8E6FF] font-mono text-xs hover:text-white transition-colors inline-flex items-center gap-1">
          0xf3b9297d7...8aa24
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
