import { computed, reactive } from 'vue'
import { loginUser, refreshToken, registerUser } from '../services/auth'
import { setAccessTokenProvider, setUnauthorizedHandler } from '../services/http'

interface AuthState {
  username: string
  email: string
  homePage: string
  accessToken: string
  refreshToken: string
  loading: boolean
  error: string
  initialized: boolean
}

interface LoginParams {
  username: string
  password: string
  email?: string
}

interface RegisterParams {
  username: string
  email: string
  password: string
}

const STORAGE_KEY = 'comment_auth'

const state = reactive<AuthState>({
  username: '',
  email: '',
  homePage: '',
  accessToken: '',
  refreshToken: '',
  loading: false,
  error: '',
  initialized: false
})

const persist = () => {
  if (typeof window === 'undefined') return
  const payload = {
    username: state.username,
    email: state.email,
    homePage: state.homePage,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

const restore = () => {
  if (typeof window === 'undefined') return
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    const saved = JSON.parse(raw)
    state.username = saved.username ?? ''
    state.email = saved.email ?? ''
    state.homePage = saved.homePage ?? ''
    state.accessToken = saved.accessToken ?? ''
    state.refreshToken = saved.refreshToken ?? ''
  } catch (_) {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

const clear = () => {
  state.username = ''
  state.email = ''
  state.homePage = ''
  state.accessToken = ''
  state.refreshToken = ''
  state.error = ''
  persist()
}

const begin = () => {
  state.loading = true
  state.error = ''
}

const finish = () => {
  state.loading = false
  persist()
}

const login = async ({ username, password, email }: LoginParams) => {
  begin()
  try {
    const tokens = await loginUser({ username, password })
    state.username = username
    if (email) state.email = email
    state.accessToken = tokens.access
    state.refreshToken = tokens.refresh ?? state.refreshToken
    finish()
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Не удалось войти'
    finish()
    throw error
  }
}

const register = async ({ username, email, password }: RegisterParams) => {
  begin()
  try {
    await registerUser({ username, email, password })
    await login({ username, password, email })
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Не удалось зарегистрироваться'
    finish()
    throw error
  }
}

const refresh = async () => {
  if (!state.refreshToken) return false
  try {
    const tokens = await refreshToken(state.refreshToken)
    state.accessToken = tokens.access
    if (tokens.refresh) state.refreshToken = tokens.refresh
    persist()
    return true
  } catch (_) {
    clear()
    return false
  }
}

const logout = () => {
  clear()
}

const setHomePage = (value: string) => {
  state.homePage = value
  persist()
}

const setProfile = (payload: { email?: string; homePage?: string }) => {
  if (payload.email !== undefined) state.email = payload.email
  if (payload.homePage !== undefined) state.homePage = payload.homePage
  persist()
}

const init = () => {
  if (state.initialized) return
  restore()
  setAccessTokenProvider(() => (state.accessToken ? state.accessToken : null))
  setUnauthorizedHandler(async () => {
    const updated = await refresh()
    return updated
  })
  state.initialized = true
}

export const useAuth = () => {
  init()
  const isAuthenticated = computed(() => Boolean(state.accessToken))
  return {
    state,
    isAuthenticated,
    login,
    register,
    logout,
    refresh,
    setHomePage,
    setProfile
  }
}