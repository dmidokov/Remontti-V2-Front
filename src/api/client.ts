import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  TranslationResponse,
  ApiError,
} from '../types/api'

const API_BASE = '/api'

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
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
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async logout(): Promise<LogoutResponse> {
    return this.request<LogoutResponse>('/auth/logout', {
      method: 'POST',
    })
  }

  // Translations endpoints
  async getTranslations(page: string): Promise<TranslationResponse> {
    return this.request<TranslationResponse>(`/translations/${page}`)
  }
}

export const apiClient = new ApiClient()
export default apiClient
