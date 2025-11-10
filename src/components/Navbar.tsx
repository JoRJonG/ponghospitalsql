import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext.tsx'
import '@fortawesome/fontawesome-free/css/all.min.css'
import logo from '../assets/logo-150x150.png'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded hover:bg-green-50 ${isActive ? 'text-green-700 font-semibold' : 'text-gray-700'}`

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const doLogout = () => { logout(); setOpen(false); navigate('/') }
  // ITA dynamic menu
  type ItaItem = { _id: number; title: string; slug?: string | null; children?: ItaItem[] }
  const [itaRoots, setItaRoots] = useState<ItaItem[]>([])
  const [itaOpen, setItaOpen] = useState(false)
  const [mobileItaOpen, setMobileItaOpen] = useState(false)
  const itaTimer = useRef<any>(null)
  useEffect(() => {
    fetch('/api/ita/tree').then(r=>r.json()).then((d) => {
      if (Array.isArray(d)) {
        // ใช้เฉพาะเมนูระดับบน
        setItaRoots(d)
      }
    }).catch(()=>{})
  }, [])
  const openIta = () => { clearTimeout(itaTimer.current); setItaOpen(true) }
  const closeItaLater = () => { clearTimeout(itaTimer.current); itaTimer.current = setTimeout(()=>setItaOpen(false), 180) }
  const goItaAnchor = (id: number) => {
    setItaOpen(false)
    // เปลี่ยนพฤติกรรม: ทุกเมนูเปิดหน้าเฉพาะของตัวเอง
    navigate(`/ita/item/${id}`)
  }
  return (
    <header className="border-b border-gray-200 bg-white/85 sticky top-0 z-40 backdrop-blur">
      <div className="container-narrow flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logo}
            alt="Pong Hospital logo"
            className="h-10 w-10 rounded"
            loading="eager"
          />
          <span className="font-bold text-lg text-gray-800">โรงพยาบาลปง</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" className={navItemClass} end>หน้าหลัก</NavLink>
          <NavLink to="/announcements" className={navItemClass}>ประกาศ</NavLink>
          <NavLink to="/executives" className={navItemClass}>ผู้บริหาร</NavLink>
          <div className="relative" onMouseEnter={openIta} onMouseLeave={closeItaLater}>
            <NavLink to="/ita" className={navItemClass} onClick={()=>setItaOpen(o=>!o)}>ITA ▾</NavLink>
            {itaOpen && itaRoots.length > 0 && (
              <div className="absolute left-0 mt-1 w-72 max-h-[70vh] overflow-auto rounded-lg border border-gray-200/80 bg-white/95 shadow-[0_4px_18px_-2px_rgba(0,0,0,0.08)] backdrop-blur-sm p-2 z-50 animate-fade-in">
                <ul className="space-y-1">
                  {itaRoots.map(r => (
                    <li key={r._id} className="group">
                      <button onClick={()=>goItaAnchor(r._id)} className="w-full text-left px-2 py-1 rounded-md hover:bg-green-50/80 text-sm text-gray-700 flex items-center justify-between">
                        <span className="truncate pr-2">{r.title}</span>
                        {r.children && r.children.length > 0 && <i className="fa-solid fa-chevron-right text-[10px] text-gray-400 group-hover:text-green-600 transition-colors" />}
                      </button>
                      {r.children && r.children.length > 0 && (
                        <ul className="ml-2 mt-1 border-l border-dashed border-gray-200 pl-2 space-y-1">
                          {r.children.slice(0,6).map(c => (
                            <li key={c._id}>
                              <button onClick={()=>goItaAnchor(c._id)} className="w-full text-left px-2 py-0.5 rounded hover:bg-green-50/70 text-[12.5px] text-gray-600 flex items-center gap-1 truncate" title={c.title}>
                                <i className="fa-regular fa-circle text-[6px] text-gray-400" />
                                <span className="truncate">{c.title}</span>
                              </button>
                            </li>
                          ))}
                          {r.children.length > 6 && (
                            <li><span className="text-[11px] text-gray-400 px-2 italic">+ {r.children.length-6} รายการ</span></li>
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
          <div className="ml-1 flex items-center gap-1">
          </div>
          <span className="mx-1" />
          {isAuthenticated && (
            <>
              <NavLink to="/admin" className={navItemClass} end><i className="fa-solid fa-user-tie mr-1" />ระบบจัดการ</NavLink>
              <NavLink to="/admin/settings" className={navItemClass}><i className="fa-solid fa-gear mr-1" /> ตั้งค่า</NavLink>
              <button onClick={doLogout} className="px-3 py-2 rounded text-gray-700 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600" aria-label="ออกจากระบบ">
                <i className="fa-solid fa-right-from-bracket mr-1" /> ออกจากระบบ
              </button>
            </>
          )}
          {!isAuthenticated && null}
        </nav>
        <button className="md:hidden p-2 text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600" aria-label={open? 'ปิดเมนู':'เปิดเมนู'} onClick={() => setOpen(o=>!o)}>
          <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-bars'} text-xl`} />
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="container-narrow py-2 flex flex-col">
            <NavLink to="/" className={navItemClass} end onClick={()=>setOpen(false)}>หน้าหลัก</NavLink>
            <NavLink to="/announcements" className={navItemClass} onClick={()=>setOpen(false)}>ประกาศ</NavLink>
            <NavLink to="/executives" className={navItemClass} onClick={()=>setOpen(false)}>ผู้บริหาร</NavLink>
            <div>
              <button
                type="button"
                onClick={()=>setMobileItaOpen(o=>!o)}
                className={`w-full text-left ${navItemClass({ isActive: location.pathname.startsWith('/ita') })} flex items-center justify-between`}
                aria-expanded={mobileItaOpen}
              >
                <span>ITA</span>
                <i className={`fa-solid fa-chevron-${mobileItaOpen? 'up':'down'} text-xs ml-2`} />
              </button>
              {mobileItaOpen && itaRoots.length > 0 && (
                <ul className="mt-1 mb-2 ml-3 border-l border-gray-200 pl-3 space-y-1">
                  {itaRoots.map(r => (
                    <li key={r._id}>
                      <button
                        onClick={()=>{ navigate(`/ita/item/${r._id}`); setOpen(false); setMobileItaOpen(false) }}
                        className="w-full text-left text-sm px-2 py-1 rounded hover:bg-green-50 text-gray-700 truncate"
                      >{r.title}</button>
                      {r.children && r.children.length>0 && (
                        <ul className="mt-1 ml-2 border-l border-dashed border-gray-200 pl-2 space-y-0.5">
                          {r.children.slice(0,6).map(c => (
                            <li key={c._id}>
                              <button
                                onClick={()=>{ navigate(`/ita/item/${c._id}`); setOpen(false); setMobileItaOpen(false) }}
                                className="w-full text-left text-[12.5px] px-2 py-0.5 rounded hover:bg-green-50 text-gray-600 truncate"
                                title={c.title}
                              >{c.title}</button>
                            </li>
                          ))}
                          {r.children.length>6 && <li><span className="text-[11px] text-gray-400 italic px-2">+ {r.children.length-6} รายการ</span></li>}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <NavLink to="/about" className={navItemClass} onClick={()=>setOpen(false)}>เกี่ยวกับเรา</NavLink>
            <NavLink to="/contact" className={navItemClass} onClick={()=>setOpen(false)}>ติดต่อเรา</NavLink>
            <div className="mt-2 flex items-center gap-2">
            </div>
            {isAuthenticated && (
              <>
                <NavLink to="/admin" className={navItemClass} end onClick={()=>setOpen(false)}><i className="fa-solid fa-user-tie mr-1" />ระบบจัดการ</NavLink>
                <NavLink to="/admin/settings" className={navItemClass} onClick={()=>setOpen(false)}><i className="fa-solid fa-gear mr-1" /> ตั้งค่า</NavLink>
                <button className="text-left px-3 py-2 rounded text-gray-700 hover:bg-red-50 hover:text-red-700" onClick={doLogout}>
                  <i className="fa-solid fa-right-from-bracket mr-1" /> ออกจากระบบ
                </button>
              </>
            )}
            {!isAuthenticated && null}
          </div>
        </div>
      )}
    </header>
  )
}
