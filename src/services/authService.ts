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

    if (response.success) {
      // Real API не возвращает объект user — собираем минимальный из доступных данных
      const user: UserAuth = response.user ?? ({
        login: loginValue,
        startPage: response.start_page || '/dashboard',
      } as UserAuth)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
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
  clearSession()

  if (USE_MOCK) {
    return
  }

  apiClient.logout().catch(console.error)
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

/** Проверяет срок жизни JWT по полю exp (без обращения к серверу). */
export function isTokenExpired(): boolean {
  const token = getToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (typeof payload.exp !== 'number') return false
    return payload.exp * 1000 < Date.now()
  } catch (e) {
    return false
  }
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
  if (!getCurrentUser()) return false
  // Mock-режим сессию по токену не хранит
  if (USE_MOCK) return true
  return getToken() !== null
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export interface LoginResponse {
  success: boolean
  user?: UserAuth
  token?: string
  start_page?: string
  error?: string
}