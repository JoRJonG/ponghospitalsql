import { useState, useMemo, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure PDF.js worker to use a same-origin bundle instead of external CDN (CSP-safe)
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

type PdfViewerProps = {
  url?: string
  data?: ArrayBuffer | null
  className?: string
  title?: string
  bytes?: number
  onError?: (message: string) => void
}

export default function PdfViewer({ url, data, className = '', title, onError }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.1)
  const [isFit, setIsFit] = useState<boolean>(true)
  const [rotate, setRotate] = useState<number>(0)
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [jumpPageInput, setJumpPageInput] = useState<string>('1')

  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  // Determine the file source for React-PDF
  const fileSource = useMemo(() => {
    if (data) return data.slice(0)
    if (!url) return null

    try {
      const u = new URL(url, window.location.href)
      const sameOrigin = u.origin === window.location.origin
      return sameOrigin ? u.toString() : `/api/proxy/pdf?url=${encodeURIComponent(u.toString())}`
    } catch {
      return url
    }
  }, [url, data])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  function onDocumentLoadError(loadError: Error): void {
    const msg = loadError?.message || 'ไม่สามารถโหลดเอกสาร PDF ได้'
    setError(msg)
    setLoading(false)
    if (onError) {
      try {
        onError(msg)
      } catch (err) {
        console.warn('[PdfViewer] onError callback failed:', err)
      }
    }
  }

  // Handle Page jump navigation
  const scrollToPage = (pageNumber: number) => {
    const targetIndex = pageNumber - 1
    const el = pageRefs.current[targetIndex]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setCurrentPage(pageNumber)
      setJumpPageInput(String(pageNumber))
    }
  }

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJumpPageInput(e.target.value)
  }

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const parsed = parseInt(jumpPageInput, 10)
      if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
        scrollToPage(parsed)
      } else {
        setJumpPageInput(String(currentPage))
      }
    }
  }

  // Update current page counter when scrolling
  useEffect(() => {
    if (!numPages || loading || error) return

    const handleScroll = () => {
      const container = containerRef.current
      if (!container) return

      const containerTop = container.getBoundingClientRect().top
      let closestPage = 1
      let minDistance = Infinity

      pageRefs.current.forEach((ref, idx) => {
        if (!ref) return
        const rect = ref.getBoundingClientRect()
        const distance = Math.abs(rect.top - containerTop)
        if (distance < minDistance) {
          minDistance = distance
          closestPage = idx + 1
        }
      })

      setCurrentPage(closestPage)
      setJumpPageInput(String(closestPage))
    }

    const containerEl = containerRef.current
    if (containerEl) {
      containerEl.addEventListener('scroll', handleScroll, { passive: true })
      return () => containerEl.removeEventListener('scroll', handleScroll)
    }
  }, [numPages, loading, error])

  // Fullscreen change detection
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err)
      })
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Error attempting to exit fullscreen:', err)
      })
    }
  }

  const handleRotate = () => {
    setRotate(r => (r + 90) % 360)
  }

  const handleDownload = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.download = title || 'document.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const handlePrint = () => {
    if (!url) return
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.focus()
      printWindow.print()
    }
  }

  const currentScale = isFit ? undefined : scale

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-slate-100 border border-slate-300 rounded-2xl overflow-hidden shadow-lg transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : className
      }`}
      style={{ minHeight: isFullscreen ? '100vh' : '650px' }}
    >
      {/* Primary Toolbar */}
      <div className="bg-white text-slate-800 px-3.5 py-2 flex items-center justify-between gap-2 flex-wrap z-20 shadow-sm border-b border-slate-200">
        {/* Left Section: Thumbnails & Page Counter Navigation */}
        <div className="flex items-center gap-2">
          {numPages > 1 && (
            <button
              type="button"
              title="เปิด/ปิด แถบย่อหน้าเอกสาร"
              className={`p-1.5 px-3 text-xs rounded-lg transition-all flex items-center gap-1.5 font-bold border ${
                showThumbnails
                  ? 'bg-slate-100 text-[#006241] border-slate-300 shadow-inner'
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-slate-200 shadow-2xs'
              }`}
              onClick={() => setShowThumbnails(v => !v)}
            >
              <i className="fa-solid fa-border-all text-xs" />
              <span>สารบัญหน้า</span>
            </button>
          )}

          {numPages > 0 && (
            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg text-xs border border-slate-200 shadow-2xs">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                title="หน้าก่อนหน้า"
                className="p-0.5 px-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition"
                onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
              >
                <i className="fa-solid fa-chevron-left text-[11px]" />
              </button>

              <span className="text-slate-600 font-medium">หน้า</span>
              <input
                type="text"
                value={jumpPageInput}
                onChange={handlePageInputChange}
                onKeyDown={handlePageInputKeyDown}
                className="w-9 text-center bg-slate-50 border border-slate-200 rounded text-slate-800 font-bold px-1 py-0.5 focus:outline-none focus:border-[#006241] focus:ring-1 focus:ring-[#006241] text-xs"
              />
              <span className="text-slate-600 font-medium">/ {numPages}</span>

              <button
                type="button"
                disabled={currentPage >= numPages || loading}
                title="หน้าถัดไป"
                className="p-0.5 px-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition"
                onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
              >
                <i className="fa-solid fa-chevron-right text-[11px]" />
              </button>
            </div>
          )}
        </div>

        {/* Center Section: Viewing & Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          {/* Fit Toggle */}
          <button
            type="button"
            title="ปรับพอดีความกว้าง"
            className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
              isFit
                ? 'bg-slate-100 text-[#006241] shadow-inner'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            onClick={() => setIsFit(true)}
          >
            <i className="fa-solid fa-arrows-left-right-to-line mr-1 text-[11px]" />
            <span>Fit Width</span>
          </button>

          <div className="h-3.5 w-px bg-slate-200 mx-0.5" />

          {/* Zoom Out */}
          <button
            type="button"
            title="ย่อขนาด (-)"
            className="p-0.5 px-2 text-xs rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition font-bold"
            onClick={() => {
              setIsFit(false)
              setScale(s => Math.max(0.5, +(s - 0.15).toFixed(2)))
            }}
          >
            <i className="fa-solid fa-minus text-[10px]" />
          </button>

          <span className="text-xs font-semibold text-slate-700 w-12 text-center select-none font-mono">
            {Math.round((isFit ? 1.1 : scale) * 100)}%
          </span>

          {/* Zoom In */}
          <button
            type="button"
            title="ขยายขนาด (+)"
            className="p-0.5 px-2 text-xs rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition font-bold"
            onClick={() => {
              setIsFit(false)
              setScale(s => Math.min(2.5, +(s + 0.15).toFixed(2)))
            }}
          >
            <i className="fa-solid fa-plus text-[10px]" />
          </button>

          <div className="h-3.5 w-px bg-slate-200 mx-0.5" />

          {/* Rotate */}
          <button
            type="button"
            title="หมุนหน้า 90°"
            className="p-0.5 px-2 text-xs rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
            onClick={handleRotate}
          >
            <i className="fa-solid fa-rotate-right text-[11px]" />
          </button>
        </div>

        {/* Right Section: Actions (Print, Download, Fullscreen) */}
        <div className="flex items-center gap-2">
          {url && (
            <button
              type="button"
              title="พิมพ์เอกสาร PDF"
              className="p-1.5 px-3 text-xs bg-white hover:bg-slate-50 text-slate-700 rounded-lg transition flex items-center gap-1.5 border border-slate-200 shadow-2xs font-semibold"
              onClick={handlePrint}
            >
              <i className="fa-solid fa-print text-slate-500" />
              <span className="hidden md:inline">พิมพ์</span>
            </button>
          )}

          {url && (
            <button
              type="button"
              title="ดาวน์โหลดไฟล์ PDF"
              className="p-1.5 px-3 text-xs bg-[#006241] text-white hover:bg-[#1E3932] rounded-lg font-bold transition shadow-sm flex items-center gap-1.5"
              onClick={handleDownload}
            >
              <i className="fa-solid fa-download text-white" />
              <span className="hidden sm:inline">ดาวน์โหลด PDF</span>
            </button>
          )}

          <button
            type="button"
            title={isFullscreen ? 'ออกจากโหมดเต็มหน้าจอ' : 'โหมดเต็มหน้าจอ'}
            className="p-1.5 px-2.5 text-xs bg-white hover:bg-slate-50 text-slate-600 rounded-lg transition flex items-center gap-1 border border-slate-200 shadow-2xs"
            onClick={toggleFullscreen}
          >
            <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} />
          </button>
        </div>
      </div>

      {/* Main Workspace (Drawer + PDF Canvas) */}
      <div className="flex-1 flex overflow-hidden bg-slate-200/80 relative">
        {/* Left Thumbnail Drawer */}
        {showThumbnails && numPages > 1 && (
          <aside className="w-52 bg-white border-r border-slate-300 p-3 overflow-y-auto flex flex-col gap-3 shrink-0 z-10 animate-fade-in shadow-md">
            <div className="text-xs font-bold text-[#006241] uppercase tracking-wider mb-1 flex items-center justify-between border-b border-slate-200 pb-2">
              <span>สารบัญหน้า</span>
              <span className="bg-emerald-100 text-[#006241] px-2 py-0.5 rounded-full text-[10px]">{numPages} หน้า</span>
            </div>
            {!error && fileSource && (
              <Document file={fileSource} loading="" error="">
                {Array.from(new Array(numPages), (_, i) => {
                  const pNum = i + 1
                  const isSelected = currentPage === pNum
                  return (
                    <button
                      key={`thumb_${pNum}`}
                      type="button"
                      onClick={() => scrollToPage(pNum)}
                      className={`group relative rounded-xl p-1.5 border transition-all text-left flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'border-[#006241] bg-emerald-50 shadow-md ring-2 ring-[#006241]/20'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="overflow-hidden rounded-md border border-slate-300 bg-white scale-95 group-hover:scale-100 transition-transform shadow-xs">
                        <Page
                          pageNumber={pNum}
                          width={150}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isSelected ? 'bg-[#006241] text-white' : 'text-slate-600 group-hover:text-slate-900'
                        }`}
                      >
                        หน้า {pNum}
                      </span>
                    </button>
                  )
                })}
              </Document>
            )}
          </aside>
        )}

        {/* PDF Viewer Canvas Container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex flex-col items-center gap-8 custom-scrollbar bg-slate-200/70"
        >
          {/* Loading Skeleton */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center my-auto">
              <div className="w-16 h-16 relative flex items-center justify-center mb-4">
                <i className="fa-solid fa-file-pdf text-4xl text-[#006241] animate-bounce" />
                <div className="absolute inset-0 rounded-full border-2 border-emerald-200 border-t-[#006241] animate-spin" />
              </div>
              <p className="text-slate-800 font-bold text-base mb-1">กำลังโหลดเอกสาร PDF...</p>
              <p className="text-slate-500 text-xs">โปรดรอสักครู่ ระบบกำลังจัดเตรียมหน้าเอกสาร</p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="my-12 max-w-md w-full p-6 bg-white border border-red-200 rounded-2xl text-center shadow-xl">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl border border-red-100">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <h4 className="text-slate-900 font-bold text-base mb-1">ไม่สามารถแสดงผล PDF ในหน้าเว็บได้</h4>
              <p className="text-slate-500 text-xs mb-5">{error}</p>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="btn btn-primary bg-[#006241] hover:bg-[#1E3932] text-white text-xs inline-flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold shadow-md"
                >
                  <i className="fa-solid fa-download" />
                  ดาวน์โหลดไฟล์ PDF เพื่อเปิดดูโดยตรง
                </a>
              )}
            </div>
          )}

          {/* Document Rendered Pages */}
          {!error && fileSource && (
            <Document
              file={fileSource}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
              error=""
              className="max-w-full flex flex-col items-center gap-8"
            >
              {numPages > 0
                ? Array.from(new Array(numPages), (_, index) => {
                    const pageNum = index + 1
                    return (
                      <div
                        key={`page_${pageNum}`}
                        ref={el => {
                          pageRefs.current[index] = el
                        }}
                        className="relative group transition-transform duration-200"
                      >
                        {/* Page Number Label Badge */}
                        <div className="absolute -top-3.5 left-4 bg-white text-slate-600 border border-slate-200 text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm z-10">
                          หน้า {pageNum} / {numPages}
                        </div>

                        {/* Page Card Frame */}
                        <div className="bg-white rounded-xl shadow-xl border border-slate-300 overflow-hidden ring-1 ring-black/5">
                          <Page
                            pageNumber={pageNum}
                            scale={currentScale}
                            rotate={rotate}
                            width={isFit ? Math.min(840, window.innerWidth - 60) : undefined}
                            className="bg-white"
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </div>
                      </div>
                    )
                  })
                : null}
            </Document>
          )}
        </div>
      </div>
    </div>
  )
}

