import { Navigate, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Game } from './pages/Game'
import { Result } from './pages/Result'

export default function App() {
  return (
    <div className="min-h-svh bg-slate-900 text-slate-100">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:id" element={<Game />} />
        <Route path="/result/:sessionId" element={<Result />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
