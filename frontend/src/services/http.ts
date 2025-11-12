interface RequestOptions extends RequestInit {
  json?: unknown
}

type AccessTokenProvider = () => string | null
type UnauthorizedHandler = () => Promise<boolean>

const API_URL = (import.meta.env.VITE_API_URL || 'https://django-spa-comments.onrender.com').replace(/\/$/, '')
const baseUrl = () => `${API_URL}/api`

let tokenProvider: AccessTokenProvider | null = null
let unauthorizedHandler: UnauthorizedHandler | null = null

export const setAccessTokenProvider = (provider: AccessTokenProvider | null) => {
  tokenProvider = provider
}

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler
}

export const http = async <T>(path: string, options: RequestOptions = {}) => {
  const attempt = async (retry: boolean): Promise<T> => {
    const headers = new Headers(options.headers)
    if (options.json !== undefined) headers.set('Content-Type', 'application/json')

    if (tokenProvider) {
      const token = tokenProvider()
      if (token) headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(`${baseUrl()}/${path.replace(/^\//, '')}`, {
      ...options,
      headers,
      body: options.json === undefined ? options.body : JSON.stringify(options.json)
    })

    if (response.status === 401 && !retry && unauthorizedHandler) {
      const renewed = await unauthorizedHandler()
      if (renewed) return attempt(true)
    }

    if (!response.ok) {
      const message = await parseError(response)
      throw new Error(message)
    }

    if (response.status === 204) return undefined as T
    const data = await response.json()
    return data as T
  }

  return attempt(false)
}

const parseError = async (response: Response) => {
  try {
    const payload = await response.json()
    if (typeof payload === 'string') return payload
    if (payload && typeof payload === 'object') {
      return Object.values(payload).flat().join(' ')
    }
  } catch (_) {}
  return response.statusText || 'Request failed'
}
