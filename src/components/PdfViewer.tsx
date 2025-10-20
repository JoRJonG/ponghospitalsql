import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure PDF.js worker to use a same-origin bundle instead of external CDN (CSP-safe)
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

type PdfViewerProps = {
  url: string
  className?: string
  onError?: (message: string) => void
}

export default function PdfViewer({ url, className, onError }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>()
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFit, setIsFit] = useState(true)

  // Build a same-origin URL via proxy for cross-origin sources to avoid CORS
  const srcUrl = (() => {
    try {
      const u = new URL(url, window.location.href)
      const sameOrigin = u.origin === window.location.origin
      return sameOrigin ? u.toString() : `/api/proxy/pdf?url=${encodeURIComponent(u.toString())}`
    } catch {
      return url
    }
  })()

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages)
    setLoading(false)
  }

  function onDocumentLoadError(loadError: Error): void {
    const msg = loadError?.message || 'ไม่สามารถโหลด PDF ได้'
    setError(msg)
    setLoading(false)
    try {
      if (onError) onError(msg)
    } catch (callbackError) {
      console.warn('[PdfViewer] onError callback failed:', callbackError)
    }
  }

  const currentScale = isFit ? undefined : scale

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 text-sm border-b bg-gray-50 sticky top-0 z-10">
        <div className="text-gray-600">
          {numPages && `${numPages} หน้า`}
        </div>
        <div className="flex items-center gap-2">
          <button 
            title="พอดีความกว้าง" 
            className={`px-2 py-1 text-xs border rounded hover:bg-gray-100 ${isFit ? 'bg-green-100 border-green-300' : 'bg-white border-gray-300'}`}
            onClick={() => setIsFit(true)}
          >
            <i className="fa-solid fa-arrows-left-right-to-line mr-1" />
            Fit
          </button>
          <button 
            title="100%" 
            className={`px-2 py-1 text-xs border rounded hover:bg-gray-100 ${!isFit && Math.round(scale*100) === 100 ? 'bg-green-100 border-green-300' : 'bg-white border-gray-300'}`}
            onClick={() => { setIsFit(false); setScale(1) }}
          >
            100%
          </button>
          <button 
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 bg-white"
            onClick={() => { setIsFit(false); setScale(s => Math.max(0.5, +(s - 0.1).toFixed(2))) }}
          >
            −
          </button>
          <span className="text-gray-600 w-12 text-center text-xs">
            {Math.round((isFit ? 1.2 : scale) * 100)}%
          </span>
          <button 
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 bg-white"
            onClick={() => { setIsFit(false); setScale(s => Math.min(3, +(s + 0.1).toFixed(2))) }}
          >
            +
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-100 p-4 overflow-auto flex flex-col items-center gap-4" style={{ maxHeight: '80vh' }}>
        {loading && (
          <div className="p-4 text-sm text-gray-600 bg-white rounded shadow">
            <i className="fa-solid fa-spinner fa-spin mr-2" />
            กำลังโหลดเอกสาร...
          </div>
        )}
        
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
            <i className="fa-solid fa-exclamation-triangle mr-2" />
            {error}
          </div>
        )}

        {!error && (
          <Document
            file={srcUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
            error=""
            className="max-w-full"
          >
            {numPages && Array.from(new Array(numPages), (_el, index) => (
              <div key={`page_${index + 1}`} className="mb-4 shadow-lg">
                <Page
                  pageNumber={index + 1}
                  scale={currentScale}
                  width={isFit ? Math.min(800, window.innerWidth - 100) : undefined}
                  className="border border-gray-300 bg-white"
                />
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  )
}
