import { useCallback } from 'react'
import { useAuth } from '../auth/AuthContext'

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

export function useAuthFetch(): Fetcher {
  const { getToken, refreshToken, logout } = useAuth()

  const fetchWithAuth = useCallback<Fetcher>(async (input, init) => {
    const makeRequest = (token: string | null) => {
      const headers = new Headers(init?.headers)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return fetch(input, { ...init, headers, credentials: 'include' })
    }

    let token = getToken()
    let response = await makeRequest(token)

    if (response.status === 401) {
      try {
        const errorData = await response.clone().json()
        if (errorData?.code === 'TOKEN_EXPIRED') {
          const refreshSuccess = await refreshToken()
          if (refreshSuccess) {
            token = getToken()
            response = await makeRequest(token)
          } else {
            logout()
            throw new Error('Session expired')
          }
        }
      } catch (error) {
        console.warn('authFetch: failed to refresh token', error)
      }
    }

    return response
  }, [getToken, logout, refreshToken])

  return fetchWithAuth
}

export function useAuthFetchJSON<T = unknown>() {
  const authFetch = useAuthFetch()

  return useCallback(async (input: string, init?: RequestInit): Promise<T> => {
    const response = await authFetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }, [authFetch])
}