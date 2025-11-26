import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import RichTextEditor from '../../components/RichTextEditor'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useHomepageRefresh } from '../../contexts/useHomepageRefresh'
import { compressImage } from '../../utils/imageCompressor'
import ExecutivesManagement, { type ExecutivesManagementHandle } from '../../components/ExecutivesManagement'
import InfographicsManagement, { type InfographicsManagementHandle } from '../../components/InfographicsManagement'
import ItaManagement, { type ItaManagementHandle } from '../../components/ItaManagement'
import AnnouncementForm from '../../components/admin/AnnouncementForm'
import ActivityForm from '../../components/admin/ActivityForm'
import AdminIntroDashboard, { type AdminIntroDashboardHandle } from '../../components/admin/AdminIntroDashboard'
import PopupsManager, { type PopupsManagerHandle } from '../../components/admin/PopupsManager'
import UserManagement, { type UserManagementHandle } from '../../components/admin/UserManagement'

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
  updatedAt?: string
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

type AdminTab = 'intro' | 'popups' | 'overview' | 'announce' | 'activity' | 'slide' | 'unit' | 'executive' | 'infographic' | 'ita' | 'users'

const ADMIN_TABS: readonly AdminTab[] = ['intro', 'popups', 'overview', 'announce', 'activity', 'slide', 'unit', 'executive', 'users', 'ita'] as const

const isAdminTab = (value: string): value is AdminTab => (ADMIN_TABS as readonly string[]).includes(value)


// Shared editor toolbar configuration
// ----------------------------------------------------------------------------
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
}
const quillFormats = ['header', 'bold', 'italic', 'underline', 'list', 'link']

