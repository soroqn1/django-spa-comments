interface RequestOptions extends RequestInit {
  json?: unknown
}

const baseUrl = () => import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8000/api'

export const http = async <T>(path: string, options: RequestOptions = {}) => {
  const headers = new Headers(options.headers)
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${baseUrl()}/${path.replace(/^\//, '')}`, {
    ...options,
    headers,
    body: options.json === undefined ? options.body : JSON.stringify(options.json)
  })

  if (!response.ok) {
    const message = await parseError(response)
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  const data = await response.json()
  return data as T
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
