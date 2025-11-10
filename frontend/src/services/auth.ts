import { http } from './http'

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface TokenResponse {
  access: string
  refresh?: string
}

export const registerUser = (payload: RegisterPayload) =>
  http<{ username: string; email: string }>('register/', { method: 'POST', json: payload })

export const loginUser = (payload: LoginPayload) =>
  http<TokenResponse>('token/', { method: 'POST', json: payload })

export const refreshToken = (refresh: string) =>
  http<TokenResponse>('token/refresh/', { method: 'POST', json: { refresh } })
