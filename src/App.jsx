import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import GameView from './views/GameView.jsx'
import HomeView from './views/HomeView.jsx'
import LoginView from './views/LoginView.jsx'
import ProfileView from './views/ProfileView.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomeView />} />
          <Route path="perfil" element={<ProfileView />} />
        </Route>
        <Route path="juego" element={<GameView />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
