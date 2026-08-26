import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

// The public API modules (payments, invites-by-token, pledges, contributors,
// receipts) call the backend unauthenticated — they must not carry a stale
// Authorization header, and must not trigger the refresh-and-retry dance below.
export const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers.set('Authorization', `Bearer ${auth.accessToken}`)
  }
  return config
})

let refreshPromise: Promise<string> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const auth = useAuthStore()

    if (error.response?.status === 401 && auth.refreshToken && !originalRequest._retried) {
      originalRequest._retried = true
      try {
        refreshPromise ??= publicApiClient
          .post('/auth/refresh', { refreshToken: auth.refreshToken })
          .then(({ data }) => {
            auth.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
            return data.accessToken as string
          })
          .finally(() => {
            refreshPromise = null
          })

        const newAccessToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(originalRequest)
      } catch {
        auth.logout()
      }
    }

    return Promise.reject(error)
  },
)

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (Array.isArray(message)) return message.join(', ')
    if (typeof message === 'string') return message
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}
