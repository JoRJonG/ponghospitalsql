const DEV_PORT_FALLBACKS = new Set(['5173', '4173'])

type BuildOptions = {
  preferBackend?: boolean
}

// Compute API base URL that works for both production and local dev with Vite proxy
export function getApiBase(preferBackend = false): string {
  const envBase = (import.meta.env?.VITE_API_URL ?? '').trim()
  if (envBase) {
    return envBase.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location
    if (preferBackend && DEV_PORT_FALLBACKS.has(port)) {
      return `${protocol}//${hostname}:5000`
    }
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`
  }
  return ''
}

export function buildApiUrl(path: string, options?: BuildOptions): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  const base = getApiBase(Boolean(options?.preferBackend))
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  
  // ✅ เพิ่ม cache-busting สำหรับ GET requests ที่เป็น API
  if (path.includes('/api/') && !options?.preferBackend) {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}_t=${Date.now()}`
  }
  
  return url
}

// Wrapper function for API calls with auto token refresh
export async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const makeRequest = async (includeAuth = true): Promise<Response> => {
    const headers: Record<string, string> = { ...options.headers as Record<string, string> }
    
    if (includeAuth) {
      const token = localStorage.getItem('ph_admin_token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }
    
    return fetch(buildApiUrl(url), {
      ...options,
      headers,
      credentials: 'include' // Include cookies for refresh token
    })
  }

  // First attempt
  let response = await makeRequest()
  
  // If token expired, try to refresh and retry once
  if (response.status === 401) {
    try {
      const errorData = await response.clone().json().catch(() => ({}))
      
      if (errorData.code === 'TOKEN_EXPIRED') {
        console.log('Token expired, attempting refresh...')
        
        // Attempt to refresh token
        const refreshResponse = await fetch(buildApiUrl('/api/auth/refresh'), {
          method: 'POST',
          credentials: 'include'
        })
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          localStorage.setItem('ph_admin_token', refreshData.token)
          if (refreshData.user && typeof refreshData.user.username === 'string') {
            const roles = Array.isArray(refreshData.user.roles) ? refreshData.user.roles : []
            const permissions = Array.isArray(refreshData.user.permissions) ? refreshData.user.permissions : []
            localStorage.setItem('ph_admin_user', JSON.stringify({
              username: refreshData.user.username,
              roles,
              permissions,
            }))
          } else {
            localStorage.removeItem('ph_admin_user')
          }
          console.log('Token refreshed, retrying request...')
          response = await makeRequest() // Retry with new token
        } else {
          console.log('Token refresh failed, clearing token')
          localStorage.removeItem('ph_admin_token')
          localStorage.removeItem('ph_admin_user')
          // Trigger logout by dispatching custom event
          window.dispatchEvent(new CustomEvent('auth:logout'))
        }
      }
    } catch (error) {
      console.error('Error during token refresh:', error)
      localStorage.removeItem('ph_admin_token')
      localStorage.removeItem('ph_admin_user')
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }
  }
  
  return response
}
