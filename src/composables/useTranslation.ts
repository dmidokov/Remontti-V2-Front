import { ref, readonly } from 'vue'
import { fetchTranslations, getFromStorage, saveToStorage } from '../services/translationService'
import type { TranslationResponse } from '../types/api'

const translationsStore = ref<TranslationResponse>({})
const isLoading = ref(false)
const isLoaded = ref(false)

export function useTranslation() {
  const loadTranslations = async (page: string) => {
    // Check localStorage first
    const cachedTranslations = getFromStorage(page)
    
    if (cachedTranslations) {
      // Use cached translations immediately
      translationsStore.value = {
        ...translationsStore.value,
        ...cachedTranslations,
      }
      isLoaded.value = true
    }
    
    // Load fresh translations from backend in background
    isLoading.value = true
    try {
      const freshTranslations = await fetchTranslations(page)
      
      if (freshTranslations && Object.keys(freshTranslations).length > 0) {
        // Update store with fresh translations
        translationsStore.value = {
          ...translationsStore.value,
          ...freshTranslations,
        }
        
        // Save to localStorage
        saveToStorage(page, freshTranslations)
      }
      
      isLoaded.value = true
    } catch (error) {
      console.error('Failed to load translations from backend:', error)
      // If we have cached translations, we're still good
      if (cachedTranslations) {
        isLoaded.value = true
      }
    } finally {
      isLoading.value = false
    }
  }

  const t = (key: string, defaultValue = ''): string => {
    return translationsStore.value[key] || defaultValue
  }

  return {
    loadTranslations,
    t,
    isLoading: readonly(isLoading),
    isLoaded: readonly(isLoaded),
  }
}
