import { useEffect, useState, lazy, Suspense } from 'react'
import { sanitize } from '../utils/sanitize'
import { Link, useParams } from 'react-router-dom'
import { shareItem } from '../utils/share'
import { generateSlug } from '../utils/slugify'
import 'quill/dist/quill.snow.css'
import { fastFetch } from '../utils/fastFetch'
import SEO from '../components/SEO'

const PdfViewer = lazy(() => import('../components/PdfViewer'))

type Attachment = { url: string; publicId?: string; kind?: 'image' | 'pdf' | 'file'; name?: string; bytes?: number }
type Announcement = {
  _id: string
  title: string
  category: 'สมัครงาน' | 'ประชาสัมพันธ์' | 'ประกาศ' | 'ประกาศจัดซื้อจัดจ้าง' | string
  content?: string
  publishedAt?: string
  attachments?: Attachment[]
  viewCount?: number
}

// ===== Download helpers =====
const getNameFromUrl = (url: string): string => {
  try {
    const u = new URL(url, window.location.origin)
    const pathname = u.pathname
    const base = pathname.split('/').pop() || 'attachment'
    return decodeURIComponent(base.split('?')[0].split('#')[0])
  } catch {
    const clean = url.split('?')[0].split('#')[0]
    const base = clean.substring(clean.lastIndexOf('/') + 1) || 'attachment'
    return decodeURIComponent(base)
  }
}

const ensurePdfExt = (name?: string): string => {
  const n = (name && name.trim()) || 'attachment.pdf'
  return /\.pdf$/i.test(n) ? n : `${n}.pdf`
}

const triggerDownload = (blobUrl: string, filename: string) => {
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}

