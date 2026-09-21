import apiClient from '../api/client'
import { mockApiClient, MOCK_TRANSLATIONS } from '../api/mockApiClient'
import { USE_MOCK } from '../config'
import type {
  TranslationResponse,
  GetTranslationsResponse,
  TranslationPagesResponse,
  TranslationPageItem,
  SaveTranslationRequest,
  TranslationItem,
  SuccessResponse,
} from '../types/api'

/**
 * Версия схемы кэша. Баump при изменении состава/структуры ключей MOCK_TRANSLATIONS
 * (или при любых правках данных в мок-режиме), чтобы старый localStorage не
 * подсовывал удалённые/переименованные ключи как актуальные.
 */
const CACHE_VERSION = 'v2'
const STORAGE_PREFIX = `translations_${CACHE_VERSION}_`

export function getFromStorage(page: string): TranslationResponse | null {
  try {
    const key = `${STORAGE_PREFIX}${page}`
    const data = localStorage.getItem(key)
    if (data) {
      const parsed = JSON.parse(data)
      // Check if translations are not older than 24 hours
      const age = Date.now() - parsed.timestamp
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      if (age < maxAge) {
        return parsed.translations
      }
    }
  } catch (e) {
    console.warn('Failed to read translations from localStorage:', e)
  }
  return null
}

export function saveToStorage(page: string, translations: TranslationResponse): void {
  try {
    const key = `${STORAGE_PREFIX}${page}`
    const data = {
      translations,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save translations to localStorage:', e)
  }
}

/** Приводит ответ API (ключи без префикса) к плоскому виду с префиксом страницы: { ['login.title']: '...' } */
function normalizeApiTranslations(raw: GetTranslationsResponse): TranslationResponse {
  const flat: TranslationResponse = {}
  for (const [key, value] of Object.entries(raw.items)) {
    flat[`${raw.page}.${key}`] = value
  }
  return flat
}

export async function fetchTranslations(page: string): Promise<TranslationResponse> {
  if (USE_MOCK) {
    const translations = await mockApiClient.getTranslations(page)
    saveToStorage(page, translations)
    return translations
  }

  // Real API call
  try {
    const raw = await apiClient.getTranslations(page)
    const translations = normalizeApiTranslations(raw)
    saveToStorage(page, translations)
    return translations
  } catch (error) {
    console.error('Failed to fetch translations from API:', error)

    // Fallback to cached/mock data
    const cachedTranslations = getFromStorage(page)
    return cachedTranslations || MOCK_TRANSLATIONS[page] || {}
  }
}

/** Получить плоский словарь конкретной страницы для редактора (page.key → value). */
export async function fetchPageTranslations(page: string): Promise<TranslationResponse> {
  if (USE_MOCK) {
    // mockApiClient отдаёт ответ в формате API ({ page, language, items }).
    const response = await (mockApiClient as unknown as {
      getTranslations: (page: string) => Promise<GetTranslationsResponse>
    }).getTranslations(page)
    const flat: TranslationResponse = {}
    for (const [key, value] of Object.entries(response.items)) {
      flat[`${response.page}.${key}`] = value
    }
    saveToStorage(page, flat)
    return flat
  }

  try {
    const raw = await apiClient.getTranslations(page)
    const flat = normalizeApiTranslations(raw)
    saveToStorage(page, flat)
    return flat
  } catch (error) {
    console.error(`Failed to fetch translations for ${page}:`, error)
    throw error
  }
}

/** Список страниц переводов с числом заполненных ключей. */
export async function fetchTranslationPages(): Promise<TranslationPageItem[]> {
  if (USE_MOCK) {
    const response: TranslationPagesResponse = await (
      mockApiClient as unknown as { getTranslationPages: () => Promise<TranslationPagesResponse> }
    ).getTranslationPages()
    return response.items
  }
  const response = await apiClient.getTranslationPages()
  return response.items
}

/** Вставить/обновить перевод. PUT, не POST — ресурс задан клиентом целиком. */
export async function saveTranslation(
  page: string,
  key: string,
  value: string,
): Promise<TranslationItem> {
  const payload: SaveTranslationRequest = { value }
  if (USE_MOCK) {
    const item = await (
      mockApiClient as unknown as {
        saveTranslation: (page: string, key: string, data: SaveTranslationRequest) => Promise<TranslationItem>
      }
    ).saveTranslation(page, key, payload)
    invalidateStorage(page)
    return item
  }
  const item = await apiClient.saveTranslation(page, key, payload)
  invalidateStorage(page)
  return item
}

/** Удалить перевод. 404 на отсутствующий — не идемпотентный кейс. */
export async function deleteTranslation(page: string, key: string): Promise<SuccessResponse> {
  if (USE_MOCK) {
    const result = await (
      mockApiClient as unknown as {
        deleteTranslation: (page: string, key: string) => Promise<SuccessResponse>
      }
    ).deleteTranslation(page, key)
    invalidateStorage(page)
    return result
  }
  const result = await apiClient.deleteTranslation(page, key)
  invalidateStorage(page)
  return result
}

/** Сбрасывает кэш страницы, чтобы следующее чтение пошло в API/moc с нуля. */
function invalidateStorage(page: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${page}`)
  } catch {
    // localStorage может быть недоступен — это не критично.
  }
}
