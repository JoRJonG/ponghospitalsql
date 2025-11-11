import { useEffect, useState } from 'react'
import PdfViewer from '../components/PdfViewer'
import { Link, useParams } from 'react-router-dom'
import { fastFetch } from '../utils/fastFetch'

type Attachment = { url: string; publicId?: string; kind?: 'image'|'pdf'|'file'; name?: string; bytes?: number }
type Announcement = {
  _id: string
  title: string
  category: 'สมัครงาน' | 'ประชาสัมพันธ์' | 'ประกาศ'
  content?: string
  publishedAt?: string
  attachments?: Attachment[]
  viewCount?: number
}

// ===== Download helpers (module scope so all components can use) =====
const getNameFromUrl = (url: string): string => {
  try {
    const u = new URL(url, window.location.origin)
    const pathname = u.pathname
    const base = pathname.split('/').pop() || 'attachment'
    return base.split('?')[0].split('#')[0]
  } catch {
    const clean = url.split('?')[0].split('#')[0]
    const base = clean.substring(clean.lastIndexOf('/') + 1) || 'attachment'
    return base
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
    // If we want a PDF, normalize MIME so the OS/browser recognizes it
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

export default function AnnouncementDetailPage() {
  const { id } = useParams()
  const [item, setItem] = useState<Announcement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setItem(null); setError(null)
    fastFetch<Announcement>(`/api/announcements/${id}`, { ttlMs: 60_000, retries: 1 })
      .then((data) => {
        setItem(data)
        const url = `/api/announcements/${id}/view`
        const body = ''

        if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
          try {
            navigator.sendBeacon(url, body)
          } catch (error) {
            console.error('sendBeacon failed, falling back to fetch', error)
            fetch(url, { method: 'POST', keepalive: true }).catch((fallbackError) => {
              console.error('Failed to record announcement view via fetch', fallbackError)
            })
          }
          return
        }

        fetch(url, { method: 'POST', keepalive: true }).catch((fetchError) => {
          console.error('Failed to record announcement view', fetchError)
        })
      })
      .catch((thrown: unknown) => {
        if (thrown instanceof Error) {
          setError(thrown.message || 'เกิดข้อผิดพลาด')
        } else {
          setError('เกิดข้อผิดพลาด')
        }
      })
  }, [id])

  return (
    <div className="container-narrow py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">รายละเอียดประกาศ</h1>
        <Link to="/announcements" className="text-sm text-green-700 hover:underline">กลับไปดูประกาศทั้งหมด</Link>
      </div>

      {!item && !error && (
        <div className="space-y-3">
          <div className="h-8 w-2/3 bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-1/3 bg-gray-200 animate-pulse rounded" />
          <div className="h-24 w-full bg-gray-200 animate-pulse rounded" />
        </div>
      )}

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3">{error}</div>
      )}

      {item && (
        <article className="space-y-4">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span className="badge blue">{item.category}</span>
            <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ''}</span>
            {item.viewCount !== undefined && <span className="flex items-center gap-1"><i className="fas fa-eye text-xs" aria-hidden="true"></i> {item.viewCount} ครั้ง</span>}
          </div>
          <h2 className="text-xl font-semibold">{item.title}</h2>
          {item.content && (
            <div className="prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: item.content }} />
          )}
          {item.attachments && item.attachments.length > 0 && (
            <div>
              <div className="font-semibold mb-2">ไฟล์แนบ</div>
              <div className="space-y-4">
                {item.attachments.map((att, idx) => {
                  const url = att.url
                  const name = att.name || `ไฟล์แนบ ${idx + 1}`
                  const extImage = /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i
                  const extPdf = /\.pdf(\?.*)?$/i
                  const isImage = (att.kind === 'image') || extImage.test(url) || (att.name ? extImage.test(att.name) : false)
                  const nameLooksPdf = att.name ? extPdf.test(att.name) : false
                  // Consider only explicit PDFs to avoid rendering errors for other 'raw' files (e.g., .docx)
                  const isPdf = (att.kind === 'pdf') || extPdf.test(url) || nameLooksPdf

                  if (isImage) {
                    return (
                      <figure key={idx} className="w-full">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt={name}
                            className="w-full max-w-full h-auto rounded shadow-sm object-contain bg-gray-50"
                          />
                        </a>
                        {att.name && (
                          <figcaption className="text-xs text-gray-500 mt-1">{att.name}</figcaption>
                        )}
                      </figure>
                    )
                  }

                  if (isPdf) {
                    return (
                      <div key={idx} className="w-full">
                        <PdfViewer
                          url={url}
                          className="w-full rounded overflow-hidden border"
                          onError={() => {
                            // noop: rendering will show error message; parent also has generic fallback below
                          }}
                        />
                        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                          {(att.name || att.bytes) && (
                            <div className="text-xs text-gray-500 truncate" title={att.name || ''}>
                              {att.name || 'ไฟล์'}{att.bytes ? ` · ${(att.bytes/1024/1024).toFixed(att.bytes > 5*1024*1024 ? 1 : 2)} MB` : ''}
                            </div>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => downloadFile(url, att.name || undefined, true)}
                          >
                            ดาวน์โหลด PDF
                          </button>
                        </div>
                      </div>
                    )
                  }

                  // Try render as PDF first (for cases like Cloudinary raw without .pdf), then fallback to download if it fails
                  return (
                    <TryPdfThenDownload key={idx} url={url} name={name} />
                  )
                })}
              </div>
            </div>
          )}
        </article>
      )}
    </div>
  )
}

function TryPdfThenDownload({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false)
  if (!failed) {
    return (
      <div className="w-full">
        <PdfViewer url={url} className="w-full rounded overflow-hidden border" onError={() => setFailed(true)} />
        {name && <div className="mt-2 text-xs text-gray-500">{name}</div>}
        <div className="mt-2 flex justify-end">
          <button type="button" className="btn btn-outline" onClick={() => downloadFile(url, name, true)}>ดาวน์โหลด PDF</button>
        </div>
      </div>
    )
  }
  return (
    <div className="border rounded p-3 flex items-center justify-between gap-3">
      <div className="min-w-0 truncate text-sm">{name || 'ไฟล์แนบ'}</div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download={/\.pdf$/i.test(name) ? name : `${name}.pdf`}
        className="text-green-700 text-sm hover:underline"
      >ดาวน์โหลด</a>
    </div>
  )
}
