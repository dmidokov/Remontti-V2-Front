import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  TranslationResponse,
  ApiError,
  GetBranchesResponse,
  NavItem,
} from '../types/api'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  private setToken(token: string | null): void {
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`

    const token = this.getToken()

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        // Если токен невалиден (401), очищаем его
        if (response.status === 401) {
          this.setToken(null)
        }

        const error: ApiError = await response.json().catch(() => ({
          status: response.status,
          message: 'Request failed',
        }))
        throw error
      }

      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    // Сохраняем токен если он есть в ответе
    if (response.token) {
      this.setToken(response.token)
    }
    
    return response
  }

  async logout(): Promise<LogoutResponse> {
    try {
      const response = await this.request<LogoutResponse>('/auth/logout', {
        method: 'POST',
      })
      this.setToken(null)
      return response
    } catch (error) {
      // Даже если запрос не удался, очищаем токен локально
      this.setToken(null)
      throw error
    }
  }

  // Translations endpoints
  async getTranslations(page: string): Promise<TranslationResponse> {
    return this.request<TranslationResponse>(`/translations/${page}`)
  }

  // Branch endpoints
  async getBranches(): Promise<GetBranchesResponse> {
    return this.request<GetBranchesResponse>('/company/branches/get')
  }

  // Navigation endpoints
  async getNavigation(): Promise<NavItem[]> {
    return this.request<NavItem[]>('/navigation/get')
  }
}

export const apiClient = new ApiClient()
export default apiClient
