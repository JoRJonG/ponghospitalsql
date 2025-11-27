import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'
import '@fortawesome/fontawesome-free/css/all.min.css'
import logo from '../assets/logo-150x150.png'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 text-base font-medium transition-colors ${isActive ? 'text-teal-700' : 'text-slate-700 hover:text-teal-600'}`

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { isAuthenticated, logout, hasPermission } = useAuth()
  const canAccessSettings = hasPermission('system')
  const settingsLabel = canAccessSettings ? 'ตั้งค่า' : 'บัญชี'
  const navigate = useNavigate()
  const doLogout = () => { logout(); setOpen(false); navigate('/') }

  // Check for new announcements (within 3 days)
  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false)

  useEffect(() => {
    const checkNewAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements')
        if (response.ok) {
          const data = await response.json()
          // API returns array directly
          if (Array.isArray(data) && data.length > 0) {
            // Check for new announcements in any category
            const hasNew = data.some(announcement => {
              if (!announcement.publishedAt) return false
              // Strict check: must be published and not in the future
              if (announcement.isPublished === false) return false

              const publishedDate = new Date(announcement.publishedAt)
              if (Number.isNaN(publishedDate.getTime())) return false

              const now = new Date()
              // If published date is in the future, it's not "new" yet (it's scheduled)
              if (publishedDate.getTime() > now.getTime()) return false

              const diffTime = now.getTime() - publishedDate.getTime()
              // Only consider announcements within the last 3 days
              const threeDaysMs = 3 * 24 * 60 * 60 * 1000
              return diffTime >= 0 && diffTime < threeDaysMs
            })
            setHasNewAnnouncements(hasNew)
          }
        }
      } catch (error) {
        console.warn('Failed to check for new announcements:', error)
      }
    }

    checkNewAnnouncements()
  }, [])

  // ITA dynamic menu
  type ItaItem = { _id: number; title: string; slug?: string | null; children?: ItaItem[] }
  const [itaRoots, setItaRoots] = useState<ItaItem[]>([])
  const [itaOpen, setItaOpen] = useState(false)
  const [mobileItaOpen, setMobileItaOpen] = useState(false)
  const itaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const ac = new AbortController()
    fetch('/api/ita/tree', { signal: ac.signal })
      .then((response) => response.json())
      .then((d: unknown) => {
        if (Array.isArray(d)) {
          // ใช้เฉพาะเมนูระดับบน
          setItaRoots(d as ItaItem[])
        }
      })
      .catch((thrown: unknown) => {
        if (thrown instanceof DOMException && thrown.name === 'AbortError') return
        console.error('Failed to load ITA tree', thrown)
      })
    return () => ac.abort()
  }, [])
  const openIta = () => {
    if (itaTimer.current) clearTimeout(itaTimer.current)
    itaTimer.current = null
    setItaOpen(true)
  }
  const closeItaLater = () => {
    if (itaTimer.current) clearTimeout(itaTimer.current)
    itaTimer.current = setTimeout(() => setItaOpen(false), 180)
  }
  const goItaAnchor = (id: number) => {
    setItaOpen(false)
    // เปลี่ยนพฤติกรรม: ทุกเมนูเปิดหน้าเฉพาะของตัวเอง
    navigate(`/ita/item/${id}`)
  }
  return (
    <div>
      {/* Top Bar */}
      <div className="bg-teal-900 text-white text-sm">
        <div className="container-narrow flex items-center h-10">
          <div className="flex items-center gap-6">
            <a href="tel:1669" className="flex items-center gap-2 hover:text-teal-200 transition">
              <i className="fa-solid fa-truck-medical" />
              <span>ฉุกเฉิน 1669</span>
            </a>
            <span className="text-teal-400">|</span>
            <a href="tel:054497030" className="flex items-center gap-2 hover:text-teal-200 transition">
              <i className="fa-solid fa-phone" />
              <span>สายด่วน รพ. 054-497030</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="container-narrow flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="Pong Hospital logo"
              className="h-12 w-12 md:h-14 md:w-14 rounded navbar-logo"
              loading="eager"
            />
            <div className="flex flex-col">
              <span className="font-bold text-xl text-teal-800">โรงพยาบาลปง</span>
              <span className="text-xs text-slate-500 -mt-0.5">PONG HOSPITAL, PHAYAO</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={navItemClass} end>หน้าหลัก</NavLink>
            <NavLink to="/announcements" className={({ isActive }) => `${navItemClass({ isActive })} relative`}>
              ประกาศ
              {hasNewAnnouncements && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                  ใหม่
                </span>
              )}
            </NavLink>
            <NavLink to="/executives" className={navItemClass}>ผู้บริหาร</NavLink>
            <div className="relative" onMouseEnter={openIta} onMouseLeave={closeItaLater}>
              <NavLink to="/ita" className={navItemClass} onClick={() => setItaOpen(o => !o)}>ITA ▾</NavLink>
              {itaOpen && itaRoots.length > 0 && (
                <div className="absolute left-0 mt-1 w-72 max-h-[70vh] overflow-auto rounded-lg border border-gray-200/80 bg-white/95 shadow-lg backdrop-blur-sm p-2 z-50 animate-fade-in">
                  <ul className="space-y-1">
                    {itaRoots.map(r => (
                      <li key={r._id} className="group">
                        <button onClick={() => goItaAnchor(r._id)} className="w-full text-left px-2 py-1 rounded-md hover:bg-teal-50 text-sm text-gray-700 flex items-center justify-between">
                          <span className="truncate pr-2">{r.title}</span>
                          {r.children && r.children.length > 0 && <i className="fa-solid fa-chevron-right text-[10px] text-gray-400 group-hover:text-teal-600 transition-colors" />}
                        </button>
                        {r.children && r.children.length > 0 && (
                          <ul className="ml-2 mt-1 border-l border-dashed border-gray-200 pl-2 space-y-1">
                            {r.children.slice(0, 6).map(c => (
                              <li key={c._id}>
                                <button onClick={() => goItaAnchor(c._id)} className="w-full text-left px-2 py-0.5 rounded hover:bg-teal-50 text-[12.5px] text-gray-600 flex items-center gap-1 truncate" title={c.title}>
                                  <i className="fa-regular fa-circle text-[6px] text-gray-400" />
                                  <span className="truncate">{c.title}</span>
                                </button>
                              </li>
                            ))}
                            {r.children.length > 6 && (
                              <li><span className="text-[11px] text-gray-400 px-2 italic">+ {r.children.length - 6} รายการ</span></li>
                            )}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <NavLink to="/about" className={navItemClass}>เกี่ยวกับเรา</NavLink>
            <NavLink to="/contact" className={navItemClass}>ติดต่อเรา</NavLink>
            {isAuthenticated && (
              <>
                <span className="mx-1 text-slate-300">|</span>
                <NavLink to="/admin" className={navItemClass} end><i className="fa-solid fa-user-tie mr-1" />ระบบจัดการ</NavLink>
                <NavLink to="/admin/settings" className={navItemClass}>
                  <i className={`fa-solid ${canAccessSettings ? 'fa-gear' : 'fa-user-gear'} mr-1`} /> {settingsLabel}
                </NavLink>
                <button onClick={doLogout} className="px-3 py-2 rounded text-gray-700 hover:bg-red-50 hover:text-red-700 text-sm" aria-label="ออกจากระบบ">
                  <i className="fa-solid fa-right-from-bracket mr-1" /> ออกจากระบบ
                </button>
              </>
            )}
          </nav>
          <button className="md:hidden p-2 text-gray-700" aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'} onClick={() => setOpen(o => !o)}>
            <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-bars'} text-xl`} />
          </button>
        </div>
      </header>
      {open && (
        <div>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
          <div className="md:hidden fixed inset-x-0 top-20 bottom-0 z-50 overflow-y-auto" onClick={() => setOpen(false)}>
            <div className="bg-white border-t border-gray-200 shadow-md" onClick={(e) => e.stopPropagation()}>
              <div className="container-narrow py-4 flex flex-col">
                <NavLink to="/" className={navItemClass} end onClick={() => setOpen(false)}>หน้าหลัก</NavLink>
                <NavLink to="/announcements" className={({ isActive }) => navItemClass({ isActive })} onClick={() => setOpen(false)}>
                  <div className="flex items-center gap-2">
                    <span>ประกาศ</span>
                    {hasNewAnnouncements && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">ใหม่</span>
                    )}
                  </div>
                </NavLink>
                <div>
                  <button
                    type="button"
                    onClick={() => setMobileItaOpen(o => !o)}
                    className={navItemClass({ isActive: window.location.pathname.startsWith('/ita') }) + ' w-full flex items-center justify-between'}
                    aria-expanded={mobileItaOpen}
                  >
                    <span>ITA</span>
                    <i className={`fa-solid fa-chevron-${mobileItaOpen ? 'up' : 'down'} text-xs ml-2`} />
                  </button>
                  {mobileItaOpen && itaRoots.length > 0 && (
                    <ul className="mt-1 mb-2 ml-3 border-l border-gray-200 pl-3 space-y-1">
                      {itaRoots.map(r => (
                        <li key={r._id}>
                          <button
                            onClick={() => { navigate(`/ita/item/${r._id}`); setOpen(false); setMobileItaOpen(false) }}
                            className="w-full text-left text-sm px-2 py-1 rounded hover:bg-teal-50 text-gray-700 truncate"
                          >{r.title}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <NavLink to="/executives" className={navItemClass} onClick={() => setOpen(false)}>ผู้บริหาร</NavLink>
                <NavLink to="/about" className={navItemClass} onClick={() => setOpen(false)}>เกี่ยวกับเรา</NavLink>
                <NavLink to="/contact" className={navItemClass} onClick={() => setOpen(false)}>ติดต่อเรา</NavLink>
                {isAuthenticated && (
                  <>
                    <div className="border-t border-gray-200 my-2"></div>
                    <NavLink to="/admin" className={navItemClass} end onClick={() => setOpen(false)}><i className="fa-solid fa-user-tie mr-1" />ระบบจัดการ</NavLink>
                    <NavLink to="/admin/settings" className={navItemClass} onClick={() => setOpen(false)}>
                      <i className={`fa-solid ${canAccessSettings ? 'fa-gear' : 'fa-user-gear'} mr-1`} /> {settingsLabel}
                    </NavLink>
                    <button className="text-left px-4 py-2 rounded text-gray-700 hover:bg-red-50 hover:text-red-700 text-sm" onClick={doLogout}>
                      <i className="fa-solid fa-right-from-bracket mr-1" /> ออกจากระบบ
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
