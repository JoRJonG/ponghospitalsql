import React, { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { HomepageRefreshProvider } from './contexts/HomepageRefreshContext'

import HomepagePopupOverlay from './components/HomepagePopupOverlay'
import { ToastContainer } from './components/ToastContainer'
import { useScrollToTop } from './utils/scrollToTop'
import CookieConsent from './components/CookieConsent'
import { buildApiUrl } from './utils/api'
import LoadingFallback from './components/LoadingFallback'

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
                {/* Organic Background Blobs */}
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-200/20 rounded-full blur-[100px] opacity-60 animate-blob mix-blend-multiply"></div>
                  <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-200/20 rounded-full blur-[100px] opacity-60 animate-blob animation-delay-2000 mix-blend-multiply"></div>
                  <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-amber-100/40 rounded-full blur-[100px] opacity-60 animate-blob animation-delay-4000 mix-blend-multiply"></div>
                </div>

                <div className="relative z-10 flex flex-col min-h-screen">
                  <Navbar />
                  <main className="flex-1">
                    <div className="app-container py-0">
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
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Suspense>
                    </div>
                  </main>
                  <HomepagePopupOverlay />
                  <CookieConsent />
                  <div className="app-container w-full">
                    <Footer />
                  </div>
                  <ToastContainer />
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
