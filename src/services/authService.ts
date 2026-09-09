import apiClient from '../api/client'
import { mockApiClient } from '../api/mockApiClient'
import { USE_MOCK } from '../config'
import type { UserAuth, LoginRequest } from '../types/api'

const STORAGE_KEY = 'auth_user'
const TOKEN_KEY = 'auth_token'

export async function login(loginValue: string, passwordValue: string): Promise<LoginResponse> {
  const request: LoginRequest = { login: loginValue, password: passwordValue }

  try {
    const response = USE_MOCK
      ? await mockApiClient.login(request)
      : await apiClient.login(request)

    if (response.success && response.user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user))
    }

    return response
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
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