async function downloadFile(url: string, preferredName?: string, forcePdf = false) {
  const fallback = () => {
    const a = document.createElement('a')
    a.href = url
    a.download = forcePdf ? ensurePdfExt(preferredName || getNameFromUrl(url)) : (preferredName || getNameFromUrl(url))
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  try {
    const resp = await fetch(url, { credentials: 'omit' })
    if (!resp.ok) return fallback()
    const ct = resp.headers.get('content-type') || ''
    let blob = await resp.blob()
    if (forcePdf && !/application\/pdf/i.test(ct)) {
      blob = new Blob([blob], { type: 'application/pdf' })
    }
    const blobUrl = URL.createObjectURL(blob)
    let name = preferredName || getNameFromUrl(url)
    if (forcePdf || /application\/pdf/i.test(ct) || /application\/pdf/i.test(blob.type)) {
      name = ensurePdfExt(name)
    }
    triggerDownload(blobUrl, name)
  } catch {
    fallback()
  }
}

// File Category Detector Helper
const getFileTypeInfo = (url: string, name?: string, kind?: string) => {
  const lowerUrl = (url || '').toLowerCase()
  const lowerName = (name || '').toLowerCase()

  const isImg =
    kind === 'image' ||
    /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(lowerUrl) ||
    /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(lowerName)

  const isPdf =
    kind === 'pdf' ||
    /\.pdf(\?.*)?$/i.test(lowerUrl) ||
    /\.pdf$/i.test(lowerName)

  const isWord = /\.(docx?|rtf)(\?.*)?$/i.test(lowerUrl) || /\.(docx?|rtf)$/i.test(lowerName)
  const isExcel = /\.(xlsx?|csv)(\?.*)?$/i.test(lowerUrl) || /\.(xlsx?|csv)$/i.test(lowerName)
  const isPowerpoint = /\.(pptx?)(\?.*)?$/i.test(lowerUrl) || /\.(pptx?)$/i.test(lowerName)
  const isZip = /\.(zip|rar|7z|tar|gz)(\?.*)?$/i.test(lowerUrl) || /\.(zip|rar|7z|tar|gz)$/i.test(lowerName)

  if (isImg) return { type: 'image', label: 'รูปภาพประกอบ', icon: 'fa-solid fa-file-image', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' }
  if (isPdf) return { type: 'pdf', label: 'เอกสาร PDF ทางการ', icon: 'fa-solid fa-file-pdf', color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
  if (isWord) return { type: 'word', label: 'เอกสาร Word', icon: 'fa-solid fa-file-word', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' }
  if (isExcel) return { type: 'excel', label: 'ตารางข้อมูล Excel', icon: 'fa-solid fa-file-excel', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' }
  if (isPowerpoint) return { type: 'powerpoint', label: 'งานนำเสนอ PowerPoint', icon: 'fa-solid fa-file-powerpoint', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' }
  if (isZip) return { type: 'archive', label: 'ไฟล์บีบอัด Zip/Archive', icon: 'fa-solid fa-file-zipper', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' }

  return { type: 'file', label: 'ไฟล์ประกอบ', icon: 'fa-solid fa-file-lines', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' }
}

export default function AnnouncementDetailPage() {
  const { id } = useParams()
  const realId = id?.split('-')[0]
  const [item, setItem] = useState<Announcement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<boolean>(false)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null)
  const [lightboxRotate, setLightboxRotate] = useState<number>(0)
  const [lightboxZoom, setLightboxZoom] = useState<number>(1)

  useEffect(() => {
    if (!realId) return
    setItem(null)
    setError(null)
    fastFetch<Announcement>(`/api/announcements/${realId}`, { ttlMs: 60_000, retries: 1 })
      .then((data) => {
        setItem(data)
        const url = `/api/announcements/${realId}/view`
        const body = ''

        if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
          try {
            navigator.sendBeacon(url, body)
          } catch (err) {
            console.error('sendBeacon failed, falling back to fetch', err)
            fetch(url, { method: 'POST', keepalive: true }).catch((fallbackErr) => {
              console.error('Failed to record announcement view via fetch', fallbackErr)
            })
          }
          return
        }

        fetch(url, { method: 'POST', keepalive: true }).catch((fetchErr) => {
          console.error('Failed to record announcement view', fetchErr)
        })
      })
      .catch((thrown: unknown) => {
        if (thrown instanceof Error) {
          setError(thrown.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลประกาศ')
        } else {
          setError('เกิดข้อผิดพลาดในการโหลดข้อมูลประกาศ')
        }
      })
  }, [realId, id])

  // ESC key for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxImage) {
        setLightboxImage(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxImage])

  const handleCopyLink = () => {
    const idVal = id || (item ? generateSlug(item._id, item.title) : realId)
    const shareUrl = `${window.location.origin}/announcement/${idVal}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const handleShare = () => {
    const img = item?.attachments?.find(att => {
      if (!att?.url) return false
      return /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(att.url) || att.kind === 'image'
    })?.url
    const idVal = id || (item ? generateSlug(item._id, item.title) : realId)
    const previewUrl = `${window.location.origin}/announcement/${idVal}`
    shareItem({ title: item?.title, url: previewUrl, image: img })
  }



  // Category Badge Classes matching AnnouncementsPage
  const getCategoryBadgeClass = (category?: string) => {
    switch (category) {
      case 'ประชาสัมพันธ์':
        return 'bg-purple-100 text-purple-700'
      case 'สมัครงาน':
        return 'bg-emerald-100 text-emerald-700'
      case 'ประกาศจัดซื้อจัดจ้าง':
        return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'ประกาศ':
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="page-wrapper bg-slate-50 min-h-screen pb-16">
      {/* Dynamic SEO Meta */}
      <SEO
        title={item?.title || 'รายละเอียดประกาศ - โรงพยาบาลปง'}
        description={item?.title ? `${item.title} - ข่าวสาร/ประกาศทางการจากโรงพยาบาลปง จังหวัดพะเยา` : 'รายละเอียดข่าวสารและประกาศจากโรงพยาบาลปง จังหวัดพะเยา'}
        image={item?.attachments?.find(att => {
          if (!att?.url) return false
          return /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(att.url) || att.kind === 'image'
        })?.url}
      />

      <div className="container-narrow py-6 md:py-10 max-w-5xl mx-auto px-4">
        {/* Navigation Action Bar removed as requested */}

        {/* Skeleton Loading State */}
        {!item && !error && (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-6 w-24 bg-slate-200 rounded-full" />
              <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
            <div className="h-8 w-3/4 bg-slate-200 rounded-lg" />
            <div className="h-4 w-1/2 bg-slate-200 rounded" />
            <div className="h-64 w-full bg-slate-100 rounded-xl" />
          </div>
        )}

        {/* Error Alert State */}
        {error && (
          <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-sm text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl border border-red-100">
              <i className="fa-solid fa-circle-exclamation" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">ไม่พบประกาศที่คุณต้องการ</h3>
            <p className="text-slate-600 text-sm mb-6 max-w-md mx-auto">{error}</p>
            <Link to="/announcements" className="btn btn-primary bg-[#006241] hover:bg-[#1E3932] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
              ย้อนกลับไปยังหน้าประกาศ
            </Link>
          </div>
        )}

        {/* Official Announcement Header & Content Card */}
        {item && (
          <article className="space-y-6">
            {/* Header Document Banner Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <div className="flex flex-col gap-6">
                {/* Announcement Title */}
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 leading-snug">
                  {item.title}
                </h1>

                {/* Meta & Actions Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 border-t border-slate-100">
                  {/* Category, Date, Views */}
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 font-medium">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${getCategoryBadgeClass(item.category)}`}>
                      {item.category}
                    </span>
                    
                    {item.publishedAt && (
                      <span className="flex items-center gap-2">
                        <i className="fa-regular fa-calendar-days text-slate-400" />
                        {new Date(item.publishedAt).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    )}

                    {item.viewCount !== undefined && (
                      <span className="flex items-center gap-2">
                        <i className="fa-regular fa-eye text-slate-400" />
                        อ่าน {item.viewCount.toLocaleString('th-TH')} ครั้ง
                      </span>
                    )}
                  </div>

                  {/* Share & Copy Actions */}
                  <div className="flex items-center gap-2 print:hidden self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition text-sm font-medium"
                      title="คัดลอกลิงก์ประกาศนี้"
                    >
                      <i className={`fa-solid ${copied ? 'fa-check text-[#006241]' : 'fa-link'}`} />
                      <span className="hidden sm:inline">{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-[#006241] hover:bg-emerald-50 transition text-sm font-medium"
                      title="แชร์ประกาศ"
                    >
                      <i className="fa-solid fa-share-nodes" />
                      <span className="hidden sm:inline">แชร์</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Announcement Content (Quill HTML) - Only render if contains non-empty text */}
            {item.content && item.content.replace(/<[^>]*>/g, '').trim().length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                <div className="ql-snow bg-transparent">
                  <div
                    className="ql-editor max-w-none text-slate-800 p-0 leading-relaxed text-base prose font-sans"
                    dangerouslySetInnerHTML={sanitize(item.content)}
                  />
                </div>
              </div>
            )}

            {/* Official Attachments Section */}
            {item.attachments && item.attachments.length > 0 && (
              <div className="space-y-6">
                {/* Attachment Renderers */}
                {item.attachments.map((att, idx) => {
                    const url = att.url
                    const name = att.name || getNameFromUrl(url)
                    const fileInfo = getFileTypeInfo(url, att.name, att.kind)

                    // 1. IMAGE ATTACHMENTS
                    if (fileInfo.type === 'image') {
                      return (
                        <div key={idx} className="group relative bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 hover:shadow-md transition">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${fileInfo.bg} ${fileInfo.color} font-bold text-sm shrink-0`}>
                                <i className={fileInfo.icon} />
                              </span>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-slate-800 text-sm truncate" title={name}>{name}</h4>
                                <span className="text-[11px] text-slate-500">{fileInfo.label}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setLightboxImage({ url, name })
                                  setLightboxRotate(0)
                                  setLightboxZoom(1)
                                }}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-[#d4e9e2] hover:text-[#006241] transition shadow-2xs flex items-center gap-1.5"
                              >
                                <i className="fa-solid fa-magnifying-glass-plus" />
                                <span>ขยายดูรูป</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => downloadFile(url, name)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#006241] hover:bg-[#1E3932] text-white transition shadow-2xs flex items-center gap-1.5"
                              >
                                <i className="fa-solid fa-download" />
                                <span className="hidden sm:inline">ดาวน์โหลด</span>
                              </button>
                            </div>
                          </div>

                          <div
                            onClick={() => {
                              setLightboxImage({ url, name })
                              setLightboxRotate(0)
                              setLightboxZoom(1)
                            }}
                            className="cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner max-h-[500px] flex items-center justify-center relative group-hover:border-[#006241]/50 transition"
                          >
                            <img
                              src={url}
                              alt={name}
                              className="max-w-full max-h-[500px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                            />
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="bg-[#006241]/90 text-white px-4 py-2 rounded-full text-xs font-semibold backdrop-blur shadow-lg flex items-center gap-2">
                                <i className="fa-solid fa-expand" /> คลิกเพื่อขยายภาพแบบเต็มจอ
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // 2. PDF ATTACHMENTS
                    if (fileInfo.type === 'pdf') {
                      return (
                        <div key={idx} className="w-full">
                          <Suspense
                            fallback={
                              <div className="h-96 bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-600 gap-3 border border-slate-200">
                                <i className="fa-solid fa-spinner fa-spin text-3xl text-[#006241]" />
                                <span className="text-xs font-semibold">กำลังโหลดตัวอ่านเอกสาร PDF...</span>
                              </div>
                            }
                          >
                            <PdfViewer url={url} title={name} bytes={att.bytes} className="w-full rounded-2xl" />
                          </Suspense>
                        </div>
                      )
                    }

                    // 3. OFFICE & OTHER GENERIC FILE ATTACHMENTS (Word, Excel, Zip, etc.)
                    return (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${fileInfo.bg} ${fileInfo.color} font-bold text-xl shrink-0 shadow-2xs`}>
                            <i className={fileInfo.icon} />
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm truncate" title={name}>
                              {name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span className="font-medium">{fileInfo.label}</span>
                              {att.bytes && (
                                <span>· {(att.bytes / 1024 / 1024).toFixed(att.bytes > 5 * 1024 * 1024 ? 1 : 2)} MB</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={name}
                            className="btn btn-outline bg-white hover:bg-slate-100 text-slate-700 text-xs px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 border border-slate-300 shadow-2xs"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square text-xs text-slate-500" />
                            <span>เปิดไฟล์</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => downloadFile(url, name)}
                            className="btn btn-primary bg-[#006241] hover:bg-[#1E3932] text-white text-xs px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 shadow-2xs"
                          >
                            <i className="fa-solid fa-download" />
                            <span>ดาวน์โหลดไฟล์</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </article>
        )}
      </div>

      {/* Lightbox Image Preview Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-4 md:p-6 animate-fade-in">
          {/* Modal Header Toolbar */}
          <div className="flex items-center justify-between gap-4 text-white z-10 bg-[#006241] p-3 rounded-2xl border border-emerald-600 shadow-lg">
            <div className="flex items-center gap-3 min-w-0">
              <i className="fa-solid fa-image text-emerald-200 text-lg" />
              <span className="font-semibold text-sm truncate max-w-md" title={lightboxImage.name}>
                {lightboxImage.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                title="ย่อซูม (-)"
                className="p-2 px-3 text-xs bg-[#1E3932] hover:bg-[#004d33] text-white rounded-lg transition font-bold"
                onClick={() => setLightboxZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
              >
                <i className="fa-solid fa-minus" />
              </button>

              <span className="text-xs font-mono text-emerald-100 w-12 text-center select-none font-bold">
                {Math.round(lightboxZoom * 100)}%
              </span>

              <button
                type="button"
                title="ขยายซูม (+)"
                className="p-2 px-3 text-xs bg-[#1E3932] hover:bg-[#004d33] text-white rounded-lg transition font-bold"
                onClick={() => setLightboxZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
              >
                <i className="fa-solid fa-plus" />
              </button>

              <div className="h-4 w-px bg-[#00754A] mx-1" />

              <button
                type="button"
                title="หมุนภาพ 90°"
                className="p-2 px-3 text-xs bg-[#1E3932] hover:bg-[#004d33] text-white rounded-lg transition"
                onClick={() => setLightboxRotate(r => (r + 90) % 360)}
              >
                <i className="fa-solid fa-rotate-right" />
              </button>

              <button
                type="button"
                title="ดาวน์โหลดรูปภาพ"
                className="p-2 px-3 text-xs bg-white text-[#006241] hover:bg-emerald-50 rounded-lg transition font-bold flex items-center gap-1.5 shadow-sm"
                onClick={() => downloadFile(lightboxImage.url, lightboxImage.name)}
              >
                <i className="fa-solid fa-download" />
                <span className="hidden sm:inline">ดาวน์โหลด</span>
              </button>

              <button
                type="button"
                title="ปิด (Esc)"
                className="p-2 px-3 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-bold"
                onClick={() => setLightboxImage(null)}
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
          </div>

          {/* Modal Main Viewport */}
          <div
            className="flex-1 flex items-center justify-center p-4 overflow-auto cursor-grab active:cursor-grabbing"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLightboxImage(null)
            }}
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              style={{
                transform: `scale(${lightboxZoom}) rotate(${lightboxRotate}deg)`,
                transition: 'transform 0.2s ease-out',
                maxHeight: '82vh',
                maxWidth: '90vw'
              }}
              className="object-contain rounded-lg shadow-2xl select-none"
            />
          </div>

          {/* Modal Footer Caption */}
          <div className="text-center text-xs text-slate-300 py-2">
            กดปุ่ม <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Esc</kbd> หรือคลิกพื้นที่ว่างด้านนอกเพื่อปิด
          </div>
        </div>
      )}
    </div>
  )
}
