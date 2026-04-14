import apiClient from '../api/client'
import { kvGet, kvSet, kvDelete } from '../db'
import { getUserByLogin } from './userService'
import { getCurrentHost } from '../utils/host'
import type { UserAuth, LoginRequest, LoginResponse as ApiLoginResponse } from '../types/api'

const STORAGE_KEY = 'auth_user'
const TOKEN_KEY = 'auth_token'

// Use mock mode (set to false to use real API)
const USE_MOCK = true

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getCredentials(): Promise<Record<string, string>> {
  const data = await kvGet<Record<string, string>>('credentials')
  return data || {}
}

export async function login(loginValue: string, passwordValue: string): Promise<LoginResponse> {
  if (USE_MOCK) {
    await delay(500)

    const currentHost = getCurrentHost()
    const credentials = await getCredentials()
    const storedPassword = credentials[loginValue]

    if (storedPassword && passwordValue === storedPassword) {
      const user = await getUserByLogin(loginValue)
      if (user) {
        // Проверяем соответствие поддомена
        if (user.host && user.host !== 'localhost' && user.host !== currentHost && currentHost !== 'localhost') {
          return {
            success: false,
            error: `Этот пользователь не доступен на данном поддомене`
          }
        }

        const { password: _, ...userWithoutPassword } = user as any
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithoutPassword))
        return { success: true, user: userWithoutPassword }
      }
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
