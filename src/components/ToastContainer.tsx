import { useState, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import type { ToastType } from '../contexts/ToastContext'

function ToastItemInner({ toast, onRemove }: { toast: any, onRemove: (id: string) => void }) {
  const [leaving, setLeaving] = useState(false)

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return 'fa-check-circle'
      case 'error': return 'fa-exclamation-circle'
      case 'warning': return 'fa-exclamation-triangle'
      case 'info': return 'fa-info-circle'
    }
  }

  const getColors = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800'
      case 'error': return 'bg-red-50 border-red-200 text-red-800'
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    if (toast.duration && toast.duration > 0) {
      timer = setTimeout(() => setLeaving(true), toast.duration)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [toast.duration])

  // When leaving becomes true, wait for animation then remove
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => onRemove(toast.id), 300) // match CSS animation duration
    return () => clearTimeout(t)
  }, [leaving, onRemove, toast.id])

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border shadow-sm ${leaving ? 'animate-slide-out' : 'animate-slide-in'} ${getColors(toast.type)}`}>
      <i className={`fa-solid ${getIcon(toast.type)} mt-0.5 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm">{toast.title}</h4>
        {toast.message && <p className="text-sm mt-1 opacity-90">{toast.message}</p>}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
        aria-label="ปิดการแจ้งเตือน"
      >
        <i className="fa-solid fa-xmark text-sm" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (!toasts || toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast: any) => (
        <ToastItemInner
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  )
}