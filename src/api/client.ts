import { showToast } from '../composables/useToast'
import { USE_MOCK } from '../config'
import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  GetTranslationsResponse,
  ApiError,
  GetBranchesResponse,
  GetMenuResponse,
  GetUsersResponse,
  GetTenantsResponse,
  GetRolesResponse,
  GetPermissionsResponse,
  CreateUserRequest,
  UpdateUserRequest,
  ApiUser,
  CreateRoleRequest,
  SetRolePermissionsRequest,
  Role,
  SuccessResponse,
  IconResponse,
} from '../types/api'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

// Refresh-токен живёт в localStorage (общий для вкладок), access — только в памяти вкладки.
const REFRESH_STORAGE_KEY = 'auth_refresh'
// Кросс-табовый лок на обновление: { ts, tabId } в localStorage.
const LOCK_STORAGE_KEY = 'auth_refresh_lock'
const CHANNEL_NAME = 'remontti-auth'
// Обновляемся проактивно за 2 минуты до истечения access.
const PROACTIVE_LEAD_MS = 2 * 60 * 1000
// Чужая метка лока считается «занятой» максимум 5 секунд.
const LOCK_TTL_MS = 5000
// Сколько ждать результат refresh другой вкладки по BroadcastChannel.
const WAIT_REFRESH_TIMEOUT_MS = 10_000

type RefreshResult = 'ok' | 'dead' | 'unavailable'

interface LockValue {
  ts: number
  tabId: string
}

interface ChannelMessage {
  type: 'refreshed' | 'refresh-failed' | 'session-expired' | 'logout'
  tabId: string
  access?: string | null
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

class ApiClient {
  private accessToken: string | null = null
  private refreshPromise: Promise<RefreshResult> | null = null
  private proactiveTimer: number | null = null
  private redirectPending = false
  private readonly tabId: string
  private channel: BroadcastChannel | null = null
  private refreshWaiters: Array<(result: RefreshResult) => void> = []

  constructor() {
    this.tabId =
      (crypto as { randomUUID?: () => string }).randomUUID?.() ||
      Math.random().toString(36).slice(2)

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = (ev: MessageEvent) => this.handleChannelMessage(ev.data)
    }

