import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import ManagementPage from './pages/ManagementPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import AdminPage from './pages/admin/AdminPage'
import SettingsPage from './pages/admin/SettingsPage'
import LoginPage from './pages/LoginPage'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { HomepageRefreshProvider } from './contexts/HomepageRefreshContext'
import ActivitiesListPage from './pages/ActivitiesListPage'
import ActivityDetailPage from './pages/ActivityDetailPage'
import AnnouncementDetailPage from './pages/AnnouncementDetailPage'
import BackgroundPattern from './components/BackgroundPattern'
import HomepagePopupOverlay from './components/HomepagePopupOverlay'
import ItaPage from './pages/ItaPage'
import ItaItemPage from './pages/ItaItemPage'
import { ToastContainer } from './components/ToastContainer'
import { useScrollToTop } from './utils/scrollToTop'

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function ScrollToTopWrapper() {
  useScrollToTop() // Scroll to top on route change
  return null
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <HomepageRefreshProvider>
          <AuthProvider>
            <BrowserRouter>
              <ScrollToTopWrapper />
              <div className="relative flex min-h-screen flex-col text-gray-800 bg-gradient-to-b from-[#f6fbf7] via-white to-white">
                <BackgroundPattern />
                <Navbar />
                <main className="flex-1">
                  <div className="app-container py-0">
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/announcements/*" element={<AnnouncementsPage />} />
                      <Route path="/announcement/:id" element={<AnnouncementDetailPage />} />
                      <Route path="/management" element={<ManagementPage />} />
                      <Route path="/executives" element={<ManagementPage />} />
                      <Route path="/ita" element={<ItaPage />} />
                      <Route path="/ita/item/:id" element={<ItaItemPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/activities" element={<ActivitiesListPage />} />
                      <Route path="/activities/:id" element={<ActivityDetailPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/admin/*" element={<RequireAuth><AdminPage /></RequireAuth>} />
                      <Route path="/admin/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                </main>
                <HomepagePopupOverlay />
                <div className="app-container w-full">
                  <Footer />
                </div>
                <ToastContainer />
              </div>
            </BrowserRouter>
          </AuthProvider>
        </HomepageRefreshProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