// Helpers
// ----------------------------------------------------------------------------
const stripHtml = (s?: string) => (s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

const toDateTimeLocalValue = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromDateTimeLocalValue = (v: string) => {
  const s = (v || '').trim()
  if (!s) return undefined
  const d = new Date(s)
  if (isNaN(d.getTime())) return undefined
  return d.toISOString()
}
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
  const { getToken, hasPermission } = useAuth()
  const [tab, setTab] = useState<AdminTab>('intro')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [annCount, setAnnCount] = useState(0)
  const [actCount, setActCount] = useState(0)
  const [slideCount, setSlideCount] = useState(0)
  const [unitCount, setUnitCount] = useState(0)
  const [annList, setAnnList] = useState<Announcement[]>([])
  const [actList, setActList] = useState<Activity[]>([])
  const [slideList, setSlideList] = useState<SlideItem[]>([])
  const [unitList, setUnitList] = useState<Unit[]>([])
  const [creatingSlide, setCreatingSlide] = useState(false)
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [showUnitForm, setShowUnitForm] = useState(false)

  const permissions = useMemo(() => ({
    popups: hasPermission('popups'),
    announcements: hasPermission('announcements'),
    activities: hasPermission('activities'),
    slides: hasPermission('slides'),
    units: hasPermission('units'),
    executives: hasPermission('executives'),
    infographics: hasPermission('infographics'),
    ita: hasPermission('ita'),
    users: hasPermission('users'),
    admin: hasPermission('admin'),
    system: hasPermission('system'),
  }), [hasPermission])

  const allowedTabs = useMemo<Record<AdminTab, boolean>>(() => {
    const hasAnyContentPermission = permissions.popups
      || permissions.announcements
      || permissions.activities
      || permissions.slides
      || permissions.units
      || permissions.executives
      || permissions.infographics
      || permissions.ita
      || permissions.users

    return {
      intro: true,
      popups: permissions.popups,
      overview: Boolean(hasAnyContentPermission || permissions.admin),
      announce: permissions.announcements,
      activity: permissions.activities,
      slide: permissions.slides,
      unit: permissions.units,
      executive: permissions.executives,
      infographic: permissions.infographics,
      ita: permissions.ita,
      users: permissions.users,
    }
  }, [permissions])

  useEffect(() => {
    if (allowedTabs[tab]) return
    const preferredOrder: AdminTab[] = ['intro', 'overview', 'popups', 'announce', 'activity', 'slide', 'unit', 'executive', 'infographic', 'users', 'ita']
    const nextTab = preferredOrder.find(key => allowedTabs[key]) || 'intro'
    if (nextTab !== tab) {
      setTab(nextTab)
    }
  }, [allowedTabs, tab])

  const canManageAnnouncements = allowedTabs.announce
  const canManageActivities = allowedTabs.activity
  const canManageSlides = allowedTabs.slide
  const canManageUnits = allowedTabs.unit
  const canManageUsers = allowedTabs.users

  // Simple per-tab search query
  const [query, setQuery] = useState<{ announce: string; activity: string; slide: string; unit: string }>({ announce: '', activity: '', slide: '', unit: '' })

  // Status filters
  const [status] = useState<{ announce: 'all' | 'published' | 'hidden' | 'scheduled'; activity: 'all' | 'published' | 'hidden' | 'scheduled'; slide: 'all' | 'published' | 'hidden' }>({ announce: 'all', activity: 'all', slide: 'all' })

  const { showToast } = useToast()
  const { triggerRefresh } = useHomepageRefresh()

  // Refs for component methods
  const introRef = useRef<AdminIntroDashboardHandle>(null)
  const popupsRef = useRef<PopupsManagerHandle>(null)
  const executivesRef = useRef<ExecutivesManagementHandle | null>(null)
  const infographicsRef = useRef<InfographicsManagementHandle | null>(null)
  const itaRef = useRef<ItaManagementHandle | null>(null)
  const usersRef = useRef<UserManagementHandle>(null)

  const refreshAnn = useCallback(async () => {
    if (!permissions.announcements) {
      setAnnList([])
      setAnnCount(0)
      return
    }
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const response = await fetch('/api/announcements?published=false', { headers })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json() as Announcement[]
      setAnnList(data)
      setAnnCount(data.length)
    } catch (error) {
      console.error('Failed to load announcements', error)
      setAnnList([])
      setAnnCount(0)
    }
  }, [getToken, permissions.announcements])

  const refreshAct = useCallback(async () => {
    if (!permissions.activities) {
      setActList([])
      setActCount(0)
      return
    }
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const response = await fetch('/api/activities?published=false', { headers })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json() as Activity[]
      setActList(data)
      setActCount(data.length)
    } catch (error) {
      console.error('Failed to load activities', error)
      setActList([])
      setActCount(0)
    }
  }, [getToken, permissions.activities])

  const refreshSlides = useCallback(async () => {
    if (!permissions.slides) {
      setSlideList([])
      setSlideCount(0)
      return
    }
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const response = await fetch('/api/slides?published=false', { headers })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setSlideList(data)
      setSlideCount(Array.isArray(data) ? data.length : 0)
    } catch (error) {
      console.error('Failed to load slides', error)
      setSlideList([])
      setSlideCount(0)
    }
  }, [getToken, permissions.slides])

  const refreshUnits = useCallback(async () => {
    if (!permissions.units) {
      setUnitList([])
      setUnitCount(0)
      return
    }
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const response = await fetch('/api/units?published=false', { headers })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json() as Unit[]
      setUnitList(data)
      setUnitCount(data.length)
    } catch (error) {
      console.error('Failed to load units', error)
      setUnitList([])
      setUnitCount(0)
    }
  }, [getToken, permissions.units])

  useEffect(() => {
    refreshAnn()
    refreshAct()
    refreshSlides()
    refreshUnits()
  }, [refreshAnn, refreshAct, refreshSlides, refreshUnits])

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
  const annFiltered = useMemo(() => {
    const q = query.announce.trim().toLowerCase()
    let arr = annList
    if (q) {
      arr = arr.filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.category || '').toLowerCase().includes(q) ||
        (a.content || '').toLowerCase().includes(q)
      )
    }
    const now = Date.now()
    if (status.announce === 'published') arr = arr.filter(a => (a.isPublished && (!a.publishedAt || new Date(String(a.publishedAt)).getTime() <= now)))
    else if (status.announce === 'hidden') arr = arr.filter(a => !a.isPublished)
    else if (status.announce === 'scheduled') arr = arr.filter(a => a.isPublished && a.publishedAt && new Date(String(a.publishedAt)).getTime() > now)
    return arr
  }, [annList, query.announce, status.announce])
  const actFiltered = useMemo(() => {
    const q = query.activity.trim().toLowerCase()
    let arr = actList
    if (q) {
      arr = arr.filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      )
    }
    const now = Date.now()
    if (status.activity === 'published') arr = arr.filter(a => (a.isPublished && (!a.publishedAt || new Date(String(a.publishedAt)).getTime() <= now)))
    else if (status.activity === 'hidden') arr = arr.filter(a => !a.isPublished)
    else if (status.activity === 'scheduled') arr = arr.filter(a => a.isPublished && a.publishedAt && new Date(String(a.publishedAt)).getTime() > now)
    return arr
  }, [actList, query.activity, status.activity])
  const slideFiltered = useMemo(() => {
    const q = query.slide.trim().toLowerCase()
    let arr = slideList
    if (q) {
      arr = arr.filter(s =>
        (s?.title || '').toLowerCase().includes(q) ||
        (s?.caption || '').toLowerCase().includes(q) ||
        (s?.href || s?.url || s?.link || '').toLowerCase().includes(q)
      )
    }
    if (status.slide === 'published') arr = arr.filter(s => Boolean(s?.isPublished))
    else if (status.slide === 'hidden') arr = arr.filter(s => !s?.isPublished)
    return arr
  }, [slideList, query.slide, status.slide])
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-50">
      {/* Dashboard Layout */}
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-50 lg:flex">
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
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
              >
                <span className="text-xl">📊</span>
                <span>Infographic</span>
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
          </nav>

          {/* Sidebar Footer */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
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
        <div className="flex-1 flex flex-col min-h-0">
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
                    {tab === 'ita' && 'จัดการ ITA'}
                    {tab === 'users' && 'จัดการผู้ใช้'}
                  </h1>
                  <p className="text-gray-600 text-sm mt-1 hidden sm:block">
                    {tab === 'intro' && 'ข้อมูลสรุปการเข้าเว็บไซต์และผู้ใช้ล่าสุด'}
                    {tab === 'popups' && 'ตั้งค่าป๊อปอัปหน้าแรกและรูปภาพที่แสดง'}
                    {tab === 'overview' && 'ข้อมูลสรุปและสถิติของระบบ'}
                    {tab === 'announce' && 'จัดการประกาศและข่าวสาร'}
                    {tab === 'activity' && 'จัดการกิจกรรมและรูปภาพ'}
                    {tab === 'slide' && 'จัดการสไลด์แสดงผล'}
                    {tab === 'unit' && 'จัดการลิงก์หน่วยงาน'}
                    {tab === 'executive' && 'จัดการข้อมูลผู้บริหาร'}
                    {tab === 'infographic' && 'จัดการรูปภาพ Infographic แบบเรียงกัน'}
                    {tab === 'ita' && 'จัดการข้อมูล ITA'}
                    {tab === 'users' && 'เพิ่ม แก้ไข ลบผู้ใช้ และกำหนดสิทธิ์การเข้าถึง'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-4">
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
                        introTask.then(() => showToast('โหลดข้อมูล Intro Page เสร็จสิ้น', undefined, 'success', 2000))
                      } else {
                        showToast('โหลดข้อมูล Intro Page เสร็จสิ้น', undefined, 'success', 2000)
                      }
                    } else if (tab === 'popups') {
                      const popupTask = popupsRef.current?.refresh()
                      if (popupTask) {
                        popupTask.then(() => showToast('โหลดข้อมูลป๊อปอัปหน้าแรกเสร็จสิ้น', undefined, 'success', 2000))
                      } else {
                        showToast('โหลดข้อมูลป๊อปอัปหน้าแรกเสร็จสิ้น', undefined, 'success', 2000)
                      }
                    } else if (tab === 'announce') refreshAnn().then(() => showToast('โหลดข้อมูลประกาศเสร็จสิ้น', undefined, 'success', 2000));
                    else if (tab === 'activity') refreshAct().then(() => showToast('โหลดข้อมูลกิจกรรมเสร็จสิ้น', undefined, 'success', 2000));
                    else if (tab === 'slide') refreshSlides().then(() => showToast('โหลดข้อมูลสไลด์เสร็จสิ้น', undefined, 'success', 2000));
                    else if (tab === 'unit') refreshUnits().then(() => showToast('โหลดข้อมูลหน่วยงานเสร็จสิ้น', undefined, 'success', 2000));
                    else if (tab === 'executive') executivesRef.current?.refreshExecutives().then(() => showToast('โหลดข้อมูลผู้บริหารเสร็จสิ้น', undefined, 'success', 2000));
                    else if (tab === 'ita') itaRef.current?.refreshIta().then(() => showToast('โหลดข้อมูล ITA เสร็จสิ้น', undefined, 'success', 2000));
                    else if (tab === 'users') {
                      const userTask = usersRef.current?.refresh()
                      if (userTask) {
                        userTask.then(() => showToast('โหลดข้อมูลผู้ใช้เสร็จสิ้น', undefined, 'success', 2000))
                      } else {
                        showToast('โหลดข้อมูลผู้ใช้เสร็จสิ้น', undefined, 'success', 2000)
                      }
                    }
                    else refreshAnn().then(() => showToast('โหลดข้อมูลเสร็จสิ้น', undefined, 'success', 2000)); // Default
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
            {tab === 'intro' ? (
              <div className="space-y-6 lg:space-y-8">
                <AdminIntroDashboard ref={introRef} />
              </div>
            ) : tab === 'popups' ? (
              <div className="space-y-6 lg:space-y-8">
                <PopupsManager ref={popupsRef} />
              </div>
            ) : tab === 'overview' ? (
              <div className="space-y-4 lg:space-y-6">
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
                    <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-100">
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
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
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
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
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

                  {!canManageAnnouncements && !canManageActivities && !canManageSlides && !canManageUnits && (
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
                        {actList.slice(0, 3).map((activity, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                              <span className="text-sm">📸</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{activity.title}</div>
                              <div className="text-xs text-gray-500">
                                {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('th-TH') : 'ไม่ระบุวันที่'}
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
                        {annList.slice(0, 3).map((announcement, index) => (
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

                  {!canManageActivities && !canManageAnnouncements && (
                    <div className="col-span-full bg-white rounded-2xl p-6 text-center text-gray-500 border border-dashed border-gray-200">
                      ยังไม่มีสิทธิ์ดูบันทึกล่าสุดในส่วนนี้
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-lg lg:text-xl">⚡</span>
                    การดำเนินการด่วน
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    {canManageAnnouncements && (
                      <button
                        onClick={() => {
                          setTab('announce')
                          setSidebarOpen(false)
                          setShowAnnouncementForm(true)
                          setShowActivityForm(false)
                          setShowUnitForm(false)
                        }}
                        className="flex flex-col items-center gap-2 p-3 lg:p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group"
                      >
                        <div className="inline-flex h-8 lg:h-10 w-8 lg:w-10 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                          <span className="text-sm lg:text-base">📝</span>
                        </div>
                        <span className="text-xs lg:text-sm font-medium text-gray-700 text-center">เพิ่มประกาศ</span>
                      </button>
                    )}

                    {canManageActivities && (
                      <button
                        onClick={() => {
                          setTab('activity')
                          setSidebarOpen(false)
                          setShowActivityForm(true)
                          setShowAnnouncementForm(false)
                          setShowUnitForm(false)
                        }}
                        className="flex flex-col items-center gap-2 p-3 lg:p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors group"
                      >
                        <div className="inline-flex h-8 lg:h-10 w-8 lg:w-10 items-center justify-center rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                          <span className="text-sm lg:text-base">📸</span>
                        </div>
                        <span className="text-xs lg:text-sm font-medium text-gray-700 text-center">เพิ่มกิจกรรม</span>
                      </button>
                    )}

                    {canManageSlides && (
                      <button
                        onClick={() => { setTab('slide'); setSidebarOpen(false) }}
                        className="flex flex-col items-center gap-2 p-3 lg:p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors group"
                      >
                        <div className="inline-flex h-8 lg:h-10 w-8 lg:w-10 items-center justify-center rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                          <span className="text-sm lg:text-base">🖼️</span>
                        </div>
                        <span className="text-xs lg:text-sm font-medium text-gray-700 text-center">เพิ่มสไลด์</span>
                      </button>
                    )}

                    {canManageUnits && (
                      <button
                        onClick={() => {
                          setTab('unit')
                          setSidebarOpen(false)
                          setShowUnitForm(true)
                          setShowAnnouncementForm(false)
                          setShowActivityForm(false)
                        }}
                        className="flex flex-col items-center gap-2 p-3 lg:p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors group"
                      >
                        <div className="inline-flex h-8 lg:h-10 w-8 lg:w-10 items-center justify-center rounded-lg bg-orange-100 group-hover:bg-orange-200 transition-colors">
                          <span className="text-sm lg:text-base">🏢</span>
                        </div>
                        <span className="text-xs lg:text-sm font-medium text-gray-700 text-center">เพิ่มหน่วยงาน</span>
                      </button>
                    )}

                    {canManageUsers && (
                      <button
                        onClick={() => { setTab('users'); setSidebarOpen(false) }}
                        className="flex flex-col items-center gap-2 p-3 lg:p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors group"
                      >
                        <div className="inline-flex h-8 lg:h-10 w-8 lg:w-10 items-center justify-center rounded-lg bg-indigo-100 group-hover:bg-indigo-200 transition-colors">
                          <span className="text-sm lg:text-base">👥</span>
                        </div>
                        <span className="text-xs lg:text-sm font-medium text-gray-700 text-center">จัดการผู้ใช้</span>
                      </button>
                    )}

                    {!canManageAnnouncements && !canManageActivities && !canManageSlides && !canManageUnits && !canManageUsers && (
                      <div className="col-span-full text-center text-gray-500 bg-white border border-dashed border-gray-200 rounded-xl py-6">
                        ยังไม่มีสิทธิ์ดำเนินการด่วนในส่วนนี้
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : tab === 'users' ? (
              <div className="space-y-6">
                <UserManagement ref={usersRef} />
              </div>
            ) : tab === 'announce' ? (
              <div className="space-y-4 lg:space-y-6">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAnnouncementForm(prev => !prev)}
                    className="admin-btn"
                  >
                    <span>{showAnnouncementForm ? '✕' : '+'}</span>
                    {showAnnouncementForm ? 'ปิดฟอร์มเพิ่มประกาศ' : 'เพิ่มประกาศใหม่'}
                  </button>
                </div>
                {showAnnouncementForm && (
                  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                        <h3 className="text-lg font-bold text-gray-900">เพิ่มประกาศใหม่</h3>
                        <button
                          onClick={() => setShowAnnouncementForm(false)}
                          className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="p-4">
                        <AnnouncementForm
                          onCreated={() => {
                            refreshAnn()
                            triggerRefresh()
                            showToast('บันทึกประกาศสำเร็จ', undefined, 'success', 3000)
                            setShowAnnouncementForm(false)
                          }}
                          onCancel={() => setShowAnnouncementForm(false)}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-4">
                    <select
                      value={status.announce}
                      onChange={() => setQuery(q => ({ ...q, announce: '' }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="all">ทั้งหมด</option>
                      <option value="published">เผยแพร่แล้ว</option>
                      <option value="hidden">ซ่อนอยู่</option>
                      <option value="scheduled">ตั้งเวลาเผยแพร่</option>
                    </select>
                    <span className="text-sm text-gray-600">พบ {annFiltered.length} รายการ</span>
                  </div>
                  <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-blue-400">🔍</span>
                    </div>
                    <input
                      className="w-full rounded-xl border-2 border-blue-100 bg-blue-50/50 pl-12 pr-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-300 transition-all duration-200"
                      placeholder="ค้นหาประกาศ..."
                      value={query.announce}
                      onChange={(e) => setQuery(q => ({ ...q, announce: e.target.value }))}
                    />
                  </div>
                </div>
                <AnnouncementsList list={annFiltered} onEditSaved={async () => { await refreshAnn(); triggerRefresh(); showToast('แก้ไขประกาศสำเร็จ', undefined, 'success', 3000) }} onDeleted={async () => { await refreshAnn(); triggerRefresh(); showToast('ลบประกาศสำเร็จ', undefined, 'success', 3000) }} />
              </div>
            ) : tab === 'activity' ? (
              <div className="space-y-4 lg:space-y-6">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowActivityForm(prev => !prev)}
                    className="admin-btn"
                  >
                    <span>{showActivityForm ? '✕' : '+'}</span>
                    {showActivityForm ? 'ปิดฟอร์มเพิ่มกิจกรรม' : 'เพิ่มกิจกรรมใหม่'}
                  </button>
                </div>
                {showActivityForm && (
                  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                        <h3 className="text-lg font-bold text-gray-900">เพิ่มกิจกรรมใหม่</h3>
                        <button
                          onClick={() => setShowActivityForm(false)}
                          className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="p-4">
                        <ActivityForm
                          onCreated={() => {
                            refreshAct()
                            triggerRefresh()
                            showToast('บันทึกกิจกรรมสำเร็จ', undefined, 'success', 3000)
                            setShowActivityForm(false)
                          }}
                          onCancel={() => setShowActivityForm(false)}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-4">
                    <select
                      value={status.activity}
                      onChange={() => setQuery(q => ({ ...q, activity: '' }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="all">ทั้งหมด</option>
                      <option value="published">เผยแพร่แล้ว</option>
                      <option value="hidden">ซ่อนอยู่</option>
                      <option value="scheduled">ตั้งเวลาเผยแพร่</option>
                    </select>
                    <span className="text-sm text-gray-600">พบ {actFiltered.length} รายการ</span>
                  </div>
                  <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-emerald-400">🔍</span>
                    </div>
                    <input
                      className="w-full rounded-xl border-2 border-emerald-100 bg-emerald-50/50 pl-12 pr-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-emerald-200 focus:border-emerald-300 transition-all duration-200"
                      placeholder="ค้นหากิจกรรม..."
                      value={query.activity}
                      onChange={(e) => setQuery(q => ({ ...q, activity: e.target.value }))}
                    />
                  </div>
                </div>
                <ActivitiesList list={actFiltered} onEditSaved={async () => { await refreshAct(); triggerRefresh(); showToast('แก้ไขกิจกรรมสำเร็จ', undefined, 'success', 3000) }} onDeleted={async () => { await refreshAct(); triggerRefresh(); showToast('ลบกิจกรรมสำเร็จ', undefined, 'success', 3000) }} />
              </div>
            ) : tab === 'slide' ? (
              <div className="space-y-4 lg:space-y-6">
                {creatingSlide && <SlidesForm onCreated={() => { setCreatingSlide(false); refreshSlides(); triggerRefresh(); showToast('บันทึกสไลด์สำเร็จ', undefined, 'success', 3000) }} onCancel={() => setCreatingSlide(false)} />}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-4">
                    <select
                      value={status.slide}
                      onChange={() => setQuery(q => ({ ...q, slide: '' }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    >
                      <option value="all">ทั้งหมด</option>
                      <option value="published">เผยแพร่แล้ว</option>
                      <option value="hidden">ซ่อนอยู่</option>
                    </select>
                    <span className="text-sm text-gray-600">พบ {slideFiltered.length} รายการ</span>
                  </div>
                  <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-purple-400">🔍</span>
                    </div>
                    <input
                      className="w-full rounded-xl border-2 border-purple-100 bg-purple-50/50 pl-12 pr-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-300 transition-all duration-200"
                      placeholder="ค้นหาสไลด์..."
                      value={query.slide}
                      onChange={(e) => setQuery(q => ({ ...q, slide: e.target.value }))}
                    />
                  </div>
                </div>
                <SlidesList list={slideFiltered} onEditSaved={() => { refreshSlides(); triggerRefresh(); showToast('แก้ไขสไลด์สำเร็จ', undefined, 'success', 3000) }} onDeleted={() => { refreshSlides(); triggerRefresh(); showToast('ลบสไลด์สำเร็จ', undefined, 'success', 3000) }} onCreate={() => setCreatingSlide(true)} />
              </div>
            ) : tab === 'unit' ? (
              <div className="space-y-4 lg:space-y-6">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowUnitForm(prev => !prev)}
                    className="admin-btn"
                  >
                    <span>{showUnitForm ? '✕' : '+'}</span>
                    {showUnitForm ? 'ปิดฟอร์มเพิ่มหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}
                  </button>
                </div>
                {showUnitForm ? (
                  <UnitsForm
                    onCreated={async () => {
                      await refreshUnits()
                      triggerRefresh()
                      showToast('บันทึกลิงก์หน่วยงานสำเร็จ', undefined, 'success', 3000)
                      setShowUnitForm(false)
                    }}
                    onCancel={() => setShowUnitForm(false)}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/60 px-4 py-6 text-center text-sm text-orange-700">
                    กดปุ่ม "เพิ่มหน่วยงานใหม่" เพื่อเปิดฟอร์มเพิ่มลิงก์หน่วยงาน
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">พบ {unitList.length} รายการ</span>
                  </div>
                  <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-orange-400">🔍</span>
                    </div>
                    <input
                      className="w-full rounded-xl border-2 border-orange-100 bg-orange-50/50 pl-12 pr-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-orange-200 focus:border-orange-300 transition-all duration-200"
                      placeholder="ค้นหาหน่วยงาน..."
                      value={query.unit}
                      onChange={(e) => setQuery(q => ({ ...q, unit: e.target.value }))}
                    />
                  </div>
                </div>
                <UnitsList list={unitList.filter(u => { const q = (query.unit || '').toLowerCase(); if (!q) return true; return (u.name || '').toLowerCase().includes(q) || (u.href || '').toLowerCase().includes(q) })} onEditSaved={async () => { await refreshUnits(); triggerRefresh(); showToast('แก้ไขลิงก์หน่วยงานสำเร็จ', undefined, 'success', 3000) }} onDeleted={async () => { await refreshUnits(); triggerRefresh(); showToast('ลบลิงก์หน่วยงานสำเร็จ', undefined, 'success', 3000) }} />
              </div>
            ) : tab === 'executive' ? (
              <div className="space-y-4 lg:space-y-6">
                <ExecutivesManagement ref={executivesRef} />
              </div>
            ) : tab === 'infographic' ? (
              <div className="space-y-4 lg:space-y-6">
                <InfographicsManagement ref={infographicsRef} />
              </div>
            ) : tab === 'ita' ? (
              <div className="space-y-4 lg:space-y-6">
                <ItaManagement ref={itaRef} />
              </div>
            ) : null}
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
    } catch { alert('อัปโหลดรูปไม่สำเร็จ') } finally { setUploading(false) }
  }

  const applyImageUrl = () => {
    const u = imageUrl.trim()
    if (!u) { setImage(null); return }
    try { const parsed = new URL(u); if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad') } catch { alert('URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)'); return }
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
        // ถ้ารูปเป็น URL ภายนอก ส่ง URL ไปให้ backend ดาวน์โหลด
        if (image.url.startsWith('http://') || image.url.startsWith('https://')) {
          fd.append('imageUrl', image.url)
        }
        // ถ้าเป็น data URL (จาก file input) แปลงเป็น blob
        else if (image.url.startsWith('data:')) {
          const dataUrlToBlob = (dataUrl: string): Blob => {
            // Convert base64 data URLs locally to satisfy strict CSP policies
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
          try {
            const blob = dataUrlToBlob(image.url)
            const fileName = image.publicId ? `unit-${image.publicId}.jpg` : 'unit.jpg'
            fd.append('image', blob, fileName)
          } catch (err) {
            console.error('Failed to convert image:', err)
            alert('ไม่สามารถประมวลผลรูปภาพได้')
            return
          }
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
        alert(msg)
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
            <img src={image.url} loading="lazy" decoding="async" width={160} height={64} className="h-16 object-contain" />
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

function UnitsList({ list, onEditSaved, onDeleted }: { list: Unit[]; onEditSaved: () => Promise<void>; onDeleted: () => Promise<void> }) {
  const { getToken } = useAuth()
  const [editing, setEditing] = useState<Unit | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 12
  const pageCount = Math.max(1, Math.ceil((list?.length || 0) / perPage))
  const paged = useMemo(() => {
    const start = (page - 1) * perPage
    return list.slice(start, start + perPage)
  }, [list, page])
  useEffect(() => {
    const pc = Math.max(1, Math.ceil((list?.length || 0) / perPage))
    setPage(p => Math.min(Math.max(1, p), pc))
  }, [list?.length])
  const remove = async (id?: string) => {
    if (!id) return
    if (!confirm('ยืนยันการลบลิงก์หน่วยงานนี้?')) return
    const r = await fetch(`/api/units/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } })
    if (r.ok) onDeleted()
  }
  return (
    <div className="mt-8">
      <div className="font-semibold mb-3">รายการลิงก์หน่วยงาน</div>
      <div className="grid md:grid-cols-3 gap-3">
        {paged.map(u => (
          <div key={u._id} className="card">
            <div className="card-body flex gap-3 items-center">
              {u.image?.url ? (
                <img src={u.image.url} loading="lazy" decoding="async" width={48} height={48} className="h-12 w-12 object-contain rounded" alt={u.name} />
              ) : (
                <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center text-gray-500"><i className="fa-solid fa-building" /></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate flex items-center gap-2">
                  <span className="truncate">{u.name}</span>
                  <span className={`badge ${u.isPublished ? 'green' : 'gray'}`}>{u.isPublished ? 'เผยแพร่' : 'ซ่อน'}</span>
                </div>
                {u.href && (
                  <div className="text-xs mt-1 truncate">
                    <span className="text-gray-500">ลิงก์:</span>{' '}
                    <a href={u.href} target={/^https?:\/\//i.test(String(u.href)) ? '_blank' : undefined} rel={/^https?:\/\//i.test(String(u.href)) ? 'noopener noreferrer' : undefined} className="text-blue-700 hover:underline">{u.href}</a>
                  </div>
                )}
                <div className="text-xs text-gray-500">ลำดับ: {u.order ?? 0}</div>
                <div className="mt-2 flex gap-2">
                  <button className="admin-btn admin-btn--outline" aria-label="แก้ไขหน่วยงาน" onClick={() => setEditing(u)}>
                    ✏️ <span>แก้ไข</span>
                  </button>
                  <button className="admin-btn admin-btn--outline" aria-label="ลบหน่วยงาน" onClick={() => remove(u._id)}>
                    🗑️ <span>ลบ</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="text-gray-500">ยังไม่มีลิงก์หน่วยงาน</div>}
      </div>
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button className="admin-btn admin-btn--outline" aria-label="หน้าก่อนหน้า" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>ก่อนหน้า</button>
          <div>หน้า {page} / {pageCount}</div>
          <button className="admin-btn admin-btn--outline" aria-label="หน้าถัดไป" disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>ถัดไป</button>
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
  const [imageUrl, setImageUrl] = useState<string>(initial?.image?.url || '')

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
      setForm(f => ({ ...f, image: { url: data.url, publicId: data.publicId } }))
    } catch { alert('อัปโหลดรูปไม่สำเร็จ') } finally { setUploading(false) }
  }

  const save = async () => {
    setSaving(true)
    try {
      const cleanHref = (form.href || '').trim()

      // ตรวจสอบว่ามีรูปใหม่หรือไม่ (รูปที่ไม่ได้เป็น URL จาก /api/images/units/)
      const hasNewImage = form.image?.url && !form.image.url.startsWith('/api/images/units/')

      let body: FormData | string
      const headers: Record<string, string> = { 'Authorization': `Bearer ${getToken()}` }

      if (hasNewImage && form.image) {
        // ส่ง FormData พร้อมไฟล์ใหม่
        const fd = new FormData()

        // ถ้ารูปเป็น HTTP/HTTPS URL ส่ง URL ไปให้ backend ดาวน์โหลด
        if (form.image.url.startsWith('http://') || form.image.url.startsWith('https://')) {
          fd.append('imageUrl', form.image.url)
        }
        // ถ้าเป็น data URL แปลงเป็น blob
        else if (form.image.url.startsWith('data:')) {
          try {
            const imgResponse = await fetch(form.image.url)
            const blob = await imgResponse.blob()
            const fileName = form.image.publicId ? `unit-${form.image.publicId}.jpg` : 'unit.jpg'
            fd.append('image', blob, fileName)
          } catch (err) {
            console.error('Failed to convert image:', err)
            alert('ไม่สามารถประมวลผลรูปภาพได้')
            return
          }
        }

        fd.append('name', form.name || '')
        if (cleanHref) fd.append('href', cleanHref)
        fd.append('order', String(form.order ?? 0))
        fd.append('isPublished', String(form.isPublished ?? true))
        body = fd
      } else {
        // ส่ง JSON (ไม่มีรูปใหม่)
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify({ name: form.name, href: cleanHref || undefined, order: form.order, isPublished: form.isPublished })
      }

      const r = await fetch(`/api/units/${form._id}`, { method: 'PUT', headers, body })
      if (!r.ok) { alert('บันทึกไม่สำเร็จ'); return }
      onSaved()
    } finally { setSaving(false) }
  }

  const removeImage = async () => {
    const publicId = form.image?.publicId
    if (publicId) {
      fetch(`/api/uploads/image/${encodeURIComponent(publicId)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }).catch(err => console.debug('Failed to delete unit image', err))
    }
    setForm(f => ({ ...f, image: null }))
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">แก้ไขลิงก์หน่วยงาน</div>
          <button className="admin-btn admin-btn--outline" onClick={onClose}>ปิด</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm mb-1">ชื่อหน่วยงาน</label>
            <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">ลิงก์หน่วยงาน</label>
            <input value={form.href || ''} onChange={e => setForm(f => ({ ...f, href: e.target.value }))} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text_sm mb-1">โลโก้</label>
            {form.image?.url ? (
              <div className="flex items-center gap-3">
                <img src={form.image.url} loading="lazy" decoding="async" width={160} height={64} className="h-16 object-contain" />
                <button className="admin-btn admin-btn--outline" onClick={removeImage}>ลบรูป</button>
              </div>
            ) : (
              <label className="admin-btn admin-btn--outline cursor-pointer">
                อัปโหลดรูปโลโก้
                <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
              </label>
            )}
            {uploading && <div className="text-sm text-gray-600 mt-1">กำลังอัปโหลด...</div>}
            <div className="mt-3 grid md:grid-cols-[1fr_auto] gap-2">
              <input
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="หรือวาง URL รูปภาพภายนอก เช่น https://example.com/logo.png"
                className="w-full rounded border px-3 py-2"
                inputMode="url"
              />
              <button
                type="button"
                className="admin-btn admin-btn--outline"
                onClick={() => {
                  const u = imageUrl.trim()
                  if (!u) { setForm(f => ({ ...f, image: null })); return }
                  try { const parsed = new URL(u); if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad') } catch { alert('URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)'); return }
                  setForm(f => ({ ...f, image: { url: u } }))
                }}
              >ใช้ URL</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">ลำดับ</label>
              <input type="number" value={form.order ?? 0} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))} className="w-full rounded border px-3 py-2" />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} /> เผยแพร่</label>
            </div>
          </div>
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button className="admin-btn admin-btn--outline" onClick={onClose}>ยกเลิก</button>
          <button className="admin-btn" onClick={save} disabled={saving}>
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
    } catch { alert('อัปโหลดรูปไม่สำเร็จ') } finally { setUploading(false) }
  }

  const applyImageUrl = () => {
    const u = imageUrl.trim()
    if (!u) { setImage(null); return }
    try { const parsed = new URL(u); if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad') } catch { alert('URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)'); return }
    // Allow any valid URL
    try { new URL(u) } catch { alert('URL ไม่ถูกต้อง'); return }
    setImage({ url: u })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!image) { alert('กรุณาอัปโหลดรูปสไลด์'); return }
    if (isPublished && !alt.trim()) { alert('กรุณากรอกข้อความคำอธิบายรูป (alt) เมื่อเผยแพร่สไลด์'); return }
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
        alert(msg)
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
            <img src={image.url} loading="lazy" decoding="async" width={200} height={120} className="h-24 rounded" />
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

function SlidesList({ list, onEditSaved, onDeleted, onCreate }: { list: SlideItem[]; onEditSaved: () => void; onDeleted: () => void; onCreate: () => void }) {
  const { getToken } = useAuth()
  const [editing, setEditing] = useState<SlideItem | null>(null)
  const [draggingId, setDraggingId] = useState<string | number | null>(null)
  const [local, setLocal] = useState<SlideItem[]>(list)
  useEffect(() => { setLocal(list) }, [list])
  const [page, setPage] = useState(1)
  const perPage = 10
  const pageCount = Math.max(1, Math.ceil((list?.length || 0) / perPage))
  const paged = useMemo(() => {
    const start = (page - 1) * perPage
    return local.slice(start, start + perPage)
  }, [local, page])
  useEffect(() => {
    const pc = Math.max(1, Math.ceil((list?.length || 0) / perPage))
    setPage(p => Math.min(Math.max(1, p), pc))
  }, [list?.length])
  const remove = async (id?: string | number) => {
    if (id === undefined || id === null) return
    if (!confirm('ยืนยันการลบสไลด์นี้?')) return
    const idStr = String(id)
    const r = await fetch(`/api/slides/${encodeURIComponent(idStr)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } })
    if (r.ok) {
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
        {paged.map((s, index) => {
          const identifier = String(s._id ?? s.id ?? `temp-${index}`)
          return (
            <div key={identifier} className="card" draggable onDragStart={() => onDragStart(identifier)} onDragOver={(e) => onDragOver(e, identifier)} onDragEnd={onDragEnd}>
              <div className="card-body flex gap-3">
                <img src={`${s?.image?.url}?t=${Date.now()}`} loading="lazy" decoding="async" width={96} height={64} className="h-16 w-24 object-cover rounded" alt={s?.title ? `ภาพสไลด์: ${s.title}` : 'ภาพสไลด์'} />
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
        {list.length === 0 && <div className="text-gray-500">ยังไม่มีสไลด์</div>}
      </div>
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button className="admin-btn admin-btn--outline" aria-label="หน้าก่อนหน้า" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>ก่อนหน้า</button>
          <div>หน้า {page} / {pageCount}</div>
          <button className="admin-btn admin-btn--outline" aria-label="หน้าถัดไป" disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>ถัดไป</button>
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
    } catch { alert('อัปโหลดรูปไม่สำเร็จ') } finally { setUploading(false) }
  }

  const save = async () => {
    if ((form.isPublished ?? true) && !String(form.alt || '').trim()) { alert('กรุณากรอกข้อความคำอธิบายรูป (alt) เมื่อเผยแพร่สไลด์'); return }
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
        if (!imageUrl) { alert('ไม่พบข้อมูลรูปภาพใหม่ กรุณาลองอีกครั้ง'); return }
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
        alert(msg)
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="card max-w-3xl w-full">
        <div className="card-header">{initial._id ? 'แก้ไขสไลด์' : 'สร้างสไลด์ใหม่'}</div>
        <div className="card-body space-y-3">
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
                <img src={form.image.url} loading="lazy" decoding="async" width={240} height={160} className="h-28 rounded" />
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
                      try { const parsed = new URL(u); if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad') } catch { alert('URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)'); return }
                      try { new URL(u) } catch { alert('URL ไม่ถูกต้อง'); return }
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
        <div className="card-footer flex gap-2 justify-end">
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

function AnnouncementsList({ list, onEditSaved, onDeleted }: { list: Announcement[]; onEditSaved: () => void; onDeleted: () => void }) {
  const { getToken } = useAuth()
  const [editing, setEditing] = useState<Announcement | null>(null)
  const sorted = useMemo(() => [...list], [list])
  const [page, setPage] = useState(1)
  const perPage = 10
  const pageCount = Math.max(1, Math.ceil((sorted.length || 0) / perPage))
  const paged = useMemo(() => {
    const start = (page - 1) * perPage
    return sorted.slice(start, start + perPage)
  }, [sorted, page])
  useEffect(() => {
    const pc = Math.max(1, Math.ceil((sorted.length || 0) / perPage))
    setPage(p => Math.min(Math.max(1, p), pc))
  }, [sorted.length])
  const remove = async (id?: string) => {
    if (!id) return
    if (!confirm('ยืนยันการลบประกาศนี้?')) return
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
            {paged.map(a => (
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
            {sorted.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-gray-500">ยังไม่มีประกาศ</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button className="admin-btn admin-btn--outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>ก่อนหน้า</button>
          <div>หน้า {page} / {pageCount}</div>
          <button className="admin-btn admin-btn--outline" disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>ถัดไป</button>
        </div>
      )}
      {editing && (
        <EditAnnouncementModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onEditSaved() }} />
      )}
    </div>
  )
}

function EditAnnouncementModal({ initial, onClose, onSaved }: { initial: Announcement; onClose: () => void; onSaved: () => void }) {
  const { getToken } = useAuth()
  const [form, setForm] = useState<Announcement>({ ...initial, attachments: initial.attachments || [] })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const onUploadImage = async (file: File) => {
    setUploading(true)
    try {
      // Compress รูปภาพก่อนอัปโหลด (max 1200px, quality 0.7)
      const compressed = await compressImage(file, 1200, 0.7)
      const fd = new FormData(); fd.append('file', compressed)
      // If editing an existing announcement, upload directly to attachment endpoint
      if (initial && initial._id) {
        const r = await fetch(`/api/announcements/${initial._id}/attachment`, { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })
        if (!r.ok) throw new Error('upload failed')
        const data = await r.json() as { id: number; url: string; name?: string; bytes?: number; kind?: string }
        setForm(f => ({ ...f, attachments: [...(f.attachments || []), { url: data.url, publicId: String(data.id), kind: 'image', name: data.name, bytes: data.bytes }] }))
      } else {
        const r = await fetch('/api/uploads/image', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })
        if (!r.ok) throw new Error('upload failed')
        const data = await r.json() as { url: string; publicId?: string; name?: string; bytes?: number }
        setForm(f => ({ ...f, attachments: [...(f.attachments || []), { url: data.url, publicId: data.publicId, kind: 'image', name: data.name, bytes: data.bytes }] }))
      }
    } catch (err) {
      console.error('Upload image error:', err)
      alert('อัปโหลดรูปไม่สำเร็จ')
    } finally { setUploading(false) }
  }
  const onUploadFile = async (file: File) => {
    const fd = new FormData(); fd.append('file', file); setUploading(true)
    try {
      if (initial && initial._id) {
        const r = await fetch(`/api/announcements/${initial._id}/attachment`, { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })
        if (!r.ok) throw new Error('upload failed')
        const data = await r.json() as { id: number; url: string; name?: string; bytes?: number; kind?: string }
        const kind = data.kind === 'pdf' || (data.name || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'file'
        setForm(f => ({ ...f, attachments: [...(f.attachments || []), { url: data.url, publicId: String(data.id), kind, name: data.name, bytes: data.bytes }] }))
      } else {
        const r = await fetch('/api/uploads/file', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })
        if (!r.ok) throw new Error('upload failed')
        const data = await r.json() as { url: string; publicId?: string; name?: string; bytes?: number }
        const kind = (data.name || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'file'
        setForm(f => ({ ...f, attachments: [...(f.attachments || []), { url: data.url, publicId: data.publicId, kind, name: data.name, bytes: data.bytes }] }))
      }
    } catch { alert('อัปโหลดไฟล์ไม่สำเร็จ') } finally { setUploading(false) }
  }
  const removeAttachmentAt = async (idx: number) => {
    const attachments = form.attachments ?? []
    const target = attachments[idx]
    const next = attachments.filter((_, index) => index !== idx)
    setForm(f => ({ ...f, attachments: next }))
    if (target?.publicId) {
      fetch(`/api/uploads/image/${encodeURIComponent(target.publicId)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }).catch(err => console.debug('Failed to delete attachment', err))
    }
  }
  const save = async () => {
    if (!initial._id) return
    setLoading(true)
    try {
      const payload: Partial<Announcement> = { ...form }
      if (!form.publishedAt) delete payload.publishedAt
      const r = await fetch(`/api/announcements/${initial._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(payload) })
      if (r.ok) onSaved()
    } finally { setLoading(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="card max-w-3xl w-full">
        <div className="card-header">แก้ไขประกาศ</div>
        <div className="card-body space-y-3">
          <div>
            <label className="block text-sm mb-1">หัวข้อ</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">หมวดหมู่</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Announcement['category'] }))} className="w-full rounded border px-3 py-2">
              <option>สมัครงาน</option>
              <option>ประชาสัมพันธ์</option>
              <option>ประกาศ</option>
              <option>ประกาศจัดซื้อจัดจ้าง</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">เนื้อหา</label>
            <div className="rounded border">
              <RichTextEditor
                className="[&_.ql-container]:!h-auto [&_.ql-editor]:!min-h-[120px] [&_.ql-editor]:!max-h-[250px] [&_.ql-editor]:!overflow-y-auto"
                value={form.content || ''}
                onChange={(html) => setForm(f => ({ ...f, content: html }))}
                modules={quillModules}
                formats={quillFormats}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">ไฟล์แนบ (รูป/เอกสาร)</label>
            <div className="flex flex-wrap gap-2">
              <label className="admin-btn admin-btn--outline cursor-pointer">
                อัปโหลดรูป
                <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) onUploadImage(f) }} />
              </label>
              <label className="admin-btn admin-btn--outline cursor-pointer">
                อัปโหลดไฟล์ (PDF/อื่นๆ)
                <input type="file" className="hidden" accept="application/pdf,application/*" onChange={e => { const f = e.target.files?.[0]; if (f) onUploadFile(f) }} />
              </label>
              {uploading && <span className="self-center text-sm text-gray-600">กำลังอัปโหลด...</span>}
            </div>
            {form.attachments && form.attachments.length > 0 && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {form.attachments.map((att, i) => (
                  <div key={i} className="border rounded p-2 flex items-center gap-3">
                    {att.kind === 'image' ? (
                      <img src={att.url} loading="lazy" decoding="async" width={96} height={64} className="h-16 w-24 object-cover rounded" />
                    ) : (
                      <i className="fa-regular fa-file-pdf text-red-600 text-2xl" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm">{att.name || att.url}</div>
                      <a href={att.url} target="_blank" className="text-green-700 text-xs hover:underline">เปิดดู</a>
                    </div>
                    <button type="button" className="admin-btn admin-btn--outline" onClick={() => removeAttachmentAt(i)}>ลบ</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished ?? true} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} /> เผยแพร่</label>
            <div>
              <label className="block text-sm mb-1">ตั้งเวลาเผยแพร่</label>
              <input type="datetime-local" value={toDateTimeLocalValue(form.publishedAt || undefined)} onChange={e => setForm(f => ({ ...f, publishedAt: fromDateTimeLocalValue(e.target.value) || null }))} className="w-full rounded border px-3 py-2" />
              <p className="mt-1 text-xs text-gray-600">ถ้ากำหนดเป็นอนาคต ระบบจะเผยแพร่เมื่อถึงเวลานั้น</p>
            </div>
          </div>
        </div>
        <div className="card-footer flex gap-2 justify-end">
          <button className="admin-btn admin-btn--outline" onClick={onClose}>ยกเลิก</button>
          <button disabled={loading} className="admin-btn" onClick={save}>
            {loading ? (
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

function ActivitiesList({ list, onEditSaved, onDeleted }: { list: Activity[]; onEditSaved: () => void; onDeleted: () => void }) {
  const { getToken } = useAuth()
  const [editing, setEditing] = useState<Activity | null>(null)
  const sorted = useMemo(() => [...list], [list])
  const [page, setPage] = useState(1)
  const perPage = 10
  const pageCount = Math.max(1, Math.ceil((sorted.length || 0) / perPage))
  const paged = useMemo(() => {
    const start = (page - 1) * perPage
    return sorted.slice(start, start + perPage)
  }, [sorted, page])
  useEffect(() => {
    const pc = Math.max(1, Math.ceil((sorted.length || 0) / perPage))
    setPage(p => Math.min(Math.max(1, p), pc))
  }, [sorted.length])
  const remove = async (id?: string) => {
    if (!id) return
    if (!confirm('ยืนยันการลบกิจกรรมนี้?')) return
    const r = await fetch(`/api/activities/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } })
    if (r.ok) onDeleted()
  }
  return (
    <div className="mt-8">
      <div className="font-semibold mb-3">รายการกิจกรรม</div>
      <div className="grid md:grid-cols-2 gap-3">
        {paged.map(a => {
          const first = a.images && a.images[0]
          const src = typeof first === 'string' ? first : first?.url
          return (
            <div key={a._id} className="card">
              <div className="card-body flex flex-col gap-3 sm:flex-row">
                <img
                  src={src || 'https://images.unsplash.com/photo-1584982751630-89b231fda6b1?q=80&w=400&auto=format&fit=crop'}
                  loading="lazy"
                  decoding="async"
                  width={288}
                  height={192}
                  className="h-48 w-full rounded-lg object-cover sm:h-24 sm:w-40"
                  alt={a.title ? `ภาพกิจกรรม: ${a.title}` : 'ภาพกิจกรรม'}
                />
                <div className="flex-1">
                  <div className="font-semibold flex flex-wrap items-center gap-2">
                    <span className="truncate max-w-full sm:max-w-[240px]">{a.title}</span>
                    {(() => { const s = statusInfo(a); return <span className={`badge ${s.color}`}>{s.label}</span> })()}
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
        {sorted.length === 0 && <div className="text-gray-500">ยังไม่มีกิจกรรม</div>}
      </div>
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button className="admin-btn admin-btn--outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>ก่อนหน้า</button>
          <div>หน้า {page} / {pageCount}</div>
          <button className="admin-btn admin-btn--outline" disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>ถัดไป</button>
        </div>
      )}
      {editing && (
        <EditActivityModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onEditSaved() }} />
      )}
    </div>
  )
}

function EditActivityModal({ initial, onClose, onSaved }: { initial: Activity; onClose: () => void; onSaved: () => void }) {
  const { getToken, refreshToken } = useAuth()
  const [form, setForm] = useState<Activity>({ ...initial })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const onUploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files || [])
    if (!arr.length) return
    setUploading(true)
    try {
      for (const file of arr) {
        const fd = new FormData(); fd.append('file', file)
        const r = await fetch('/api/uploads/image', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd })
        if (!r.ok) throw new Error('upload failed')
        const data = await r.json() as { url: string; publicId?: string }
        setForm(f => ({ ...f, images: [...(f.images || []), { url: data.url, publicId: data.publicId }] }))
      }
    } catch { alert('อัปโหลดรูปไม่สำเร็จ') } finally { setUploading(false) }
  }
  const removeImageAt = async (idx: number) => {
    const images = form.images ?? []
    const target = images[idx]
    const next = images.filter((_, index) => index !== idx)
    setForm(f => ({ ...f, images: next }))
    if (typeof target !== 'string' && target?.publicId) {
      fetch(`/api/uploads/image/${encodeURIComponent(target.publicId)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } }).catch(err => console.debug('Failed to delete activity image', err))
    }
  }
  const save = async () => {
    if (!initial._id) return
    setSaving(true)
    try {
      // ส่งข้อมูลทั้งหมดรวมถึง images ที่แก้ไขแล้ว
      const dataToUpdate: Partial<Activity> = { ...form }
      // delete dataToUpdate.images
      let r = await fetch(`/api/activities/${initial._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(dataToUpdate)
      })

      // If unauthorized, try to refresh token and retry
      if (r.status === 401) {
        const refreshSuccess = await refreshToken()
        if (refreshSuccess) {
          r = await fetch(`/api/activities/${initial._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify(dataToUpdate)
          })
        }
      }

      if (r.ok) onSaved()
      else alert('บันทึกไม่สำเร็จ')
    } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="card max-w-4xl w-full">
        <div className="card-header">แก้ไขกิจกรรม</div>
        <div className="card-body space-y-3">
          <div>
            <label className="block text-sm mb-1">ชื่อกิจกรรม</label>
            <input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">รายละเอียด</label>
            <div className="rounded border">
              <RichTextEditor
                className="[&_.ql-container]:!h-auto [&_.ql-editor]:!min-h-[120px] [&_.ql-editor]:!max-h-[250px] [&_.ql-editor]:!overflow-y-auto"
                value={form.description || ''}
                onChange={(html) => setForm(f => ({ ...f, description: html }))}
                modules={quillModules}
                formats={quillFormats}
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublished ?? true}
                onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-sm">เผยแพร่กิจกรรมนี้ (แสดงในหน้าหลัก)</span>
            </label>
            <p className="mt-1 text-xs text-gray-600 ml-6">
              {form.isPublished ? '✅ กิจกรรมนี้จะแสดงในหน้าหลัก' : '🔒 กิจกรรมนี้ถูกซ่อน (เฉพาะแอดมินเห็น)'}
            </p>
          </div>
          <div>
            <label className="block text-sm mb-1">รูปภาพ</label>
            <div className="flex flex-wrap gap-2">
              <label className="admin-btn admin-btn--outline cursor-pointer">
                อัปโหลดไฟล์
                <input type="file" className="hidden" accept="image/*" multiple onChange={e => { const fs = e.target.files; if (fs && fs.length) onUploadFiles(fs) }} />
              </label>
              {uploading && <span className="text-sm text-gray-600 self-center">กำลังอัปโหลด...</span>}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              แนะนำ (หน้าหลัก): อัตราส่วน 4:3 เช่น 1200x900px เพื่อให้แสดงพอดีในการ์ดพรีวิว ควรเป็น JPG/PNG และขนาดไฟล์ &lt; 1MB ต่อรูป
            </p>
            {form.images && form.images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {form.images.map((img, i) => {
                  const src = typeof img === 'string' ? img : img.url
                  return (
                    <div key={i} className="relative">
                      <img src={src} loading="lazy" decoding="async" width={320} height={160} className="h-24 w-full object-cover rounded" />
                      <button type="button" onClick={() => removeImageAt(i)} className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded">ลบ</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <div className="card-footer flex gap-2 justify-end">
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
