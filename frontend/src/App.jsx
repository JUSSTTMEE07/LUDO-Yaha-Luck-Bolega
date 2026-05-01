/**
 * App.jsx – React Router root
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useGameStore from './store/gameStore'
import Landing   from './pages/Landing'
import Auth      from './pages/Auth'
import Lobby     from './pages/Lobby'
import Game      from './pages/Game'
import EndScreen from './pages/EndScreen'

function ProtectedRoute({ children }) {
  const user = useGameStore(s => s.user)
  return user ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<Landing />} />
        <Route path="/auth"   element={<Auth />} />
        <Route path="/lobby"  element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
        <Route path="/game"   element={<ProtectedRoute><Game /></ProtectedRoute>} />
        <Route path="/end"    element={<ProtectedRoute><EndScreen /></ProtectedRoute>} />
        <Route path="*"       element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
