// Mock translations data (used as fallback)
const mockTranslations = {
  login: {
    'login.title': 'Ремонтти Версия 2.0',
    'login.subtitle': 'Enter your credentials to access your account',
    'login.login.label': 'Login',
    'login.login.placeholder': 'john.doe',
    'login.password.label': 'Password',
    'login.password.placeholder': 'Enter your password',
    'login.remember_me': 'Remember me',
    'login.forgot_password': 'Forgot password?',
    'login.sign_in': 'Sign In',
    'login.signing_in': 'Signing in...',
    'login.no_account': "Don't have an account?",
    'login.contact_admin': 'Contact administrator',
    'login.error.required': 'Please fill in all fields',
    'login.error.invalid_format': 'Please enter a valid login (format: string.string)',
  },
  dashboard: {
    // Dashboard translations will be added later
  },
}

const STORAGE_PREFIX = 'translations_'

function getFromStorage(page) {
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

function saveToStorage(page, translations) {
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

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function fetchTranslations(page) {
  // In production, this will be a real API call:
  // const response = await fetch(`/api/translations/${page}`)
  // return await response.json()
  
  await delay(300) // Simulate network delay
  
  const translations = mockTranslations[page] || {}
  
  if (!translations) {
    console.warn(`No translations found for page: ${page}`)
  }
  
  return translations
}

export { getFromStorage, saveToStorage }
