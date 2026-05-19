import { Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/hooks/useAuth'
import AlertsPage from '@/pages/AlertsPage'
import FavoritesPage from '@/pages/FavoritesPage'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'

export default function App() {
  useAuth()
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/favoritos" element={<FavoritesPage />} />
        <Route path="/alertas" element={<AlertsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}
