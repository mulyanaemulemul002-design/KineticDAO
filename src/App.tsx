import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ActivityPage from './pages/Activity'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/activity" element={<ActivityPage />} />
          </Routes>
        </main>
        <footer className="border-t border-white/5 py-6 px-4 text-center text-sm text-gray-600">
          KineticDAO · Ad-to-Earn on X1T Ecochain · Maculatus Testnet · Chain ID 10778
        </footer>
      </div>
    </BrowserRouter>
  )
}
