import apiClient from '../api/client'
import type { TranslationResponse } from '../types/api'

// Mock translations data (used as fallback)
const mockTranslations: Record<string, TranslationResponse> = {
  login: {
    'login.title': 'Ремонтти Версия 2.0',
    'login.subtitle': 'Enter your credentials to access your account',
    'login.login.label': 'Login',
    'login.login.placeholder': 'john.doe',
    'login.password.label': 'Password',
    'login.password.placeholder': 'Enter your password',
    'login.remember_me': 'Запомни меня',
    'login.forgot_password': 'Forgot password?',
    'login.sign_in': 'Войти',
    'login.signing_in': 'Signing in...',
    'login.no_account': "Don't have an account?",
    'login.contact_admin': 'Contact administrator',
    'login.error.required': 'Please fill in all fields',
    'login.error.invalid_format': 'Please enter a valid login (format: string.string)',
    'login.error.invalid_credentials': 'Invalid login or password',
  },
  dashboard: {
    'dashboard.title': 'CRM System',
    'dashboard.logout': 'Logout',
    'dashboard.welcome': 'Welcome back!',
    'dashboard.welcome_text': 'Here\'s what\'s happening with your projects today.',
    'dashboard.projects': 'Projects',
    'dashboard.team_members': 'Team Members',
    'dashboard.completed': 'Completed',
    'dashboard.in_progress': 'In Progress',
  },
  branches: {
    'branches.title': 'Выберите филиал',
    'branches.subtitle': 'Где вы будете работать сегодня?',
    'branches.status.active': 'Активен',
    'branches.status.inactive': 'Не активен',
    'branches.continue': 'Продолжить',
    'branches.submitting': 'Загрузка...',
    'branches.error.load_failed': 'Не удалось загрузить список филиалов',
    'branches.error.select_branch': 'Пожалуйста, выберите филиал',
  },
}

const STORAGE_PREFIX = 'translations_'

// Use mock mode (set to false to use real API)
const USE_MOCK = true

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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

export async function fetchTranslations(page: string): Promise<TranslationResponse> {
  if (USE_MOCK) {
    await delay(300) // Simulate network delay
    
    const translations = mockTranslations[page] || {}
    
    if (!translations) {
      console.warn(`No translations found for page: ${page}`)
    }
    
    return translations
  }
  
  // Real API call
  try {
    const translations = await apiClient.getTranslations(page)
    saveToStorage(page, translations)
    return translations
  } catch (error) {
    console.error('Failed to fetch translations from API:', error)
    
    // Fallback to mock data
    const cachedTranslations = getFromStorage(page)
    if (cachedTranslations) {
      return cachedTranslations
    }
    
    return mockTranslations[page] || {}
  }
}
