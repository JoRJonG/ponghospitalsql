import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from './ToastContextBase'
import type { Toast, ToastType } from './ToastContextBase'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = {
      id,
      duration: 2000,
      ...toast,
    }
    setToasts(prev => [...prev, newToast])
  }, [])

  const success = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'success', title, message, duration })
  }, [addToast])

  const error = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'error', title, message, duration })
  }, [addToast])

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'warning', title, message, duration })
  }, [addToast])

  const info = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'info', title, message, duration })
  }, [addToast])

  const showToast = useCallback((title: string, message?: string, type: ToastType = 'info', duration?: number) => {
    switch (type) {
      case 'success':
        success(title, message, duration)
        break
      case 'error':
        error(title, message, duration)
        break
      case 'warning':
        warning(title, message, duration)
        break
      default:
        info(title, message, duration)
    }
  }, [error, info, success, warning])

  const value = useMemo(() => ({
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    showToast,
  }), [addToast, error, info, removeToast, showToast, success, toasts, warning])

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}
