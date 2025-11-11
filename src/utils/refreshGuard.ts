import { invalidateCache } from './fastFetch'

type Options = {
  cooldownMs?: number
  revalidateAfterMs?: number
}

export function installRefreshGuard(opts: Options = {}) {
  const cooldown = opts.cooldownMs ?? 4000
  const revalidateAfter = opts.revalidateAfterMs ?? 60_000

  try {
    const now = Date.now()
    const entries = performance.getEntriesByType ? performance.getEntriesByType('navigation') : []
    const nav = Array.isArray(entries) && entries.length > 0 ? entries[0] as PerformanceNavigationTiming : undefined
    const docNav = (document as unknown as { navigation?: { type?: string } }).navigation
    const type = nav?.type || docNav?.type
    const isReload = type === 'reload'
    const key = 'app:last-reload'
    const last = parseInt(sessionStorage.getItem(key) || '0', 10) || 0
    if (isReload) {
      sessionStorage.setItem(key, String(now))
      if (last && now - last < cooldown) {
        showToast('คุณกำลังกดรีเฟรชบ่อยเกินไป กรุณารอสักครู่')
      }
    }
  } catch (error) {
    console.warn('Refresh guard: failed to inspect navigation entries', error)
  }

  // Invalidate client cache when returning focus after a while
  let lastVisible = Date.now()
  const onVisible = () => {
    const now = Date.now()
    if (now - lastVisible > revalidateAfter) {
      try {
        invalidateCache('/api/')
      } catch (error) {
        console.warn('Refresh guard: failed to invalidate cache', error)
      }
    }
    lastVisible = now
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onVisible()
  })
  window.addEventListener('focus', onVisible)
}

function showToast(message: string) {
  try {
    const el = document.createElement('div')
    el.textContent = message
    el.style.position = 'fixed'
    el.style.top = '12px'
    el.style.left = '50%'
    el.style.transform = 'translateX(-50%)'
    el.style.background = 'rgba(0,0,0,0.75)'
    el.style.color = '#fff'
    el.style.padding = '8px 12px'
    el.style.borderRadius = '8px'
    el.style.fontSize = '14px'
    el.style.zIndex = '9999'
    el.style.pointerEvents = 'none'
    document.body.appendChild(el)
    setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0' }, 1500)
    setTimeout(() => { el.remove() }, 2000)
  } catch (error) {
    console.warn('Refresh guard: failed to show toast', error)
  }
}

export default { installRefreshGuard }
// end of module
