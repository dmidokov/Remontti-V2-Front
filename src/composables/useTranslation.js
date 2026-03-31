import { ref, readonly } from 'vue'
import { fetchTranslations } from '../services/translationService'

const translationsStore = ref({})
const isLoading = ref(false)
const isLoaded = ref(false)

export function useTranslation() {
  const loadTranslations = async (page) => {
    isLoading.value = true
    try {
      const translations = await fetchTranslations(page)
      translationsStore.value = {
        ...translationsStore.value,
        ...translations,
      }
      isLoaded.value = true
    } catch (error) {
      console.error('Failed to load translations:', error)
    } finally {
      isLoading.value = false
    }
  }

  const t = (key, defaultValue = '') => {
    return translationsStore.value[key] || defaultValue
  }

  return {
    loadTranslations,
    t,
    isLoading: readonly(isLoading),
    isLoaded: readonly(isLoaded),
  }
}
