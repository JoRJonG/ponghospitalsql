import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import Swal from 'sweetalert2'
import { motion, AnimatePresence } from 'framer-motion'

import { useAuth } from '../../auth/AuthContext'

import { useHomepageRefresh } from '../../contexts/useHomepageRefresh'

import ExecutivesManagement, { type ExecutivesManagementHandle } from '../../components/ExecutivesManagement'
import InfographicsManagement, { type InfographicsManagementHandle } from '../../components/InfographicsManagement'
import ItaManagement, { type ItaManagementHandle } from '../../components/ItaManagement'
import AnnouncementForm from '../../components/admin/AnnouncementForm'
import ActivityForm from '../../components/admin/ActivityForm'
import AdminIntroDashboard, { type AdminIntroDashboardHandle } from '../../components/admin/AdminIntroDashboard'
import PopupsManager, { type PopupsManagerHandle } from '../../components/admin/PopupsManager'
import UserManagement, { type UserManagementHandle } from '../../components/admin/UserManagement'
import DisplayModeSettings from '../../components/admin/DisplayModeSettings'
import UserSettings from '../../components/admin/UserSettings'
import Modal from '../../components/admin/Modal'
import HeroSliderSettings from '../../components/admin/HeroSliderSettings'
import FeedbackManagement from '../../components/admin/FeedbackManagement'
import DocumentsManagement, { type DocumentsManagementHandle } from '../../components/DocumentsManagement'
import PRPosterManagement, { type PRPosterManagementHandle } from '../../components/admin/PRPosterManagement'
import PRPlanManagement, { type PRPlanManagementHandle } from '../../components/admin/PRPlanManagement'
import OrganizationChartManagement from '../../components/admin/OrganizationChartManagement'
import BannedIPsManagement, { type BannedIPsManagementHandle } from '../../components/admin/BannedIPsManagement'
import LegalEthicsManagement, { type LegalEthicsManagementHandle } from '../../components/admin/LegalEthicsManagement'

// Types
// ----------------------------------------------------------------------------
type AnnouncementAttachment = {
  url: string
  publicId?: string
  kind?: 'image' | 'pdf' | 'file'
  name?: string
  bytes?: number
}

type Announcement = {
  _id?: string
  title: string
  category: 'สมัครงาน' | 'ประชาสัมพันธ์' | 'ประกาศ' | 'ประกาศจัดซื้อจัดจ้าง'
  content?: string
  isPublished?: boolean
  publishedAt?: string | null
  createdBy?: string | null
  updatedBy?: string | null
  createdAt?: string
  updatedAt?: string
  attachments?: AnnouncementAttachment[]
}

type CloudImg = { url: string; publicId?: string }

