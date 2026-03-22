import React, { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { HomepageRefreshProvider } from './contexts/HomepageRefreshContext'

import { ToastContainer } from './components/ToastContainer'
import { useScrollToTop } from './utils/scrollToTop'
import CookieConsent from './components/CookieConsent'
import { buildApiUrl } from './utils/api'
import LoadingFallback from './components/LoadingFallback'
import BackToTop from './components/BackToTop'

// Lazy load components ที่ไม่จำเป็นต้องโหลดทันที
const HomepagePopupOverlay = lazy(() => import('./components/HomepagePopupOverlay'))
const Footer = lazy(() => import('./components/Footer'))

// Lazy load pages ที่ไม่ได้ใช้ในหน้าแรก เพื่อลด initial bundle size
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'))
const ManagementPage = lazy(() => import('./pages/ManagementPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ActivitiesListPage = lazy(() => import('./pages/ActivitiesListPage'))
const ActivityDetailPage = lazy(() => import('./pages/ActivityDetailPage'))
const AnnouncementDetailPage = lazy(() => import('./pages/AnnouncementDetailPage'))
const ItaPage = lazy(() => import('./pages/ItaPage'))
const ItaItemPage = lazy(() => import('./pages/ItaItemPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'))
const BlockedPage = lazy(() => import('./pages/BlockedPage'))
const RateLimitError = lazy(() => import('./pages/RateLimitError'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const PRPostersPage = lazy(() => import('./pages/PRPostersPage'))
const LoginSuccessPage = lazy(() => import('./pages/LoginSuccessPage'))
// Lazy load S11
const S11PageComponent = lazy(() => import('./pages/S11Page.tsx'))
const AirQualityPage = lazy(() => import('./pages/AirQualityPage'))

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function ScrollToTopWrapper() {
  useScrollToTop() // Scroll to top on route change
  return null
}

function VisitorTrackingBeacon() {
  const location = useLocation()

  const { pathname, search } = location

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (pathname.startsWith('/admin')) return

    const trackUrl = buildApiUrl('/api/visitors/track')
    const payload = {
      path: `${pathname}${search || ''}`,
      referrer: document.referrer || undefined,
    }

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
        navigator.sendBeacon(trackUrl, blob)
      } else {
        void fetch(trackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
          credentials: 'include',
        }).catch(() => { })
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('[VisitorTracking] failed', error)
      }
    }
  }, [pathname, search])

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
              <VisitorTrackingBeacon />

              <div className="relative flex min-h-screen flex-col text-gray-800 bg-slate-50 overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
                <div className="flex flex-col min-h-screen">
                  <div className="print:hidden">
                    <Navbar />
                  </div>
                  <main className="flex-1 min-h-screen">
                    <div className="app-container py-0 print:p-0">
                      <Suspense fallback={<LoadingFallback />}>
                        <Routes>
                          <Route path="/" element={<HomePage />} />
                          <Route path="/announcements/*" element={<AnnouncementsPage />} />
                          <Route path="/announcement/:id" element={<AnnouncementDetailPage />} />
                          <Route path="/management" element={<ManagementPage />} />
                          {/* Redirect /executives ไปยัง /management เพื่อป้องกัน duplicate content */}
                          <Route path="/executives" element={<Navigate to="/management" replace />} />
                          <Route path="/ita" element={<ItaPage />} />
                          <Route path="/ita/item/:id" element={<ItaItemPage />} />
                          <Route path="/about/*" element={<AboutPage />} />
                          <Route path="/contact" element={<ContactPage />} />
                          <Route path="/activities" element={<ActivitiesListPage />} />
                          <Route path="/activities/:id" element={<ActivityDetailPage />} />
                          <Route path="/documents" element={<DocumentsPage />} />
                          <Route path="/pr-posters" element={<PRPostersPage />} />
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/login-success" element={<LoginSuccessPage />} />
                          <Route path="/admin/*" element={<RequireAuth><AdminPage /></RequireAuth>} />
                          <Route path="/403" element={<ForbiddenPage />} />
                          <Route path="/blocked" element={<BlockedPage />} />
                          <Route path="/rate-limit" element={<RateLimitError />} />
                          <Route path="/S11" element={<S11PageComponent />} />
                          <Route path="/air-quality" element={<AirQualityPage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Suspense>
                    </div>
                  </main>
                  <HomepagePopupOverlay />
                  <CookieConsent />
                  <Suspense fallback={null}>
                    <div className="w-full print:hidden">
                      <Footer />
                    </div>
                  </Suspense>
                  <ToastContainer />
                  <BackToTop />
                </div>
              </div>
            </BrowserRouter>
          </AuthProvider>
        </HomepageRefreshProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
