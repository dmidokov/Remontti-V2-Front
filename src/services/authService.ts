import apiClient from '../api/client'
import type { UserAuth, LoginRequest, LoginResponse as ApiLoginResponse } from '../types/api'

const MOCK_USER: UserAuth = {
  login: 't.test',
  password: undefined as never,
  name: 'Test User',
  email: 't.test@company.com',
  role: 'admin',
}

const MOCK_PASSWORD = 'password'

const STORAGE_KEY = 'auth_user'
const TOKEN_KEY = 'auth_token'

// Use mock mode (set to false to use real API)
const USE_MOCK = true

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function login(loginValue: string, passwordValue: string): Promise<LoginResponse> {
  if (USE_MOCK) {
    await delay(500)

    if (loginValue === MOCK_USER.login && passwordValue === MOCK_PASSWORD) {
      const user = { ...MOCK_USER }
      delete (user as any).password
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      return { success: true, user }
    }

    return {
      success: false,
      error: 'Invalid login or password'
    }
  }

  // Real API call
  try {
    const response = await apiClient.login({ login: loginValue, password: passwordValue })

    if (response.success && response.user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user))
    }

    return response
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    }
  }
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY)
  
  if (USE_MOCK) {
    return
  }

  apiClient.logout().catch(console.error)
}

export function getCurrentUser(): UserAuth | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.warn('Failed to parse user data:', e)
  }
  return null
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export interface LoginResponse {
  success: boolean
  user?: UserAuth
  token?: string
  error?: string
}
