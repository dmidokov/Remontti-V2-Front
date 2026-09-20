import apiClient from '../api/client'
import { mockApiClient } from '../api/mockApiClient'
import { USE_MOCK } from '../config'
import type { UserAuth, LoginRequest, LoginResponse } from '../types/api'

const STORAGE_KEY = 'auth_user'

export async function login(loginValue: string, passwordValue: string): Promise<LoginResponse> {
  const request: LoginRequest = { login: loginValue, password: passwordValue }

  try {
    const response = USE_MOCK
      ? await mockApiClient.login(request)
      : await apiClient.login(request)

    if (response.success) {
      // Real API не возвращает объект user — собираем из полей ответа (включая name/last_name).
      // Токены (access в память, refresh в localStorage) раскладывает apiClient.login.
      const user: UserAuth = response.user ?? {
        login: loginValue,
        name: response.name || loginValue,
        last_name: response.last_name,
        startPage: response.start_page || '/dashboard',
      } as UserAuth
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
  if (!USE_MOCK) {
    // Отзыв сессии на бэкенде + чистка локали + вывод остальных вкладок через канал.
    void apiClient.logout().catch(console.error)
  }
  clearSession()
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY)
  apiClient.resetSession()
}

/** Проверяет срок жизни access-токена текущей вкладки по полю exp (без обращения к серверу). */
export function isTokenExpired(): boolean {
  const token = apiClient.getAccessToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
  } catch {
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
  // Mock-режим сессию по токенам не хранит.
  if (USE_MOCK) return true
  // Сессия есть, если есть access (в памяти вкладки) или refresh (в localStorage).
  return apiClient.hasAccessToken() || apiClient.hasRefreshToken()
}

/**
 * Гарантирует валидный access перед входом на защищённый роут:
 * восстанавливает по refresh после F5/перезагрузки либо возвращает false.
 */
export async function ensureSession(): Promise<boolean> {
  if (!getCurrentUser()) return false
  if (USE_MOCK) return true
  return apiClient.ensureAccessToken()
}

export function getToken(): string | null {
  return apiClient.getAccessToken()
}