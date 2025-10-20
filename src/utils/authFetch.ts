// Authenticated API client with automatic token refresh
import { useAuth } from '../auth/AuthContext'

export async function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const { getToken, refreshToken, logout } = useAuth()

  const makeRequest = (token: string | null) => {
    const headers = new Headers(init?.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(input, { ...init, headers, credentials: 'include' })
  }

  let token = getToken()
  let response = await makeRequest(token)

  // If token expired, try to refresh and retry once
  if (response.status === 401) {
    try {
      const errorData = await response.clone().json()
      if (errorData.code === 'TOKEN_EXPIRED') {
        const refreshSuccess = await refreshToken()
        if (refreshSuccess) {
          token = getToken()
          response = await makeRequest(token)
        } else {
          logout()
          throw new Error('Session expired')
        }
      }
    } catch {
      // If we can't parse error or refresh fails, proceed with original response
    }
  }

  return response
}

// Helper for authenticated JSON requests
export async function authFetchJSON<T = any>(input: string, init?: RequestInit): Promise<T> {
  const response = await authFetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}