import apiClient from '../api/client'
import { mockApiClient, MOCK_TRANSLATIONS } from '../api/mockApiClient'
import { USE_MOCK } from '../config'
import type { TranslationResponse, GetTranslationsResponse } from '../types/api'

const STORAGE_PREFIX = 'translations_'

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