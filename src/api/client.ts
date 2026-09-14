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
    const response = await this.request<LoginResponse>('/v1/auth/login', {
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
      const response = await this.request<LogoutResponse>('/v1/auth/logout', {
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
  async getTranslations(page: string): Promise<GetTranslationsResponse> {
    return this.request<GetTranslationsResponse>(`/v1/translations/${page}`)
  }

  // Branch endpoints
  async getBranches(): Promise<GetBranchesResponse> {
    return this.request<GetBranchesResponse>('/v1/company/branches/get')
  }

// Menu endpoint
  async getMenu(): Promise<GetMenuResponse> {
    return this.request<GetMenuResponse>('/v1/menu')
  }

  // Users endpoints
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
}

export const apiClient = new ApiClient()
export default apiClient