type Activity = {
  _id?: string
  title: string
  description?: string
  images?: ActivityImage[]
  isPublished?: boolean
  publishedAt?: string | null
  createdBy?: string | null
  updatedBy?: string | null
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

type ActivityImage = string | { url: string; publicId?: string | null; displayOrder?: number | null }

type SlideImage = {
  url: string
  fileName?: string
  mimeType?: string
  size?: number
  publicId?: string
}

type SlideItem = {
  _id?: string | number
  id?: string | number
  title?: string
  caption?: string
  alt?: string
  href?: string
  url?: string
  link?: string
  order?: number
  duration?: number
  isPublished?: boolean
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
  image?: SlideImage | null
}

type Unit = {
  _id?: string
  name: string
  href?: string
  image?: CloudImg | null
  order?: number
  isPublished?: boolean
  createdAt?: string
  updatedAt?: string
}

type AdminTab = 'intro' | 'popups' | 'overview' | 'announce' | 'activity' | 'slide' | 'unit' | 'executive' | 'infographic' | 'organization' | 'pr_poster' | 'pr_plan' | 'ita' | 'users' | 'feedback' | 'documents' | 'legalEthics' | 'settings-display' | 'settings-user' | 'banned_ips'


const ADMIN_TABS: readonly AdminTab[] = ['intro', 'popups', 'overview', 'announce', 'activity', 'slide', 'unit', 'executive', 'infographic', 'organization', 'pr_poster', 'pr_plan', 'users', 'ita', 'feedback', 'documents', 'legalEthics', 'settings-display', 'settings-user', 'banned_ips'] as const
const isAdminTab = (t: unknown): t is AdminTab => typeof t === 'string' && ADMIN_TABS.includes(t as AdminTab)

const stripHtml = (s?: string) => (s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

const fmtDateTime = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  try { return d.toLocaleString() } catch { return iso }
}
const isScheduled = (it: { isPublished?: boolean; publishedAt?: string | null }) => {
  if (!it?.isPublished) return false
  if (!it?.publishedAt) return false
  const t = new Date(it.publishedAt).getTime()
  return !isNaN(t) && t > Date.now()
}
const statusInfo = (it: { isPublished?: boolean; publishedAt?: string | null }) => {
  if (!it?.isPublished) return { label: 'ซ่อน', color: 'gray' as const }
  if (isScheduled(it)) return { label: 'ตั้งเวลา', color: 'amber' as const }
  return { label: 'เผยแพร่', color: 'green' as const }
}



export default function AdminPage() {
  const { getToken, hasPermission, user } = useAuth()
  const location = useLocation()


  // Debug check user
  // console.log('Current Auth User:', user)

  // Show login success alert if redirected from login
  useEffect(() => {
    if (location.state?.loginSuccess) {
      // Clear the state so it doesn't show again on refresh (replace current history entry)
      window.history.replaceState({}, document.title)

      Swal.fire({
        title: 'เข้าสู่ระบบสำเร็จ',
        text: 'ยินดีต้อนรับเข้าสู่ระบบจัดการเว็บไซต์',
        icon: 'success',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#10b981',
        timer: 1500,
        timerProgressBar: true
      })
    }
  }, [location])

  const [tab, setTab] = useState<AdminTab>('intro')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [annCount, setAnnCount] = useState(0)
  const [actCount, setActCount] = useState(0)
  const [slidePage, setSlidePage] = useState(1)
  const [slideTotalPages, setSlideTotalPages] = useState(1)
  const [slideCount, setSlideCount] = useState(0)
  const [unitPage, setUnitPage] = useState(1)
  const [unitTotalPages, setUnitTotalPages] = useState(1)
  const [unitCount, setUnitCount] = useState(0)
  const [prPosterCount, setPrPosterCount] = useState(0)
  const [organizationCount, setOrganizationCount] = useState(0)
  const [documentCount, setDocumentCount] = useState(0)



  const [annList, setAnnList] = useState<Announcement[]>([])
  const [actList, setActList] = useState<Activity[]>([])
  const [slideList, setSlideList] = useState<SlideItem[]>([])
  const [unitList, setUnitList] = useState<Unit[]>([])
  const [creatingSlide, setCreatingSlide] = useState(false)
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [showUnitForm, setShowUnitForm] = useState(false)

  // Pagination State
  const [annPage, setAnnPage] = useState(1)
  const [annTotalPages, setAnnTotalPages] = useState(1)
  const [actPage, setActPage] = useState(1)
  const [actTotalPages, setActTotalPages] = useState(1)

  const permissions = useMemo(() => ({
    popups: hasPermission('popups'),
    announcements: hasPermission('announcements'),
    activities: hasPermission('activities'),
    slides: hasPermission('slides'),
    units: hasPermission('units'),
    executives: hasPermission('executives'),
    infographics: hasPermission('infographics'),
    pr_posters: hasPermission('pr_poster'),
    pr_plans: hasPermission('pr_plan'),
    organization: hasPermission('organization'),
    ita: hasPermission('ita'),
    users: hasPermission('users'),
    feedback: hasPermission('feedback') || hasPermission('admin'),
    documents: hasPermission('documents') || hasPermission('admin'),
    dashboard: hasPermission('dashboard'),
    admin: hasPermission('admin'),
    system: hasPermission('system'),
  }), [hasPermission])

  const allowedTabs = useMemo<Record<AdminTab, boolean>>(() => {
    return {
      intro: true,
      popups: permissions.popups,
      overview: permissions.dashboard,
      announce: permissions.announcements,
      activity: permissions.activities,
      slide: permissions.slides,
      unit: permissions.units,
      executive: permissions.executives,
      infographic: permissions.infographics,
      organization: permissions.organization,
      pr_poster: permissions.pr_posters,
      pr_plan: permissions.pr_plans,
      ita: permissions.ita,
      users: permissions.users,
      feedback: permissions.feedback,
      documents: permissions.documents,
      legalEthics: true,
      'settings-display': permissions.system,
      'settings-user': true,
      'banned_ips': permissions.admin || permissions.system,
    }
  }, [permissions])

  useEffect(() => {
    if (allowedTabs[tab]) return
    const preferredOrder: AdminTab[] = ['intro', 'overview', 'popups', 'announce', 'activity', 'slide', 'unit', 'executive', 'infographic', 'organization', 'users', 'ita', 'feedback', 'settings-display', 'settings-user']
    const nextTab = preferredOrder.find(key => allowedTabs[key]) || 'intro'
    if (nextTab !== tab) {
      setTab(nextTab)
    }
  }, [allowedTabs, tab])

  const canManageAnnouncements = allowedTabs.announce
  const canManageActivities = allowedTabs.activity
  const canManageSlides = allowedTabs.slide
  const canManageUnits = allowedTabs.unit
  const canManagePRPosters = allowedTabs.pr_poster
  const canManageOrganization = allowedTabs.organization
  const canManageDocuments = allowedTabs.documents

  // Simple per-tab search query
  const [query, setQuery] = useState<{ announce: string; activity: string; slide: string; unit: string }>({ announce: '', activity: '', slide: '', unit: '' })

  // Status filters
  // Status filters
  const [status, setStatus] = useState<{ announce: 'all' | 'published' | 'hidden' | 'scheduled'; activity: 'all' | 'published' | 'hidden' | 'scheduled'; slide: 'all' | 'published' | 'hidden'; unit: 'all' | 'published' | 'hidden' }>({ announce: 'all', activity: 'all', slide: 'all', unit: 'all' })


  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
  })
  const { triggerRefresh } = useHomepageRefresh()

  // Refs for component methods
  const introRef = useRef<AdminIntroDashboardHandle>(null)
  const popupsRef = useRef<PopupsManagerHandle>(null)
  const executivesRef = useRef<ExecutivesManagementHandle | null>(null)
  const infographicsRef = useRef<InfographicsManagementHandle | null>(null)
  const itaRef = useRef<ItaManagementHandle | null>(null)
  const usersRef = useRef<UserManagementHandle>(null)
  const documentsRef = useRef<DocumentsManagementHandle>(null)
  const prPosterRef = useRef<PRPosterManagementHandle>(null)
  const prPlanRef = useRef<PRPlanManagementHandle>(null)
  const bannedIpsRef = useRef<BannedIPsManagementHandle>(null)
  const legalEthicsRef = useRef<LegalEthicsManagementHandle>(null)

  const refreshAnn = useCallback(async () => {
    if (!permissions.announcements) {
      setAnnList([])
      setAnnCount(0)
      return
    }
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const params = new URLSearchParams()
    params.set('page', String(annPage))
    params.set('limit', '10')
    if (query.announce) params.set('q', query.announce)
    if (status.announce) params.set('status', status.announce)

    try {
      const response = await fetch(`/api/announcements?${params.toString()}`, { headers })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const totalPages = parseInt(response.headers.get('X-Total-Pages') || '1', 10)
      const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10)
      setAnnTotalPages(totalPages)

      const data = await response.json() as Announcement[]
      setAnnList(data)
      setAnnCount(totalCount) // Use total count from server
    } catch (error) {
      console.error('Failed to load announcements', error)
      setAnnList([])
      setAnnCount(0)
    }
  }, [getToken, permissions.announcements, annPage, query.announce, status.announce])

  const refreshAct = useCallback(async () => {
    if (!permissions.activities) {
      setActList([])
      setActCount(0)
      return
    }
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const params = new URLSearchParams()
    params.set('page', String(actPage))
    params.set('limit', '10')
    if (query.activity) params.set('q', query.activity)
    if (status.activity) params.set('status', status.activity)

    try {
      const response = await fetch(`/api/activities?${params.toString()}`, { headers })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const totalPages = parseInt(response.headers.get('X-Total-Pages') || '1', 10)
      const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10)
      setActTotalPages(totalPages)

      const data = await response.json() as Activity[]
      setActList(data)
      setActCount(totalCount)
    } catch (error) {
      console.error('Failed to load activities', error)
      setActList([])
      setActCount(0)
    }
  }, [getToken, permissions.activities, actPage, query.activity, status.activity])

  const refreshSlides = useCallback(async () => {
    if (!permissions.slides) {
      setSlideList([])
      setSlideCount(0)
      return
    }
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const params = new URLSearchParams()
    params.set('page', String(slidePage))
    params.set('limit', '10')
    if (query.slide) params.set('q', query.slide)
    if (status.slide) params.set('status', status.slide) // Ensure valid status

    try {
      const response = await fetch(`/api/slides?${params.toString()}`, { headers })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (Array.isArray(data)) {
        setSlideList(data)
        const totalPages = parseInt(response.headers.get('X-Total-Pages') || '1', 10)
        const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10)
        setSlideTotalPages(totalPages)
        setSlideCount(totalCount)
      } else {
        setSlideList([])
        setSlideCount(0)
      }
    } catch (error) {
      console.error('Failed to load slides', error)
      setSlideList([])
      setSlideCount(0)
    }
  }, [getToken, permissions.slides, slidePage, query.slide, status.slide])

  const refreshUnits = useCallback(async () => {
    if (!permissions.units) {
      setUnitList([])
      setUnitCount(0)
      return
    }
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const params = new URLSearchParams()
    params.set('page', String(unitPage))
    params.set('limit', '10')
    if (query.unit) params.set('q', query.unit)
    const s = status.unit || 'all'
    params.set('status', s)

    try {
      const response = await fetch(`/api/units?${params.toString()}`, { headers })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json() as Unit[]
      if (Array.isArray(data)) {
        setUnitList(data)
        const totalPages = parseInt(response.headers.get('X-Total-Pages') || '1', 10)
        const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10)
        setUnitTotalPages(totalPages)
        setUnitCount(totalCount)
      } else {
        setUnitList([])
        setUnitCount(0)
      }
    } catch (error) {
      console.error('Failed to load units', error)
      setUnitList([])
      setUnitCount(0)
    }
  }, [getToken, permissions.units, unitPage, query.unit, status.unit])

  const refreshPRPosters = useCallback(async () => {
    if (!permissions.pr_posters) {
      setPrPosterCount(0)
      return
    }
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    try {
      const response = await fetch('/api/pr-posters?limit=5', { headers })
      if (response.ok) {
        const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10)
        setPrPosterCount(totalCount)
        const data = await response.json()
        if (Array.isArray(data)) { /* prPosterList removed */ }
      }
    } catch (error) { console.error(error) }
  }, [getToken, permissions.pr_posters])

  const refreshOrganization = useCallback(async () => {
    if (!permissions.organization) {
      setOrganizationCount(0)
      return
    }
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    try {
      const response = await fetch('/api/organization', { headers })
      if (response.ok) {
        const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10)
        setOrganizationCount(totalCount)
      }
    } catch (error) { console.error(error) }
  }, [getToken, permissions.organization])

  const refreshDocuments = useCallback(async () => {
    if (!permissions.documents) {
      setDocumentCount(0)
      return
    }
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    try {
      const response = await fetch('/api/documents?limit=1', { headers })
      if (response.ok) {
        const json = await response.json()
        const total = json.pagination?.total || 0
        setDocumentCount(total)
      }
    } catch (error) { console.error(error) }
  }, [getToken, permissions.documents])

  useEffect(() => {
    if (tab === 'announce' || tab === 'overview') refreshAnn()
  }, [refreshAnn, tab])

  useEffect(() => {
    if (tab === 'activity' || tab === 'overview') refreshAct()
  }, [refreshAct, tab])

  useEffect(() => {
    if (tab === 'slide' || tab === 'overview') refreshSlides()
  }, [refreshSlides, tab])

  useEffect(() => {
    if (tab === 'unit' || tab === 'overview') refreshUnits()
  }, [refreshUnits, tab])

  useEffect(() => {
    if (tab === 'pr_poster' || tab === 'overview') refreshPRPosters()
  }, [refreshPRPosters, tab])

  useEffect(() => {
    if (tab === 'organization' || tab === 'overview') refreshOrganization()
  }, [refreshOrganization, tab])

  useEffect(() => {
    if (tab === 'documents' || tab === 'overview') refreshDocuments()
  }, [refreshDocuments, tab])

  useEffect(() => {
    if (tab !== 'announce') setShowAnnouncementForm(false)
    if (tab !== 'activity') setShowActivityForm(false)
    if (tab !== 'unit') setShowUnitForm(false)
  }, [tab])

  // Scroll to top when tab changes
  useEffect(() => {
    // Small delay to ensure content has rendered
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
    return () => clearTimeout(timer)
  }, [tab])

  // Optional: read URL hint to open specific known tab (announce/activity/slide/unit/executive)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tabParam = (params.get('tab') || '').toLowerCase()
      if (isAdminTab(tabParam)) setTab(tabParam)
    } catch (error) {
      console.debug('Failed to read admin tab from URL', error)
    }
  }, [])

  // Filtered lists for nicer UX when searching

  return (
    <div className="min-h-screen lg:h-[calc(100vh-8rem)] w-full lg:overflow-hidden bg-gradient-to-br from-white via-blue-50 to-indigo-50">
      {/* Dashboard Layout */}
      <div className="min-h-screen lg:h-full lg:flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-md shadow-lg border-r border-gray-100 flex flex-col transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}>
          {/* Sidebar Header */}
          <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-gradient-to-r from-gray-600 to-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Dashboard</h2>
                  <p className="text-emerald-100 text-xs">ระบบจัดการเว็บไซต์</p>
                </div>
              </div>
              {/* Close button for mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
            <button
              onClick={() => {
                setTab('intro')
                if (window.innerWidth < 1024) setSidebarOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'intro'
                ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                }`}
            >
              <span className="text-xl">✨</span>
              <span>Intro Page</span>
            </button>

            {allowedTabs.overview && (
              <button
                onClick={() => {
                  setTab('overview')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'overview'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">📊</span>
                <span>ภาพรวม</span>
              </button>
            )}

            {allowedTabs.popups && (
              <button
                onClick={() => {
                  setTab('popups')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'popups'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">🪟</span>
                <span>ป๊อปอัปหน้าแรก</span>
              </button>
            )}

            {allowedTabs.announce && (
              <button
                onClick={() => {
                  setTab('announce')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'announce'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">📢</span>
                <span>ประกาศ</span>
              </button>
            )}

            {allowedTabs.activity && (
              <button
                onClick={() => {
                  setTab('activity')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'activity'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">📸</span>
                <span>กิจกรรม</span>
              </button>
            )}

            {allowedTabs.slide && (
              <button
                onClick={() => {
                  setTab('slide')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'slide'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">🖼️</span>
                <span>สไลด์</span>
              </button>
            )}

            {allowedTabs.unit && (
              <button
                onClick={() => {
                  setTab('unit')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'unit'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">🏢</span>
                <span>หน่วยงาน</span>
              </button>
            )}

            {allowedTabs.executive && (
              <button
                onClick={() => {
                  setTab('executive')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'executive'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">👔</span>
                <span>ผู้บริหาร</span>
              </button>
            )}

            {allowedTabs.infographic && (
              <button
                onClick={() => {
                  setTab('infographic')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'infographic'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">📊</span>
                <span>Infographic</span>
              </button>
            )}

            {allowedTabs.organization && (
              <button
                onClick={() => {
                  setTab('organization')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'organization'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">🧩</span>
                <span>โครงสร้างองค์กร</span>
              </button>
            )}

            {allowedTabs.pr_poster && (
              <button
                onClick={() => {
                  setTab('pr_poster')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'pr_poster'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">🖼️</span>
                <span>PR Poster</span>
              </button>
            )}



            {allowedTabs.users && (
              <button
                onClick={() => {
                  setTab('users')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'users'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">👥</span>
                <span>ผู้ใช้</span>
              </button>
            )}

            {allowedTabs.ita && (
              <button
                onClick={() => {
                  setTab('ita')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'ita'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">⚖️</span>
                <span>ITA</span>
              </button>
            )}

            {allowedTabs.feedback && (
              <button
                onClick={() => {
                  setTab('feedback')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'feedback'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">💬</span>
                <span>ความคิดเห็น</span>
              </button>
            )}

            {allowedTabs.documents && (
              <button
                onClick={() => {
                  setTab('documents')
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'documents'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">📄</span>
                <span>เอกสาร</span>
              </button>
            )}

            <button
              onClick={() => {
                setTab('legalEthics')
                if (window.innerWidth < 1024) setSidebarOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'legalEthics' || tab === 'pr_plan'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                }`}
            >
              <span className="text-xl">⚖️</span>
              <span>กฎหมาย จริยธรรม &amp; แผนฯ</span>
            </button>

            {/* Settings Section */}
            <div className="pt-2 mt-2 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-500 px-4 py-2 uppercase tracking-wider">ตั้งค่า</div>

              {allowedTabs['settings-display'] && (
                <button
                  onClick={() => {
                    setTab('settings-display')
                    if (window.innerWidth < 1024) setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'settings-display'
                    ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                    }`}
                >
                  <span className="text-xl">🎨</span>
                  <span>การแสดงผลเว็บไซต์</span>
                </button>
              )}

              {allowedTabs['settings-user'] && (
                <button
                  onClick={() => {
                    setTab('settings-user')
                    if (window.innerWidth < 1024) setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'settings-user'
                    ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                    }`}
                >
                  <span className="text-xl">👤</span>
                  <span>ตั้งค่าผู้ใช้</span>
                </button>
              )}

              {allowedTabs.banned_ips && (
                <button
                  onClick={() => {
                    setTab('banned_ips')
                    if (window.innerWidth < 1024) setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-left ${tab === 'banned_ips'
                    ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                    }`}
                >
                  <span className="text-xl">🚫</span>
                  <span>Banned IPs</span>
                </button>
              )}
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-3 mb-4 px-1">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 truncate">{user.username}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.roles.includes('admin') ? 'ผู้ดูแลระบบสูงสุด' : 'เจ้าหน้าที่'}
                  </div>
                </div>
              </div>
            )}

            <div className="inline-flex items-center gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 px-3 py-2 w-full">
              <div className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 flex-shrink-0">
                <i className="fa-solid fa-shield-halved text-amber-600 text-xs" />
              </div>
              <div className="min-w-0 text-xs">
                <div className="font-medium">พื้นที่ผู้ดูแล</div>
                <div className="text-amber-600">ใช้อย่างระมัดระวัง</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 lg:overflow-y-auto overflow-x-hidden">
          {/* Top Bar */}
          <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 lg:px-6 lg:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg p-2 transition-colors"
                >
                  <span className="text-xl">☰</span>
                </button>

                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                    {tab === 'intro' && 'Intro Page'}
                    {tab === 'popups' && 'จัดการป๊อปอัปหน้าแรก'}
                    {tab === 'overview' && 'ภาพรวมระบบ'}
                    {tab === 'announce' && 'จัดการประกาศ'}
                    {tab === 'activity' && 'จัดการกิจกรรม'}
                    {tab === 'slide' && 'จัดการสไลด์'}
                    {tab === 'unit' && 'จัดการหน่วยงาน'}
                    {tab === 'executive' && 'จัดการผู้บริหาร'}
                    {tab === 'infographic' && 'จัดการ Infographic'}
                    {tab === 'organization' && 'จัดการโครงสร้างองค์กร'}
                    {tab === 'pr_poster' && 'จัดการ PR Poster'}
                    {tab === 'pr_plan' && 'จัดการแผนปฏิบัติการ ป้องกัน ปราบปราม'}
                    {tab === 'ita' && 'จัดการ ITA'}
                    {tab === 'users' && 'จัดการผู้ใช้'}
                    {tab === 'feedback' && 'จัดการความคิดเห็น'}
                    {tab === 'documents' && 'จัดการเอกสาร'}
                    {tab === 'settings-display' && 'ตั้งค่าการแสดงผลเว็บไซต์'}
                    {tab === 'settings-user' && 'ตั้งค่าผู้ใช้'}
                    {tab === 'banned_ips' && 'จัดการ Banned IPs'}
                  </h1>
                  <p className="text-gray-600 text-sm mt-1 hidden sm:block">
                    {tab === 'intro' && 'ข้อมูลสรุปการเข้าเว็บไซต์และผู้ใช้ล่าสุด'}
                    {tab === 'popups' && 'ตั้งค่าป๊อปอัปหน้าแรกและรูปภาพที่แสดง'}
                    {tab === 'overview' && 'ข้อมูลสรุปและสถิติของระบบ'}
                    {tab === 'announce' && 'จัดการประกาศและข่าวสาร'}
                    {tab === 'activity' && 'จัดการกิจกรรมและรูปภาพ'}
                    {tab === 'organization' && 'จัดการรูปภาพโครงสร้างองค์กร'}
                    {tab === 'slide' && 'จัดการสไลด์แสดงผล'}
                    {tab === 'unit' && 'จัดการลิงก์หน่วยงาน'}
                    {tab === 'executive' && 'จัดการข้อมูลผู้บริหาร'}
                    {tab === 'infographic' && 'จัดการรูปภาพ Infographic แบบเรียงกัน'}
                    {tab === 'pr_poster' && 'จัดการรูปภาพโปสเตอร์ประชาสัมพันธ์'}
                    {tab === 'pr_plan' && 'จัดการไฟล์ PDF แผนปฏิบัติการป้องกันและปราบปรามการทุจริต'}
                    {tab === 'ita' && 'จัดการข้อมูล ITA'}
                    {tab === 'users' && 'เพิ่ม แก้ไข ลบผู้ใช้ และกำหนดสิทธิ์การเข้าถึง'}
                    {tab === 'feedback' && 'ดู ตอบกลับ และจัดการความคิดเห็นจากผู้ใช้งาน'}
                    {tab === 'documents' && 'จัดการเอกสารและแบบฟอร์มต่างๆ ของโรงพยาบาล'}
                    {tab === 'settings-display' && 'เลือกรูปแบบสีที่ต้องการแสดงให้ผู้เข้าชมเห็นบนทุกหน้า'}
                    {tab === 'settings-user' && 'เปลี่ยนรหัสผ่านและจัดการบัญชีผู้ดูแลระบบ'}
                    {tab === 'banned_ips' && 'ตรวจสอบรายชื่อ IP ที่ถูกแบนถาวรและชั่วคราวจากระบบความปลอดภัย'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-4">
                {user && (
                  <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-800 leading-tight">{user.username}</div>
                      <div className="text-[10px] text-gray-500 font-medium">
                        {user.roles.includes('admin') ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}
                      </div>
                    </div>
                  </div>
                )}
                <div className="hidden md:block text-right">
                  <div className="text-xs text-gray-500">อัปเดตล่าสุด</div>
                  <div className="text-sm font-medium text-gray-900">{new Date().toLocaleDateString('th-TH')}</div>
                </div>
                <div className="hidden md:block h-8 w-px bg-gray-300"></div>
                <button
                  className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                  onClick={() => {
                    if (tab === 'intro') {
                      const introTask = introRef.current?.refresh()
                      if (introTask) {
                        introTask.then(() => Toast.fire({ icon: 'success', title: 'โหลดข้อมูล Intro Page เสร็จสิ้น' }))
                      } else {
                        Toast.fire({ icon: 'success', title: 'โหลดข้อมูล Intro Page เสร็จสิ้น' })
                      }
                    } else if (tab === 'popups') {
                      const popupTask = popupsRef.current?.refresh()
                      if (popupTask) {
                        popupTask.then(() => Toast.fire({ icon: 'success', title: 'โหลดข้อมูลป๊อปอัปหน้าแรกเสร็จสิ้น' }))
                      } else {
                        Toast.fire({ icon: 'success', title: 'โหลดข้อมูลป๊อปอัปหน้าแรกเสร็จสิ้น' })
                      }
                    } else if (tab === 'announce') refreshAnn().then(() => Toast.fire({ icon: 'success', title: 'โหลดข้อมูลประกาศเสร็จสิ้น' }));
                    else if (tab === 'activity') refreshAct().then(() => Toast.fire({ icon: 'success', title: 'โหลดข้อมูลกิจกรรมเสร็จสิ้น' }));
                    else if (tab === 'slide') refreshSlides().then(() => Toast.fire({ icon: 'success', title: 'โหลดข้อมูลสไลด์เสร็จสิ้น' }));
                    else if (tab === 'unit') refreshUnits().then(() => Toast.fire({ icon: 'success', title: 'โหลดข้อมูลหน่วยงานเสร็จสิ้น' }));
                    else if (tab === 'executive') executivesRef.current?.refreshExecutives().then(() => Toast.fire({ icon: 'success', title: 'โหลดข้อมูลผู้บริหารเสร็จสิ้น' }));
                    else if (tab === 'ita') itaRef.current?.refreshIta().then(() => Toast.fire({ icon: 'success', title: 'โหลดข้อมูล ITA เสร็จสิ้น' }));
                    else if (tab === 'users') {
                      const userTask = usersRef.current?.refresh()
                      if (userTask) {
                        userTask.then(() => Toast.fire({ icon: 'success', title: 'โหลดข้อมูลผู้ใช้เสร็จสิ้น' }))
                      } else {
                        Toast.fire({ icon: 'success', title: 'โหลดข้อมูลผู้ใช้เสร็จสิ้น' })
                      }
                    }
                    else if (tab === 'documents') {
                      const documentsTask = documentsRef.current?.refresh()
                      if (documentsTask) {
                        documentsTask.then(() => Toast.fire({ icon: 'success', title: 'โหลดข้อมูลเอกสารเสร็จสิ้น' }))
                      } else {
                        Toast.fire({ icon: 'success', title: 'โหลดข้อมูลเอกสารเสร็จสิ้น' })
                      }
                    }
                    else if (tab === 'banned_ips') {
                      bannedIpsRef.current?.refresh().then(() => Toast.fire({ icon: 'success', title: 'โหลดข้อมูล Banned IPs เสร็จสิ้น' }))
                    }
                    else refreshAnn().then(() => Toast.fire({ icon: 'success', title: 'โหลดข้อมูลเสร็จสิ้น' })); // Default
                  }}
                >
                  <span className="text-lg">🔄</span>
                  <span className="hidden sm:inline text-sm">รีเฟรช</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="min-h-0 p-4 lg:p-6">
            <AnimatePresence mode="wait">
              {tab === 'intro' ? (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-6 lg:space-y-8"
                >
                  <AdminIntroDashboard ref={introRef} />
                </motion.div>
              ) : tab === 'popups' ? (
                <motion.div
                  key="popups"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-6 lg:space-y-8"
                >
                  <PopupsManager ref={popupsRef} />
                </motion.div>
              ) : tab === 'overview' ? (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  {/* Welcome Section */}
                  <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-2xl p-6 lg:p-8 text-white shadow-xl">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-2xl lg:text-3xl font-bold mb-2">ยินดีต้อนรับสู่ระบบจัดการ</h2>
                        <p className="text-emerald-100 text-base lg:text-lg">จัดการเนื้อหาและข้อมูลของโรงพยาบาลอย่างมีประสิทธิภาพ</p>
                      </div>
                      <div className="hidden lg:block">
                        <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                          <span className="text-4xl">🏥</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                    {canManageAnnouncements && (
                      <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-blue-600 text-xs lg:text-sm font-medium mb-1">ประกาศทั้งหมด</div>
                            <div className="text-2xl lg:text-3xl font-bold text-gray-900">{annCount}</div>
                            <div className="text-xs text-gray-500 mt-1">รายการ</div>
                          </div>
                          <div className="inline-flex h-10 lg:h-12 w-10 lg:w-12 items-center justify-center rounded-xl bg-blue-50">
                            <span className="text-lg lg:text-xl">📢</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {canManageActivities && (
                      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-emerald-600 text-sm font-medium mb-1">กิจกรรมทั้งหมด</div>
                            <div className="text-3xl font-bold text-gray-900">{actCount}</div>
                            <div className="text-xs text-gray-500 mt-1">รายการ</div>
                          </div>
                          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                            <span className="text-xl">📸</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {canManageSlides && (
                      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-purple-600 text-sm font-medium mb-1">สไลด์ทั้งหมด</div>
                            <div className="text-3xl font-bold text-gray-900">{slideCount}</div>
                            <div className="text-xs text-gray-500 mt-1">รายการ</div>
                          </div>
                          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
                            <span className="text-xl">🖼️</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {canManageUnits && (
                      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-orange-600 text-sm font-medium mb-1">หน่วยงานทั้งหมด</div>
                            <div className="text-3xl font-bold text-gray-900">{unitCount}</div>
                            <div className="text-xs text-gray-500 mt-1">รายการ</div>
                          </div>
                          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
                            <span className="text-xl">🏢</span>
                          </div>
                        </div>
                      </div>

                    )}

                    {canManagePRPosters && (
                      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-pink-600 text-sm font-medium mb-1">PR Poster</div>
                            <div className="text-3xl font-bold text-gray-900">{prPosterCount}</div>
                            <div className="text-xs text-gray-500 mt-1">รายการ</div>
                          </div>
                          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50">
                            <span className="text-xl">🖼️</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {canManageOrganization && (
                      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-indigo-600 text-sm font-medium mb-1">ผังองค์กร</div>
                            <div className="text-3xl font-bold text-gray-900">{organizationCount}</div>
                            <div className="text-xs text-gray-500 mt-1">รายการ</div>
                          </div>
                          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                            <span className="text-xl">🧩</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {canManageDocuments && (
                      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-slate-600 text-sm font-medium mb-1">เอกสารทั้งหมด</div>
                            <div className="text-3xl font-bold text-gray-900">{documentCount}</div>
                            <div className="text-xs text-gray-500 mt-1">รายการ</div>
                          </div>
                          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
                            <span className="text-xl">📄</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {!canManageAnnouncements && !canManageActivities && !canManageSlides && !canManageUnits && !canManagePRPosters && !canManageOrganization && !canManageDocuments && (
                      <div className="col-span-full bg-white rounded-2xl p-6 text-center text-gray-500 border border-dashed border-gray-200">
                        ยังไม่มีสิทธิ์ดูสถิติของส่วนนี้
                      </div>
                    )}
                  </div>

                  {/* Recent Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {canManageActivities && (
                      <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <span className="text-blue-600">🕒</span>
                          กิจกรรมล่าสุด
                        </h3>
                        <div className="space-y-3">
                          {actList.slice(0, 5).map((activity, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                                <span className="text-sm">📸</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{activity.title}</div>
                                <div className="text-xs text-gray-500">
                                  {(activity.createdAt || activity.created_at) ? new Date(activity.createdAt || activity.created_at!).toLocaleDateString('th-TH') : 'ไม่ระบุวันที่'}
                                </div>
                              </div>
                            </div>
                          ))}
                          {actList.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <span className="text-3xl mb-2">📭</span>
                              <div className="text-sm">ยังไม่มีกิจกรรม</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {canManageAnnouncements && (
                      <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <span className="text-purple-600">📢</span>
                          ประกาศล่าสุด
                        </h3>
                        <div className="space-y-3">
                          {annList.slice(0, 5).map((announcement, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                                <span className="text-sm">📢</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{announcement.title}</div>
                                <div className="text-xs text-gray-500">
                                  {announcement.category} • {announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString('th-TH') : 'ไม่ระบุวันที่'}
                                </div>
                              </div>
                            </div>
                          ))}
                          {annList.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <span className="text-3xl mb-2">📭</span>
                              <div className="text-sm">ยังไม่มีประกาศ</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!canManageActivities && !canManageAnnouncements && !canManagePRPosters && !canManageDocuments && (
                      <div className="col-span-full bg-white rounded-2xl p-6 text-center text-gray-500 border border-dashed border-gray-200">
                        ยังไม่มีสิทธิ์ดูบันทึกล่าสุดในส่วนนี้
                      </div>
                    )}
                  </div>


                </motion.div>
              ) : tab === 'users' ? (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-6"
                >
                  <UserManagement ref={usersRef} />
                </motion.div>
              ) : tab === 'settings-display' ? (
                <motion.div
                  key="settings-display"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-6"
                >
                  <DisplayModeSettings />
                  <HeroSliderSettings />
                </motion.div>
              ) : tab === 'settings-user' ? (
                <motion.div
                  key="settings-user"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-6"
                >
                  <UserSettings />
                </motion.div>
              ) : tab === 'announce' ? (
                <motion.div
                  key="announce"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowAnnouncementForm(prev => !prev)}
                      className="admin-btn"
                    >
                      <span>{showAnnouncementForm ? '✕' : '+'}</span>
                      {showAnnouncementForm ? 'ปิดฟอร์มเพิ่มประกาศ' : 'เพิ่มประกาศใหม่'}
                    </button>
                  </div>
                  <Modal
                    isOpen={showAnnouncementForm}
                    onClose={() => setShowAnnouncementForm(false)}
                    title="เพิ่มประกาศใหม่"
                    subtitle="กรอกข้อมูลรายละเอียดประกาศที่ต้องการ"
                    maxWidth="max-w-3xl"
                  >
                    <AnnouncementForm
                      onCreated={() => {
                        refreshAnn()
                        triggerRefresh()
                        Swal.fire({
                          title: 'สำเร็จ',
                          icon: 'success',
                          confirmButtonText: 'ตกลง',
                          confirmButtonColor: '#10b981'
                        })
                        setShowAnnouncementForm(false)
                      }}
                      onCancel={() => setShowAnnouncementForm(false)}
                    />
                  </Modal>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4">
                      <select
                        value={status.announce}
                        onChange={e => {
                          setStatus(s => ({ ...s, announce: e.target.value as 'all' | 'published' | 'hidden' | 'scheduled' }))
                          setAnnPage(1)
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="all">ทั้งหมด</option>
                        <option value="published">เผยแพร่แล้ว</option>
                        <option value="hidden">ซ่อนอยู่</option>
                        <option value="scheduled">ตั้งเวลาเผยแพร่</option>
                      </select>
                      <span className="text-sm text-gray-600">พบ {annCount} รายการ</span>
                    </div>
                    <div className="relative w-full sm:w-96">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-blue-400">🔍</span>
                      </div>
                      <input
                        className="w-full rounded-xl border-2 border-blue-100 bg-blue-50/50 pl-12 pr-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-300 transition-all duration-200"
                        placeholder="ค้นหาประกาศ..."
                        value={query.announce}
                        onChange={(e) => {
                          setQuery(q => ({ ...q, announce: e.target.value }))
                          setAnnPage(1)
                        }}
                      />
                    </div>
                  </div>
                  <AnnouncementsList
                    list={annList}
                    page={annPage}
                    totalPages={annTotalPages}
                    onPageChange={setAnnPage}
                    onEditSaved={async () => {
                      await refreshAnn(); triggerRefresh(); Swal.fire({
                        title: 'สำเร็จ',
                        icon: 'success',
                        confirmButtonText: 'ตกลง',
                        confirmButtonColor: '#10b981'
                      })
                    }} onDeleted={async () => {
                      await refreshAnn(); triggerRefresh(); Swal.fire({
                        title: 'สำเร็จ',
                        icon: 'success',
                        confirmButtonText: 'ตกลง',
                        confirmButtonColor: '#10b981'
                      })
                    }} />
                </motion.div>
              ) : tab === 'activity' ? (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowActivityForm(prev => !prev)}
                      className="admin-btn"
                    >
                      <span>{showActivityForm ? '✕' : '+'}</span>
                      {showActivityForm ? 'ปิดฟอร์มเพิ่มกิจกรรม' : 'เพิ่มกิจกรรมใหม่'}
                    </button>
                  </div>
                  <Modal
                    isOpen={showActivityForm}
                    onClose={() => setShowActivityForm(false)}
                    title="เพิ่มกิจกรรมใหม่"
                    subtitle="สร้างอัลบั้มรูปภาพกิจกรรมใหม่"
                    maxWidth="max-w-3xl"
                  >
                    <ActivityForm
                      onCreated={() => {
                        refreshAct()
                        triggerRefresh()
                        Swal.fire({
                          title: 'สำเร็จ',
                          icon: 'success',
                          confirmButtonText: 'ตกลง',
                          confirmButtonColor: '#10b981'
                        })
                        setShowActivityForm(false)
                      }}
                      onCancel={() => setShowActivityForm(false)}
                    />
                  </Modal>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4">
                      <select
                        value={status.activity}
                        onChange={e => {
                          setStatus(s => ({ ...s, activity: e.target.value as 'all' | 'published' | 'hidden' | 'scheduled' }))
                          setActPage(1)
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="all">ทั้งหมด</option>
                        <option value="published">เผยแพร่แล้ว</option>
                        <option value="hidden">ซ่อนอยู่</option>
                        <option value="scheduled">ตั้งเวลาเผยแพร่</option>
                      </select>
                      <span className="text-sm text-gray-600">พบ {actCount} รายการ</span>
                    </div>
                    <div className="relative w-full sm:w-96">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-emerald-400">🔍</span>
                      </div>
                      <input
                        className="w-full rounded-xl border-2 border-emerald-100 bg-emerald-50/50 pl-12 pr-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-emerald-200 focus:border-emerald-300 transition-all duration-200"
                        placeholder="ค้นหากิจกรรม..."
                        value={query.activity}
                        onChange={(e) => {
                          setQuery(q => ({ ...q, activity: e.target.value }))
                          setActPage(1)
                        }}
                      />
                    </div>
                  </div>
                  <ActivitiesList
                    list={actList}
                    page={actPage}
                    totalPages={actTotalPages}
                    onPageChange={setActPage}
                    onEditSaved={async () => {
                      await refreshAct(); triggerRefresh(); Swal.fire({
                        title: 'สำเร็จ',
                        icon: 'success',
                        confirmButtonText: 'ตกลง',
                        confirmButtonColor: '#10b981'
                      })
                    }} onDeleted={async () => {
                      await refreshAct(); triggerRefresh(); Swal.fire({
                        title: 'สำเร็จ',
                        icon: 'success',
                        confirmButtonText: 'ตกลง',
                        confirmButtonColor: '#10b981'
                      })
                    }} />
                </motion.div>
              ) : tab === 'slide' ? (
                <motion.div
                  key="slide"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <Modal
                    isOpen={creatingSlide}
                    onClose={() => setCreatingSlide(false)}
                    title="เพิ่มสไลด์ใหม่"
                    subtitle="เพิ่มรูปภาพสไลด์ประชาสัมพันธ์ในหน้าแรก"
                    maxWidth="max-w-2xl"
                  >
                    <SlidesForm onCreated={() => {
                      setCreatingSlide(false); refreshSlides(); triggerRefresh(); Swal.fire({
                        title: 'สำเร็จ',
                        icon: 'success',
                        confirmButtonText: 'ตกลง',
                        confirmButtonColor: '#10b981'
                      })
                    }} onCancel={() => setCreatingSlide(false)} />
                  </Modal>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4">
                      <select
                        value={status.slide}
                        onChange={(e) => { setStatus(prev => ({ ...prev, slide: e.target.value as 'all' | 'published' | 'hidden' })); setSlidePage(1) }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      >
                        <option value="all">ทั้งหมด</option>
                        <option value="published">เผยแพร่แล้ว</option>
                        <option value="hidden">ซ่อนอยู่</option>
                      </select>
                      <span className="text-sm text-gray-600">พบ {slideCount} รายการ</span>
                    </div>
                    <div className="relative w-full sm:w-96">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-purple-400">🔍</span>
                      </div>
                      <input
                        className="w-full rounded-xl border-2 border-purple-100 bg-purple-50/50 pl-12 pr-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-300 transition-all duration-200"
                        placeholder="ค้นหาสไลด์..."
                        value={query.slide}
                        onChange={(e) => { setQuery(q => ({ ...q, slide: e.target.value })); setSlidePage(1) }}
                      />
                    </div>
                  </div>
                  <SlidesList list={slideList} page={slidePage} totalPages={slideTotalPages} onPageChange={setSlidePage} onEditSaved={() => {
                    refreshSlides(); triggerRefresh(); Swal.fire({
                      title: 'สำเร็จ',
                      icon: 'success',
                      confirmButtonText: 'ตกลง',
                      confirmButtonColor: '#10b981'
                    })
                  }} onDeleted={() => {
                    refreshSlides(); triggerRefresh(); Swal.fire({
                      title: 'สำเร็จ',
                      icon: 'success',
                      confirmButtonText: 'ตกลง',
                      confirmButtonColor: '#10b981'
                    })
                  }} onCreate={() => setCreatingSlide(true)} />
                </motion.div>
              ) : tab === 'unit' ? (
                <motion.div
                  key="unit"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowUnitForm(prev => !prev)}
                      className="admin-btn"
                    >
                      <span>{showUnitForm ? '✕' : '+'}</span>
                      {showUnitForm ? 'ปิดฟอร์มเพิ่มหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}
                    </button>
                  </div>
                  <Modal
                    isOpen={showUnitForm}
                    onClose={() => setShowUnitForm(false)}
                    title="เพิ่มหน่วยงานใหม่"
                    subtitle="เพิ่มลิงก์หน่วยงานภายนอกหรือภายใน"
                    maxWidth="max-w-2xl"
                  >
                    <UnitsForm
                      onCreated={async () => {
                        await refreshUnits()
                        triggerRefresh()
                        Swal.fire({
                          title: 'สำเร็จ',
                          icon: 'success',
                          confirmButtonText: 'ตกลง',
                          confirmButtonColor: '#10b981'
                        })
                        setShowUnitForm(false)
                      }}
                      onCancel={() => setShowUnitForm(false)}
                    />
                  </Modal>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4">
                      <select
                        value={status.unit || 'all'}
                        onChange={(e) => { setStatus(prev => ({ ...prev, unit: e.target.value as 'all' | 'published' | 'hidden' })); setUnitPage(1) }}
                        className="px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      >
                        <option value="all">ทั้งหมด</option>
                        <option value="published">เผยแพร่แล้ว</option>
                        <option value="hidden">ซ่อนอยู่</option>
                      </select>
                      <span className="text-sm text-gray-600">พบ {unitCount} รายการ</span>
                    </div>
                    <div className="relative w-full sm:w-96">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-orange-400">🔍</span>
                      </div>
                      <input
                        className="w-full rounded-xl border-2 border-orange-100 bg-orange-50/50 pl-12 pr-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-orange-200 focus:border-orange-300 transition-all duration-200"
                        placeholder="ค้นหาหน่วยงาน..."
                        value={query.unit}
                        onChange={(e) => { setQuery(q => ({ ...q, unit: e.target.value })); setUnitPage(1) }}
                      />
                    </div>
                  </div>
                  <UnitsList list={unitList} page={unitPage} totalPages={unitTotalPages} onPageChange={setUnitPage} onEditSaved={async () => {
                    await refreshUnits(); triggerRefresh(); Swal.fire({
                      title: 'สำเร็จ',
                      icon: 'success',
                      confirmButtonText: 'ตกลง',
                      confirmButtonColor: '#10b981'
                    })
                  }} onDeleted={async () => {
                    await refreshUnits(); triggerRefresh(); Swal.fire({
                      title: 'สำเร็จ',
                      icon: 'success',
                      confirmButtonText: 'ตกลง',
                      confirmButtonColor: '#10b981'
                    })
                  }} />
                </motion.div>
              ) : tab === 'banned_ips' ? (
                <motion.div
                  key="banned_ips"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-6"
                >
                  <BannedIPsManagement ref={bannedIpsRef} />
                </motion.div>
              ) : tab === 'executive' ? (
                <motion.div
                  key="executive"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <ExecutivesManagement ref={executivesRef} />
                </motion.div>
              ) : tab === 'infographic' ? (
                <motion.div
                  key="infographic"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <InfographicsManagement ref={infographicsRef} />
                </motion.div>
              ) : tab === 'pr_poster' ? (
                <motion.div
                  key="pr_poster"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <PRPosterManagement ref={prPosterRef} />
                </motion.div>
              ) : tab === 'pr_plan' ? (
                <motion.div
                  key="legalEthics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <LegalEthicsManagement ref={legalEthicsRef} />
                </motion.div>
              ) : tab === 'organization' ? (
                <motion.div
                  key="organization"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <OrganizationChartManagement />
                </motion.div>
              ) : tab === 'ita' ? (
                <motion.div
                  key="ita"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <ItaManagement ref={itaRef} />
                </motion.div>
              ) : tab === 'feedback' ? (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <FeedbackManagement />
                </motion.div>
              ) : tab === 'documents' ? (
                <motion.div
                  key="documents"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <DocumentsManagement ref={documentsRef} />
                </motion.div>
              ) : tab === 'legalEthics' ? (
                <motion.div
                  key="legalEthics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-4 lg:space-y-6"
                >
                  <LegalEthicsManagement ref={legalEthicsRef} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

function UnitsForm({ onCreated, onCancel }: { onCreated: () => void; onCancel?: () => void }) {
  const { getToken, refreshToken } = useAuth()
  const [name, setName] = useState('')
  const [href, setHref] = useState('')
  const [image, setImage] = useState<{ url: string; publicId?: string } | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [order, setOrder] = useState<number>(0)
  const [isPublished, setIsPublished] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const onUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      let r = await fetch('/api/uploads/image', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })

      // If unauthorized, try to refresh token and retry
      if (r.status === 401) {
        const refreshSuccess = await refreshToken()
        if (refreshSuccess) {
          r = await fetch('/api/uploads/image', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })
        }
      }

      if (!r.ok) throw new Error('upload failed')
      const data = await r.json()
      setImage({ url: data.url, publicId: data.publicId })
    } catch { Swal.fire('ข้อผิดพลาด', 'อัปโหลดรูปไม่สำเร็จ', 'error') } finally { setUploading(false) }
  }

  const applyImageUrl = () => {
    const u = imageUrl.trim()
    if (!u) { setImage(null); return }
    try { const parsed = new URL(u); if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad') } catch { Swal.fire('ข้อผิดพลาด', 'URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)', 'error'); return }
    setImage({ url: u })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const cleanHref = (href || '').trim()

      const fd = new FormData()
      fd.append('name', name)
      if (cleanHref) fd.append('href', cleanHref)
      fd.append('order', String(order))
      fd.append('isPublished', String(isPublished))

      // ถ้ามีรูปภาพ
      if (image?.url) {
        // ถ้าเป็น data URL (จาก file input) แปลงเป็น blob
        if (image.url.startsWith('data:')) {
          try {
            // Helper function to convert data URL to Blob
            const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
              try {
                // Try manual conversion derived from base64
                const [prefix, base64] = dataUrl.split(',')
                const match = prefix.match(/data:(.*?);base64/)
                const mime = match?.[1] || 'application/octet-stream'
                const binary = atob(base64 || '')
                const len = binary.length
                const bytes = new Uint8Array(len)
                for (let i = 0; i < len; i++) {
                  bytes[i] = binary.charCodeAt(i)
                }
                return new Blob([bytes], { type: mime })
              } catch (e) {
                // Determine if fetch is possible fallback
                console.warn('Manual blob conversion failed, fallback to fetch:', e)
                const res = await fetch(dataUrl)
                return await res.blob()
              }
            }

            const blob = await dataUrlToBlob(image.url)

            // Determine extension from blob type logic
            let ext = 'jpg'
            if (blob.type === 'image/png') ext = 'png'
            else if (blob.type === 'image/webp') ext = 'webp'
            else if (blob.type === 'image/gif') ext = 'gif'

            const fileName = image.publicId ? `unit-${image.publicId}.${ext}` : `unit.${ext}`
            fd.append('image', blob, fileName)
          } catch (err) {
            console.error('Failed to convert image:', err)
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่', 'error')
            return
          }
        }
        // ถ้าเป็น URL ปกติ (http/https) ส่ง URL ไปให้ backend ดาวน์โหลด
        else if (image.url.startsWith('http://') || image.url.startsWith('https://')) {
          fd.append('imageUrl', image.url)
        }
      }

      const headers: Record<string, string> = { 'Authorization': `Bearer ${getToken()}` }
      const r = await fetch('/api/units', { method: 'POST', headers, body: fd })
      if (!r.ok) {
        let msg = 'บันทึกลิงก์หน่วยงานไม่สำเร็จ'
        try {
          const j = await r.json()
          if (j?.details || j?.error) msg += `: ${j.details || j.error}`
        } catch (parseError) {
          console.debug('Failed to parse unit creation error response', parseError)
        }
        Swal.fire('ข้อผิดพลาด', msg, 'error')
        return
      }
      setName(''); setHref(''); setImage(null); setImageUrl(''); setOrder(0); setIsPublished(true)
      onCreated()
    } finally { setSaving(false) }
  }

  const handleCancel = () => {
    setName('')
    setHref('')
    setImage(null)
    setImageUrl('')
    setOrder(0)
    setIsPublished(true)
    onCancel?.()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">ชื่อหน่วยงาน</label>
        <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded border px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm mb-1">ลิงก์หน่วยงาน</label>
        <input value={href} onChange={e => setHref(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="เช่น https:// หรือ /path ภายในเว็บ" />
      </div>
      <div>
        <label className="block text-sm mb-1">โลโก้ (อัปโหลด หรือปล่อยว่าง)</label>
        <div className="flex items-center gap-2">
          <label className="admin-btn admin-btn--outline cursor-pointer">
            อัปโหลดรูปโลโก้
            <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
          </label>
          {uploading && <span className="text-sm text-gray-600">กำลังอัปโหลด...</span>}
        </div>
        <div className="mt-2 grid md:grid-cols-[1fr_auto] gap-2">
          <input
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="หรือวาง URL รูปภาพภายนอก เช่น https://example.com/logo.png"
            className="w-full rounded border px-3 py-2"
            inputMode="url"
          />
          <button type="button" className="admin-btn admin-btn--outline" onClick={applyImageUrl}>ใช้ URL</button>
        </div>
        {image && (
          <div className="mt-2">
            <img src={image.url.startsWith('data:') ? image.url : `${image.url}${image.url.includes('?') ? '&' : '?'}w=160`} loading="lazy" decoding="async" width={160} height={64} className="h-16 object-contain" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">ลำดับ</label>
          <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} className="w-full rounded border px-3 py-2" />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} /> เผยแพร่</label>
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={saving} className="admin-btn">
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              กำลังบันทึก...
            </>
          ) : (
            'บันทึก'
          )}
        </button>
        {onCancel && (
          <button type="button" onClick={handleCancel} className="admin-btn admin-btn--outline">
            ยกเลิก
          </button>
        )}
      </div>
    </form>
  )
}

function SlidesForm({ onCreated, onCancel }: { onCreated: () => void; onCancel?: () => void }) {
  const { getToken, refreshToken } = useAuth()
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [alt, setAlt] = useState('')
  const [href, setHref] = useState('')
  const [image, setImage] = useState<{ url: string; publicId?: string } | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [order, setOrder] = useState<number>(0)
  const [isPublished, setIsPublished] = useState(true)
  const [duration, setDuration] = useState<number>(5)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const onUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      let r = await fetch('/api/uploads/image', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })

      // If unauthorized, try to refresh token and retry
      if (r.status === 401) {
        const refreshSuccess = await refreshToken()
        if (refreshSuccess) {
          r = await fetch('/api/uploads/image', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })
        }
      }

      if (!r.ok) throw new Error('upload failed')
      const data = await r.json()
      setImage({ url: data.url, publicId: data.publicId })
    } catch { Swal.fire({ title: 'ข้อผิดพลาด', text: 'อัปโหลดรูปไม่สำเร็จ', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' }) } finally { setUploading(false) }
  }

  const applyImageUrl = () => {
    const u = imageUrl.trim()
    if (!u) { setImage(null); return }
    try { const parsed = new URL(u); if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad') } catch { Swal.fire({ title: 'ข้อผิดพลาด', text: 'URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' }); return }
    // Allow any valid URL
    try { new URL(u) } catch { Swal.fire({ title: 'ข้อผิดพลาด', text: 'URL ไม่ถูกต้อง', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' }); return }
    setImage({ url: u })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!image) { Swal.fire({ title: 'แจ้งเตือน', text: 'กรุณาอัปโหลดรูปสไลด์', icon: 'warning', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' }); return }
    if (isPublished && !alt.trim()) { Swal.fire({ title: 'แจ้งเตือน', text: 'กรุณากรอกข้อความคำอธิบายรูป (alt) เมื่อเผยแพร่สไลด์', icon: 'warning', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' }); return }
    setSaving(true)
    try {
      const cleanHref = (href || '').trim()

      // แปลง data URL เป็น Blob
      const dataUrlToBlob = (dataUrl: string): Blob => {
        // Convert base64 data URLs without network fetch to satisfy strict CSP rules
        const [prefix, base64] = dataUrl.split(',')
        const match = prefix.match(/data:(.*?);base64/)
        const mime = match?.[1] || 'application/octet-stream'
        const binary = atob(base64 || '')
        const len = binary.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        return new Blob([bytes], { type: mime })
      }

      // สร้าง FormData พร้อมไฟล์
      const fd = new FormData()
      const blob = image.url.startsWith('data:')
        ? dataUrlToBlob(image.url)
        : await fetch(image.url).then(r => r.blob())
      const fileName = image.publicId ? `slide-${image.publicId}.jpg` : 'slide.jpg'
      fd.append('image', blob, fileName)
      fd.append('title', title)
      fd.append('caption', caption)
      fd.append('alt', alt)
      if (cleanHref) fd.append('href', cleanHref)
      fd.append('order', String(order))
      fd.append('isPublished', String(isPublished))
      fd.append('duration', String(duration))

      const r = await fetch('/api/slides', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })
      if (!r.ok) {
        let msg = 'บันทึกสไลด์ไม่สำเร็จ'
        try {
          const j = await r.json()
          if (j?.details || j?.error) msg += `: ${j.details || j.error}`
        } catch (parseError) {
          console.debug('Failed to parse slide creation error response', parseError)
        }
        Swal.fire({ title: 'ข้อผิดพลาด', text: msg, icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' })
        return
      }
      let created: SlideItem | null = null
      try {
        created = await r.json() as SlideItem
      } catch (parseError) {
        console.debug('Failed to parse slide creation response', parseError)
      }
      // console.log('[SlidesForm] create response:', created)
      if (created && !created.href && !created.link && !created.url && cleanHref) {
        console.warn('[SlidesForm] Backend ไม่ได้บันทึก URL ของสไลด์ โปรดตรวจสอบ schema/ตัวรับค่า ของ API')
      }
      setTitle(''); setCaption(''); setAlt(''); setHref(''); setImage(null); setOrder(0); setIsPublished(true); setDuration(5)
      onCreated()
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">หัวข้อ</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded border px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm mb-1">คำบรรยาย</label>
        <input value={caption} onChange={e => setCaption(e.target.value)} className="w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm mb-1">ข้อความคำอธิบายรูป (alt)</label>
        <input value={alt} onChange={e => setAlt(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="ช่วยการเข้าถึงและ SEO" required={isPublished} />
      </div>
      <div>
        <label className="block text-sm mb-1">ลิงก์เมื่อคลิก (ใส่ URL เช่น https:// หรือ /path)</label>
        <input value={href} onChange={e => setHref(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="เช่น https://ponghospital.go.th/ หรือ /announcements/123" />
        <p className="mt-1 text-xs text-gray-600">เวลากดสไลด์จะพาไปยังลิงก์นี้ (ไม่บังคับ)</p>
      </div>
      <div>
        <label className="block text-sm mb-1">รูปภาพสไลด์</label>
        {!image ? (
          <>
            <div className="flex items-center gap-2">
              <label className="admin-btn admin-btn--outline cursor-pointer">
                อัปโหลดรูป
                <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
              </label>
              {uploading && <span className="text-sm text-gray-600">กำลังอัปโหลด...</span>}
            </div>
            <div className="mt-2 grid md:grid-cols-[1fr_auto] gap-2">
              <input
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="หรือวาง URL รูปภาพ"
                className="w-full rounded border px-3 py-2"
                inputMode="url"
              />
              <button type="button" className="admin-btn admin-btn--outline" onClick={applyImageUrl}>ใช้ URL</button>
            </div>
          </>
        ) : (
          <div className="mt-2 flex items-center gap-3">
            <img src={image.url.startsWith('data:') ? image.url : `${image.url}${image.url.includes('?') ? '&' : '?'}w=400`} loading="lazy" decoding="async" width={200} height={120} className="h-24 rounded" />
            <button type="button" className="admin-btn admin-btn--outline" onClick={() => setImage(null)}>ลบรูป</button>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-600">
          แนะนำ: ขนาดประมาณ 1920x700px (อัตราส่วน ~2.75:1) ใช้ภาพแนวนอน ความสำคัญอยู่บริเวณกึ่งกลาง เพื่อไม่ถูกครอปบนจอมือถือ/เดสก์ท็อป
          รองรับ JPG/PNG/GIF และขนาดไฟล์ &lt; 1MB รองรับภาพเคลื่อนไหว 7 วินาที
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">ลำดับ</label>
          <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} className="w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">ระยะเวลาแสดง (วินาที)</label>
          <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min="1" max="60" className="w-full rounded border px-3 py-2" />
          <p className="mt-1 text-xs text-gray-600">1-60 วินาที</p>
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} /> เผยแพร่</label>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn--outline">ยกเลิก</button>
        <button disabled={saving} className="admin-btn">
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              กำลังบันทึก...
            </>
          ) : (
            'บันทึก'
          )}
        </button>
      </div>
    </form>
  )
}

function SlidesList({ list, page, totalPages, onPageChange, onEditSaved, onDeleted, onCreate }: { list: SlideItem[]; page: number; totalPages: number; onPageChange: (p: number) => void; onEditSaved: () => void; onDeleted: () => void; onCreate: () => void }) {
  const { getToken } = useAuth()
  const [editing, setEditing] = useState<SlideItem | null>(null)
  const [draggingId, setDraggingId] = useState<string | number | null>(null)
  const [local, setLocal] = useState<SlideItem[]>(list)
  // Sync local with props.list whenever list changes (e.g. page change or refresh)
  useEffect(() => { setLocal(list) }, [list])

  const remove = async (id?: string | number) => {
    if (id === undefined || id === null) return
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: 'ยืนยันการลบสไลด์นี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    })
    if (!result.isConfirmed) return
    const idStr = String(id)
    const r = await fetch(`/api/slides/${encodeURIComponent(idStr)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } })
    if (r.ok) {
      // Optimistic update for local
      setLocal(prev => prev.filter(s => String(s._id ?? s.id) !== idStr))
      onDeleted()
    }
  }
  const onDragStart = (id: string | number) => setDraggingId(id)
  const onDragOver = (e: React.DragEvent, overId: string | number) => {
    e.preventDefault()
    if (!draggingId || draggingId === overId) return
    const working = [...local]
    const fromIndex = working.findIndex(s => String(s._id ?? s.id) === String(draggingId))
    const toIndex = working.findIndex(s => String(s._id ?? s.id) === String(overId))
    if (fromIndex === -1 || toIndex === -1) return
    const updated = [...working]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    const reindexed = updated.map((slide, index) => ({ ...slide, order: index }))
    setLocal(reindexed)
  }
  const onDragEnd = () => setDraggingId(null)
  const saveOrder = async () => {
    const token = getToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const body = local.map(s => ({ _id: s._id ?? s.id, order: s.order ?? 0 }))
    const r = await fetch('/api/slides/reorder', { method: 'POST', headers, body: JSON.stringify(body) })
    if (r.ok) onEditSaved()
  }
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">รายการสไลด์</div>
        <div className="flex gap-2">
          <button className="admin-btn admin-btn--outline" onClick={saveOrder} disabled={!local.length}>บันทึกลำดับ</button>
          <button className="admin-btn" onClick={onCreate}>สร้างสไลด์ใหม่</button>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {local.map((s, index) => {
          const identifier = String(s._id ?? s.id ?? `temp-${index}`)
          return (
            <div key={identifier} className="card" draggable onDragStart={() => onDragStart(identifier)} onDragOver={(e) => onDragOver(e, identifier)} onDragEnd={onDragEnd}>
              <div className="card-body flex gap-3">
                <img src={`${s?.image?.url}${s?.image?.url?.includes('?') ? '&' : '?'}w=200&t=${Date.now()}`} loading="lazy" decoding="async" width={96} height={64} className="h-16 w-24 object-cover rounded" alt={s?.title ? `ภาพสไลด์: ${s.title}` : 'ภาพสไลด์'} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-2">
                    <span className="truncate">{s.title}</span>
                    <span className={`badge ${s.isPublished ? 'green' : 'gray'}`}>{s.isPublished ? 'เผยแพร่' : 'ซ่อน'}</span>
                  </div>
                  <div className="text-sm text-gray-600 truncate">{s.caption}</div>
                  <div className="text-xs text-gray-500">ลำดับ: {s.order ?? 0}</div>
                  {(s.href || s.url || s.link) && (
                    <div className="text-xs mt-1 truncate">
                      <span className="text-gray-500">ลิงก์:</span>{' '}
                      <a
                        href={(s.href || s.url || s.link)}
                        target={/^https?:\/\//i.test(String(s.href || s.url || s.link)) ? '_blank' : undefined}
                        rel={/^https?:\/\//i.test(String(s.href || s.url || s.link)) ? 'noopener noreferrer' : undefined}
                        className="text-blue-700 hover:underline"
                      >
                        {s.href || s.url || s.link}
                      </a>
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button className="admin-btn admin-btn--outline" aria-label="แก้ไขสไลด์" onClick={() => setEditing(s)}>
                      ✏️ <span>แก้ไข</span>
                    </button>
                    <button className="admin-btn admin-btn--outline" aria-label="ลบสไลด์" onClick={() => remove(identifier)}>
                      🗑️ <span>ลบ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {local.length === 0 && <div className="text-gray-500">ยังไม่มีสไลด์</div>}
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button className="admin-btn admin-btn--outline" aria-label="หน้าก่อนหน้า" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>ก่อนหน้า</button>
          <div>หน้า {page} / {totalPages}</div>
          <button className="admin-btn admin-btn--outline" aria-label="หน้าถัดไป" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>ถัดไป</button>
        </div>
      )}
      {editing && (
        <EditSlideModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onEditSaved() }} />
      )}
    </div>
  )
}

function EditSlideModal({ initial, onClose, onSaved }: { initial: SlideItem; onClose: () => void; onSaved: () => void }) {
  const { getToken, refreshToken } = useAuth()
  const [form, setForm] = useState<SlideItem>({ ...initial, href: initial?.href || initial?.url || initial?.link || '' })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>(initial?.image?.url || '')

  const removeImage = async () => {
    const publicId = form.image?.publicId
    if (publicId && String(publicId).startsWith('ponghospital/')) {
      fetch(`/api/uploads/image/${encodeURIComponent(publicId)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }).catch(err => console.debug('Failed to delete slide image', err))
    }
    setForm(prev => ({ ...prev, image: null }))
  }

  const onUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      let r = await fetch('/api/uploads/image', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })

      // If unauthorized, try to refresh token and retry
      if (r.status === 401) {
        const refreshSuccess = await refreshToken()
        if (refreshSuccess) {
          r = await fetch('/api/uploads/image', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })
        }
      }

      if (!r.ok) throw new Error('upload failed')
      const data = await r.json() as { url: string; publicId?: string }
      setForm(prev => ({ ...prev, image: { url: data.url, publicId: data.publicId } }))
    } catch { Swal.fire({ title: 'ข้อผิดพลาด', text: 'อัปโหลดรูปไม่สำเร็จ', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' }) } finally { setUploading(false) }
  }

  const save = async () => {
    if ((form.isPublished ?? true) && !String(form.alt || '').trim()) { Swal.fire({ title: 'แจ้งเตือน', text: 'กรุณากรอกข้อความคำอธิบายรูป (alt) เมื่อเผยแพร่สไลด์', icon: 'warning', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' }); return }
    setSaving(true)
    try {
      const cleanHref = (form.href || '').trim()

      // ตรวจสอบว่ารูปเป็น data URL ใหม่หรือไม่
      const hasNewImage = form.image?.url?.startsWith('data:')

      let body: FormData | string
      const headers: Record<string, string> = { 'Authorization': `Bearer ${getToken()}` }
      let method = 'PUT'
      let url = `/api/slides/${initial._id}`

      if (!initial._id) {
        // สร้างใหม่
        method = 'POST'
        url = '/api/slides'
      }

      if (hasNewImage) {
        // ถ้ามีรูปใหม่ ส่งเป็น FormData
        const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
          const res = await fetch(dataUrl)
          return res.blob()
        }

        const fd = new FormData()
        const imageUrl = form.image?.url
        if (!imageUrl) { Swal.fire({ title: 'ข้อผิดพลาด', text: 'ไม่พบข้อมูลรูปภาพใหม่ กรุณาลองอีกครั้ง', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' }); return }
        const blob = await dataUrlToBlob(imageUrl)
        const fileName = form.image?.publicId ? `slide-${form.image?.publicId}.gif` : 'slide.gif'
        fd.append('image', blob, fileName)
        fd.append('title', form.title || '')
        fd.append('caption', form.caption || '')
        fd.append('alt', form.alt || '')
        if (cleanHref) fd.append('href', cleanHref)
        fd.append('order', String(form.order ?? 0))
        fd.append('duration', String(form.duration ?? 5))
        fd.append('isPublished', String(form.isPublished ?? true))
        body = fd
      } else {
        // ถ้าไม่มีรูปใหม่ ส่งเป็น JSON
        headers['Content-Type'] = 'application/json'
        const payload = {
          title: form.title,
          caption: form.caption,
          alt: form.alt,
          href: cleanHref === '' ? '' : cleanHref,
          order: form.order,
          duration: form.duration ?? 5,
          isPublished: form.isPublished,
        }
        body = JSON.stringify(payload)
      }

      const r = await fetch(url, { method, headers, body })
      if (r.ok) onSaved()
      else {
        let msg = 'บันทึกสไลด์ไม่สำเร็จ'
        try {
          const j = await r.json()
          if (j?.details || j?.error) msg += `: ${j.details || j.error}`
        } catch (parseError) {
          console.debug('Failed to parse slide update error response', parseError)
        }
        Swal.fire({ title: 'ข้อผิดพลาด', text: msg, icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' })
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="card max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="card-header shrink-0">{initial._id ? 'แก้ไขสไลด์' : 'สร้างสไลด์ใหม่'}</div>
        <div className="card-body space-y-3 overflow-y-auto overflow-x-hidden max-w-full p-4">
          <div>
            <label className="block text-sm mb-1">หัวข้อ</label>
            <input value={form.title || ''} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">คำบรรยาย</label>
            <input value={form.caption || ''} onChange={e => setForm(prev => ({ ...prev, caption: e.target.value }))} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">ข้อความคำอธิบายรูป (alt)</label>
            <input value={form.alt || ''} onChange={e => setForm(prev => ({ ...prev, alt: e.target.value }))} className="w-full rounded border px-3 py-2" placeholder="ช่วยการเข้าถึงและ SEO" required={form.isPublished ?? true} />
          </div>
          <div>
            <label className="block text-sm mb-1">ลิงก์เมื่อคลิก (URL)</label>
            <input value={form.href || ''} onChange={e => setForm(prev => ({ ...prev, href: e.target.value }))} className="w-full rounded border px-3 py-2" placeholder="เช่น https://ponghospital.go.th/ หรือ /announcements/123" />
            <p className="mt-1 text-xs text-gray-600">ปล่อยว่างเพื่อลบลิงก์เดิม หรือกรอก URL/พาธ ภายในเว็บเพื่อตั้งลิงก์ใหม่</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">ลำดับ</label>
              <input type="number" value={form.order ?? 0} onChange={e => setForm(prev => ({ ...prev, order: Number(e.target.value) }))} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">ระยะเวลาแสดง (วินาที)</label>
              <input type="number" value={form.duration ?? 5} onChange={e => setForm(prev => ({ ...prev, duration: Number(e.target.value) }))} min="1" max="60" className="w-full rounded border px-3 py-2" />
              <p className="mt-1 text-xs text-gray-600">1-60 วินาที</p>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished ?? true} onChange={e => setForm(prev => ({ ...prev, isPublished: e.target.checked }))} /> เผยแพร่</label>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">รูปภาพ</label>
            {form?.image?.url ? (
              <div className="flex items-center gap-3">
                <img src={form.image.url.startsWith('data:') ? form.image.url : `${form.image.url}${form.image.url.includes('?') ? '&' : '?'}w=400`} loading="lazy" decoding="async" width={240} height={160} className="h-28 rounded" />
                <button type="button" className="admin-btn admin-btn--outline" onClick={removeImage}>ลบรูป</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <label className="admin-btn admin-btn--outline cursor-pointer">
                    อัปโหลดรูปใหม่
                    <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
                  </label>
                  {uploading && <span className="text-sm text-gray-600">กำลังอัปโหลด...</span>}
                </div>
                <div className="mt-2 grid md:grid-cols-[1fr_auto] gap-2">
                  <input
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="หรือวาง URL รูปภาพ"
                    className="w-full rounded border px-3 py-2"
                    inputMode="url"
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn--outline"
                    onClick={() => {
                      const u = imageUrl.trim()
                      if (!u) { setForm(prev => ({ ...prev, image: null })); return }
                      try { const parsed = new URL(u); if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad') } catch { Swal.fire({ title: 'ข้อผิดพลาด', text: 'URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' }); return }
                      try { new URL(u) } catch { Swal.fire({ title: 'ข้อผิดพลาด', text: 'URL ไม่ถูกต้อง', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' }); return }
                      setForm(prev => ({ ...prev, image: { url: u } }))
                    }}
                  >ใช้ URL</button>
                </div>
              </>
            )}
            <p className="mt-2 text-xs text-gray-600">
              แนะนำ: ขนาดประมาณ 1920x700px (อัตราส่วน ~2.75:1) ภาพแนวนอน จัดองค์ประกอบสำคัญไว้กลางภาพ เพื่อลดการครอปบนอุปกรณ์ต่างๆ
              ควรเป็น JPG/PNG/GIF และขนาดไฟล์ &lt; 1MB
            </p>
          </div>
        </div>
        <div className="card-footer flex gap-2 justify-end shrink-0 p-4 border-t">
          <button className="admin-btn admin-btn--outline" onClick={onClose}>ยกเลิก</button>
          <button disabled={saving} className="admin-btn" onClick={save}>
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                กำลังบันทึก...
              </>
            ) : (
              'บันทึก'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function AnnouncementsList({ list, page, totalPages, onPageChange, onEditSaved, onDeleted }: { list: Announcement[]; page: number; totalPages: number; onPageChange: (p: number) => void; onEditSaved: () => void; onDeleted: () => void }) {
  const { getToken } = useAuth()
  const [editing, setEditing] = useState<Announcement | null>(null)
  const remove = async (id?: string) => {
    if (!id) return
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: 'ยืนยันการลบประกาศนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    })
    if (!result.isConfirmed) return
    const r = await fetch(`/api/announcements/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } })
    if (r.ok) onDeleted()
  }
  return (
    <div className="mt-8">
      <div className="font-semibold mb-3">รายการประกาศ</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2 pr-3">หัวข้อ</th>
              <th className="py-2 pr-3">หมวดหมู่</th>
              <th className="py-2 pr-3">สถานะ</th>
              <th className="py-2 pr-3">อัปเดตล่าสุด</th>
              <th className="py-2">การทำงาน</th>
            </tr>
          </thead>
          <tbody>

            {list.map(a => (
              <tr key={a._id} className="border-t">
                <td className="py-2 pr-3">
                  <div className="font-medium">{a.title}</div>
                  {a.publishedAt && <div className="text-xs text-gray-500">เริ่มเผยแพร่: {fmtDateTime(a.publishedAt)}</div>}
                </td>
                <td className="py-2 pr-3"><span className="badge blue">{a.category}</span></td>
                <td className="py-2 pr-3">
                  {(() => { const s = statusInfo(a); return <span className={`badge ${s.color}`}>{s.label}</span> })()}
                </td>
                <td className="py-2 pr-3 text-xs text-gray-600">
                  {a.updatedAt ? fmtDateTime(a.updatedAt) : '-'}
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <button className="admin-btn admin-btn--outline" aria-label="แก้ไขประกาศ" onClick={() => setEditing(a)}>
                      ✏️ <span>แก้ไข</span>
                    </button>
                    <button className="admin-btn admin-btn--outline" aria-label="ลบประกาศ" onClick={() => remove(a._id)}>
                      🗑️ <span>ลบ</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-gray-500">ยังไม่มีประกาศ</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button className="admin-btn admin-btn--outline" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>ก่อนหน้า</button>
          <div>หน้า {page} / {totalPages}</div>
          <button className="admin-btn admin-btn--outline" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>ถัดไป</button>
        </div>
      )}
      {editing && (
        <EditAnnouncementModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onEditSaved() }} />
      )}
    </div>
  )
}

function EditAnnouncementModal({ initial, onClose, onSaved }: { initial: Announcement; onClose: () => void; onSaved: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="card max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="card-header flex justify-between items-center shrink-0">
          <span>แก้ไขประกาศ</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-4 overflow-y-auto">
          <AnnouncementForm initialData={initial} onCreated={() => { onSaved(); onClose() }} onCancel={onClose} />
        </div>
      </div>
    </div>
  )
}

function ActivitiesList({ list, page, totalPages, onPageChange, onEditSaved, onDeleted }: { list: Activity[]; page: number; totalPages: number; onPageChange: (p: number) => void; onEditSaved: () => void; onDeleted: () => void }) {
  const { getToken } = useAuth()
  const [editing, setEditing] = useState<Activity | null>(null)
  const remove = async (id?: string) => {
    if (!id) return
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: 'ยืนยันการลบกิจกรรมนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    })
    if (!result.isConfirmed) return
    const r = await fetch(`/api/activities/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } })
    if (r.ok) onDeleted()
  }
  return (
    <div className="mt-8">
      <div className="font-semibold mb-3">รายการกิจกรรม</div>
      <div className="grid md:grid-cols-2 gap-3">
        {list.map(a => {
          const first = a.images && a.images[0]
          const src = typeof first === 'string' ? first : first?.url
          return (
            <div key={a._id} className="card overflow-hidden">
              <div className="card-body flex flex-col gap-3 sm:flex-row">
                <img
                  src={src ? `${src}${src.includes('?') ? '&' : '?'}w=400` : '/favicon.png'}
                  loading="lazy"
                  decoding="async"
                  width={288}
                  height={192}
                  className="h-48 w-full rounded-lg object-cover sm:h-24 sm:w-40"
                  alt={a.title ? `ภาพกิจกรรม: ${a.title}` : 'ภาพกิจกรรม'}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold flex flex-wrap items-center gap-2">
                    <div className="truncate max-w-[60vw] sm:max-w-[240px]">{a.title}</div>
                    {(() => { const s = statusInfo(a); return <span className={`badge ${s.color} shrink-0`}>{s.label}</span> })()}
                  </div>
                  <div className="mt-1 text-sm text-gray-600 line-clamp-3 sm:line-clamp-2">{stripHtml(a.description)}</div>
                  {a.publishedAt && <div className="text-xs text-gray-500 mt-2">เริ่มเผยแพร่: {fmtDateTime(a.publishedAt)}</div>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="admin-btn admin-btn--outline" aria-label="แก้ไขกิจกรรม" onClick={() => setEditing(a)}>
                      ✏️ <span>แก้ไข</span>
                    </button>
                    <button className="admin-btn admin-btn--outline" aria-label="ลบกิจกรรม" onClick={() => remove(a._id)}>
                      🗑️ <span>ลบ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {list.length === 0 && <div className="text-gray-500">ยังไม่มีกิจกรรม</div>}
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button className="admin-btn admin-btn--outline" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>ก่อนหน้า</button>
          <div>หน้า {page} / {totalPages}</div>
          <button className="admin-btn admin-btn--outline" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>ถัดไป</button>
        </div>
      )}
      {editing && (
        <EditActivityModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onEditSaved() }} />
      )}
    </div>
  )
}

function EditActivityModal({ initial, onClose, onSaved }: { initial: Activity; onClose: () => void; onSaved: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="card-header flex justify-between items-center shrink-0">
          <span>แก้ไขกิจกรรม</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-4 overflow-y-auto">
          <ActivityForm initialData={initial} onCreated={() => { onSaved(); onClose() }} onCancel={onClose} />
        </div>
      </div>
    </div>
  )
}

function UnitsList({ list, page, totalPages, onPageChange, onEditSaved, onDeleted }: { list: Unit[]; page: number; totalPages: number; onPageChange: (p: number) => void; onEditSaved: () => Promise<void>; onDeleted: () => Promise<void> }) {
  const { getToken } = useAuth()
  const [editing, setEditing] = useState<Unit | null>(null)

  const remove = async (id?: string) => {
    if (!id) return
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: 'ยืนยันการลบหน่วยงานนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    })
    if (!result.isConfirmed) return
    const r = await fetch(`/api/units/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } })
    if (r.ok) onDeleted()
  }

  return (
    <div className="mt-8">
      <div className="font-semibold mb-3 text-lg">รายการลิงก์หน่วยงาน</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(u => (
          <div key={u._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="font-bold text-slate-800 text-lg truncate pr-2">{u.name}</div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${u.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {u.isPublished ? 'เผยแพร่' : 'ซ่อน'}
              </span>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-100">
                {u.image?.url ? (
                  <img
                    src={(() => {
                      const url = u.image?.url ?? ''
                      const key = u.image?.publicId ?? u.updatedAt ?? u._id
                      return url + (url.includes('?') ? '&' : '?') + `w=128&_=${encodeURIComponent(String(key))}`
                    })()}
                    className="w-10 h-10 object-contain"
                    alt={u.name}
                  />
                ) : (
                  <i className="fa-solid fa-building text-slate-300 text-xl" />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div className="text-sm text-slate-500 truncate">
                  <span className="font-medium text-slate-400 mr-1">ลิงก์:</span>
                  <a href={u.href} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{u.href || '-'}</a>
                </div>
                <div className="text-sm text-slate-500">
                  <span className="font-medium text-slate-400 mr-1">ลำดับ:</span>
                  {u.order}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditing(u)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors font-medium text-sm"
              >
                <i className="fa-solid fa-pen text-xs" /> แก้ไข
              </button>
              <button
                onClick={() => remove(u._id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-red-600 hover:border-red-200 transition-colors font-medium text-sm"
              >
                <i className="fa-solid fa-trash text-xs" /> ลบ
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="col-span-full text-gray-500 text-center py-8">ยังไม่มีหน่วยงาน</div>}
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button className="admin-btn admin-btn--outline" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>ก่อนหน้า</button>
          <div>หน้า {page} / {totalPages}</div>
          <button className="admin-btn admin-btn--outline" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>ถัดไป</button>
        </div>
      )}
      {editing && (
        <EditUnitModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onEditSaved() }} />
      )}
    </div>
  )
}

function EditUnitModal({ initial, onClose, onSaved }: { initial: Unit; onClose: () => void; onSaved: () => void }) {
  const { getToken, refreshToken } = useAuth()
  const [form, setForm] = useState<Unit>({ ...initial })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)


  const onUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      let r = await fetch('/api/uploads/image', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })

      if (r.status === 401) {
        const refreshSuccess = await refreshToken()
        if (refreshSuccess) {
          r = await fetch('/api/uploads/image', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })
        }
      }

      if (!r.ok) throw new Error('upload failed')
      const data = await r.json()
      setForm(f => ({ ...f, image: { url: data.url, publicId: data.publicId } }))
    } catch { Swal.fire({ title: 'ข้อผิดพลาด', text: 'อัปโหลดรูปไม่สำเร็จ', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' }) } finally { setUploading(false) }
  }

  const removeImage = async () => {
    const publicId = form.image?.publicId
    if (publicId) {
      fetch(`/api/uploads/image/${encodeURIComponent(publicId)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }).catch(err => console.debug('Failed to delete unit image', err))
    }
    setForm(f => ({ ...f, image: null }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const cleanHref = (form.href || '').trim()
      const hasNewImage = form.image?.url && !form.image.url.startsWith('/api/images/units/')

      let body: FormData | string
      const headers: Record<string, string> = { 'Authorization': `Bearer ${getToken()}` }

      if (hasNewImage && form.image) {
        const fd = new FormData()
        if (form.image.url.startsWith('data:')) {
          const res = await fetch(form.image.url)
          const blob = await res.blob()
          fd.append('image', blob, 'unit.jpg')
        } else {
          // If the image was already uploaded (we have a hosted URL), send it as imageUrl
          fd.append('imageUrl', form.image.url)
        }
        fd.append('name', form.name)
        if (cleanHref) fd.append('href', cleanHref)
        fd.append('order', String(form.order ?? 0))
        fd.append('isPublished', String(form.isPublished ?? true))
        body = fd
      } else {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify({ name: form.name, href: cleanHref || undefined, order: form.order, isPublished: form.isPublished, image: form.image })
      }

      const r = await fetch(`/api/units/${form._id}`, { method: 'PUT', headers, body })
      if (!r.ok) { Swal.fire({ title: 'ข้อผิดพลาด', text: 'บันทึกไม่สำเร็จ', icon: 'error', confirmButtonText: 'ตกลง', confirmButtonColor: '#d33' }); return }
      Swal.fire({
        title: 'สำเร็จ',
        icon: 'success',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#10b981'
      })
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="card max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="card-header shrink-0">{initial._id ? 'แก้ไขหน่วยงาน' : 'สร้างหน่วยงานใหม่'}</div>
        <div className="card-body space-y-3 overflow-y-auto overflow-x-hidden max-w-full p-4">
          <div>
            <label className="block text-sm mb-1">ชื่อหน่วยงาน</label>
            <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">ลิงก์หน่วยงาน</label>
            <input value={form.href || ''} onChange={e => setForm(f => ({ ...f, href: e.target.value }))} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">ลำดับ</label>
            <input type="number" value={form.order ?? 0} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))} className="w-full rounded border px-3 py-2" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.isPublished ?? true} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} />
            <label>เผยแพร่</label>
          </div>
          <div>
            <label className="block text-sm mb-1">รูปภาพ</label>
            {form.image?.url ? (
              <div className="flex items-center gap-3">
                <img src={`${form.image.url}${form.image.url.includes('?') ? '&' : '?'}w=160`} className="h-20 rounded" />
                <button className="admin-btn admin-btn--outline" onClick={removeImage}>ลบรูป</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="admin-btn admin-btn--outline cursor-pointer">
                  อัปโหลด
                  <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
                </label>
                {uploading && <span>กำลังอัปโหลด...</span>}
              </div>
            )}
          </div>
        </div>
        <div className="card-footer flex gap-2 justify-end shrink-0 p-4 border-t">
          <button className="admin-btn admin-btn--outline" onClick={onClose}>ยกเลิก</button>
          <button className="admin-btn" disabled={saving} onClick={save}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </div>
    </div>
  )
}