    if (typeof document !== 'undefined' && !USE_MOCK) {
      // После «пробуждения» вкладки (фон может прибить таймеры) — восстанавливаем access.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return
        if (!this.accessToken || this.isAccessTokenExpired() || this.isAccessExpiringSoon()) {
          void this.refreshAccessToken()
        }
      })
    }
  }

  // ---------- Токены ----------

  /** Access-токен текущей вкладки (только в памяти, per-tab). */
  getAccessToken(): string | null {
    return this.accessToken
  }

  hasAccessToken(): boolean {
    return this.accessToken !== null
  }

  /** Refresh-токен из localStorage, общий для вкладок. */
  hasRefreshToken(): boolean {
    return localStorage.getItem(REFRESH_STORAGE_KEY) !== null
  }

  clearAccess(): void {
    this.accessToken = null
  }

  /** Полный сброс локальной сессии вкладки: access в памяти + refresh/user/lock в localStorage. */
  resetSession(): void {
    this.clearLocalSession()
  }

  isAccessTokenExpired(): boolean {
    const exp = this.accessToken ? decodeJwtExp(this.accessToken) : null
    return exp !== null && exp < Date.now()
  }

  private isAccessExpiringSoon(): boolean {
    const exp = this.accessToken ? decodeJwtExp(this.accessToken) : null
    return exp !== null && exp - Date.now() < PROACTIVE_LEAD_MS
  }

  // ---------- Локальная память и канал между вкладками ----------

  /** Чистит локальную сессию этой вкладки (access в памяти + общий localStorage). */
  private clearLocalSession(): void {
    this.accessToken = null
    localStorage.removeItem(REFRESH_STORAGE_KEY)
    localStorage.removeItem(LOCK_STORAGE_KEY)
    localStorage.removeItem('auth_user')
    this.stopProactiveTimer()
  }

  private post(msg: Omit<ChannelMessage, 'tabId'>): void {
    this.channel?.postMessage({ ...msg, tabId: this.tabId })
  }

  private handleChannelMessage(msg: ChannelMessage): void {
    if (!msg || typeof msg !== 'object' || msg.tabId === this.tabId) return

    switch (msg.type) {
      case 'refreshed':
        if (msg.access) {
          this.accessToken = msg.access
          this.scheduleProactiveRefresh()
        }
        this.resolveWaiters('ok')
        break
      case 'refresh-failed':
        this.resolveWaiters('unavailable')
        break
      case 'session-expired':
        this.clearLocalSession()
        this.redirectToLogin()
        this.resolveWaiters('dead')
        break
      case 'logout':
        this.clearLocalSession()
        this.resolveWaiters('dead')
        void import('../router').then(({ default: router }) => {
          if (router.currentRoute.value.path !== '/') router.push('/')
        })
        break
    }
  }

  private resolveWaiters(result: RefreshResult): void {
    const waiters = this.refreshWaiters
    this.refreshWaiters = []
    waiters.forEach(w => w(result))
  }

  private redirectToLogin(): void {
    if (this.redirectPending) return
    this.redirectPending = true
    if (window.location.pathname !== '/') {
      showToast('Сессия истекла, авторизуйтесь заново', 'error')
      void import('../router').then(({ default: router }) => {
        router.push({ path: '/', query: { session_expired: '1' } })
      })
    }
  }

  private handleUnauthorized(): void {
    if (!this.getRefreshToken() && !this.accessToken) return
    this.clearLocalSession()
    this.post({ type: 'session-expired' })
    this.redirectToLogin()
  }

  // ---------- Refresh: лок, CAS, проактивный таймер ----------

  private getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_STORAGE_KEY)
  }

  /** CAS-запись нового refresh: только если в localStorage всё ещё лежит отправленный токен. */
  private casWriteRefresh(sentToken: string, newToken: string): void {
    if (localStorage.getItem(REFRESH_STORAGE_KEY) === sentToken) {
      localStorage.setItem(REFRESH_STORAGE_KEY, newToken)
    }
  }

  private readLock(): LockValue | null {
    const raw = localStorage.getItem(LOCK_STORAGE_KEY)
    if (!raw) return null
    try {
      const lock: LockValue = JSON.parse(raw)
      if (typeof lock.ts !== 'number' || typeof lock.tabId !== 'string') return null
      return lock
    } catch {
      return null
    }
  }

  /** Берёт лок. Вернёт false, если его держит другая вкладка (ещё живой). */
  private acquireLock(): boolean {
    const lock = this.readLock()
    if (lock && lock.tabId !== this.tabId && Date.now() - lock.ts < LOCK_TTL_MS) {
      return false
    }
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify({ ts: Date.now(), tabId: this.tabId }))
    return true
  }

  /** Принудительно занимает лок (восстановление после таймаута ожидания). */
  private forceAcquireLock(): void {
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify({ ts: Date.now(), tabId: this.tabId }))
  }

  private releaseLock(): void {
    const lock = this.readLock()
    if (lock && lock.tabId === this.tabId) {
      localStorage.removeItem(LOCK_STORAGE_KEY)
    }
  }

  /** Ждём результат refresh другой вкладки (потери лока). */
  private waitForOthers(): Promise<RefreshResult> {
    return new Promise(resolve => {
      const wrapped = (result: RefreshResult): void => {
        clearTimeout(timer)
        const i = this.refreshWaiters.indexOf(wrapped)
        if (i >= 0) this.refreshWaiters.splice(i, 1)
        resolve(result)
      }
      const timer = window.setTimeout(() => {
        const i = this.refreshWaiters.indexOf(wrapped)
        if (i >= 0) this.refreshWaiters.splice(i, 1)
        resolve('unavailable')
      }, WAIT_REFRESH_TIMEOUT_MS)

      this.refreshWaiters.push(wrapped)
    })
  }

  private scheduleProactiveRefresh(): void {
    if (USE_MOCK) return
    this.stopProactiveTimer()
    const exp = this.accessToken ? decodeJwtExp(this.accessToken) : null
    if (!exp) return
    // Джиттер 1–2 сек: вкладки без лока не бьют в одну секунду.
    const jitter = 1000 + Math.random() * 1000
    const delay = Math.max(0, exp - Date.now() - PROACTIVE_LEAD_MS) + jitter
    this.proactiveTimer = window.setTimeout(() => {
      void this.refreshAccessToken()
    }, delay)
  }

  private stopProactiveTimer(): void {
    if (this.proactiveTimer !== null) {
      window.clearTimeout(this.proactiveTimer)
      this.proactiveTimer = null
    }
  }

  /**
   * Обновляет access по refresh-токену. Дедупликация внутри вкладки по refreshPromise.
   * Результат: 'ok' | 'dead' (сессия отозвана/протухла) | 'unavailable' (сетевой/5xx сбой).
   */
  async refreshAccessToken(force = false): Promise<RefreshResult> {
    if (!force && this.refreshPromise) return this.refreshPromise
    const promise = this.doRefresh(force)
    if (!force) this.refreshPromise = promise
    try {
      return await promise
    } finally {
      if (!force) this.refreshPromise = null
    }
  }

  private async doRefresh(force: boolean): Promise<RefreshResult> {
    // Читаем refresh непосредственно перед отправкой (не из замыкания) и CAS-пишем результат.
    const sentToken = this.getRefreshToken()
    if (!sentToken) return 'dead'

    const lockHeld = force ? (this.forceAcquireLock(), true) : this.acquireLock()
    if (!lockHeld) return this.waitForOthers()

    try {
      let response: Response
      try {
        response = await fetch(`${API_BASE}/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: sentToken }),
        })
      } catch {
        // Сетевой сбой: сессию не трогаем, проактивный таймер попробует снова.
        this.post({ type: 'refresh-failed' })
        return 'unavailable'
      }

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        if (response.status === 401) {
          // REFRESH_* / SESSION_REVOKED — сессия мертва.
          this.clearLocalSession()
          this.post({ type: 'session-expired' })
          this.redirectToLogin()
          return 'dead'
        }
        this.post({ type: 'refresh-failed' })
        return 'unavailable'
      }

      this.accessToken = payload?.token ?? null
      if (this.accessToken && payload?.refresh_token) {
        this.casWriteRefresh(sentToken, payload.refresh_token)
      }
      this.redirectPending = false
      this.scheduleProactiveRefresh()
      this.post({ type: 'refreshed', access: this.accessToken })

      return this.accessToken ? 'ok' : 'unavailable'
    } finally {
      this.releaseLock()
    }
  }

  /** Гарантирует валидный access перед первым запросом (гард при старте). */
  async ensureAccessToken(): Promise<boolean> {
    if (this.accessToken && !this.isAccessTokenExpired()) return true
    if (!this.getRefreshToken()) return false
    return (await this.refreshAccessToken()) === 'ok'
  }

  // ---------- HTTP ----------

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    const isAuthEndpoint = endpoint.startsWith('/v1/auth/')

    let attempt = 0
    // Пытаемся до двух раз: первичный запрос и один повтор после refresh.
    while (attempt <= 1) {
      const token = this.accessToken

      // Для multipart/form-data Content-Type НЕ ставим — браузер сам подставит
      // правильный boundary. Если бы поставили application/json — сервер не
      // разберёт тело и вернёт INVALID_MULTIPART.
      const isMultipart = typeof FormData !== 'undefined' && options.body instanceof FormData
      const headers: Record<string, string> = {
        ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers as Record<string, string>) || {}),
      }

      const config: RequestInit = { ...options, headers }

      let response: Response
      try {
        response = await fetch(url, config)
      } catch (error) {
        console.error('API request failed:', error)
        throw error
      }

      if (response.status === 401 && !isAuthEndpoint && attempt === 0) {
        const result = await this.refreshAccessToken()
        if (result === 'ok') {
          attempt = 1
          continue
        }
        if (result === 'dead') this.handleUnauthorized()
      }

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          status: response.status,
          message: 'Request failed',
        }))
        // 401 после попытки refresh — сессию уже не восстановить.
        if (response.status === 401 && !isAuthEndpoint && attempt === 1) {
          this.handleUnauthorized()
        }
        throw error
      }

      return await response.json()
    }

    throw new Error('Request failed')
  }

  // ---------- Auth ----------

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (response.token) {
      this.accessToken = response.token
      if (response.refresh_token) {
        localStorage.setItem(REFRESH_STORAGE_KEY, response.refresh_token)
      }
      this.redirectPending = false
      this.scheduleProactiveRefresh()
    }

    return response
  }

  /**
   * Отзывает сессию устройства на бэкенде, чистит локальную память
   * и через канал выводит остальные вкладки браузера.
   */
  async logout(): Promise<LogoutResponse> {
    const refresh = this.getRefreshToken()
    try {
      if (refresh) {
        await this.request<LogoutResponse>('/v1/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refresh }),
        })
      }
    } catch {
      // Идемпотентно: локально сессию всё равно чистим.
    }
    this.clearLocalSession()
    this.post({ type: 'logout' })
    return { success: true }
  }

  // ---------- Прочие эндпоинты ----------

  async getTranslations(page: string): Promise<GetTranslationsResponse> {
    return this.request<GetTranslationsResponse>(`/v1/translations/${page}`)
  }

  async getBranches(): Promise<GetBranchesResponse> {
    return this.request<GetBranchesResponse>('/v1/company/branches/get')
  }

  async getMenu(): Promise<GetMenuResponse> {
    return this.request<GetMenuResponse>('/v1/menu')
  }

  async getUsers(): Promise<GetUsersResponse> {
    return this.request<GetUsersResponse>('/v1/users')
  }

  async getTenants(): Promise<GetTenantsResponse> {
    return this.request<GetTenantsResponse>('/v1/tenants')
  }

  async getRoles(domain?: string): Promise<GetRolesResponse> {
    const qs = domain ? `?domain=${encodeURIComponent(domain)}` : ''
    return this.request<GetRolesResponse>(`/v1/roles${qs}`)
  }

  async getPermissions(domain?: string): Promise<GetPermissionsResponse> {
    const qs = domain ? `?domain=${encodeURIComponent(domain)}` : ''
    return this.request<GetPermissionsResponse>(`/v1/permissions${qs}`)
  }

  async createRole(data: CreateRoleRequest): Promise<Role> {
    return this.request<Role>('/v1/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async setRolePermissions(code: string, data: SetRolePermissionsRequest): Promise<Role> {
    return this.request<Role>(`/v1/roles/${encodeURIComponent(code)}/permissions`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteRole(code: string): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(`/v1/roles/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    })
  }

  async createUser(data: CreateUserRequest): Promise<ApiUser> {
    return this.request<ApiUser>('/v1/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateUser(id: number, data: UpdateUserRequest): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/v1/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async changeUserPassword(id: number, password: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/v1/users/${id}/password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  }

  async deleteUser(id: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/v1/users/${id}`, {
      method: 'DELETE',
    })
  }

  // ---------- Profile ----------

  /** Загрузить свою иконку (multipart/form-data, поле `file`). */
  async uploadMyIcon(file: Blob): Promise<IconResponse> {
    const form = new FormData()
    form.append('file', file)
    return this.request<IconResponse>('/v1/me/icon', {
      method: 'POST',
      body: form,
    })
  }

  /** Снять свою иконку. Идемпотентно: отсутствие иконки — это 200, не 404. */
  async deleteMyIcon(): Promise<SuccessResponse> {
    return this.request<SuccessResponse>('/v1/me/icon', {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()
export default apiClient