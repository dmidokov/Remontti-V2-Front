import apiClient from '../api/client'
import type { Branch, GetBranchesResponse } from '../types/api'

const STORAGE_KEY = 'selected_branch'

// Use mock mode (set to false to use real API)
const USE_MOCK = true

const MOCK_BRANCHES: Branch[] = [
  {
    id: 1,
    name: 'Плаза',
    code: 'plaza',
    address: 'ТЦ Плаза, ул. Примерная 1',
    isActive: true,
  },
  {
    id: 2,
    name: 'Мастерская',
    code: 'workshop',
    address: 'ул. Рабочая 15',
    isActive: true,
  },
]

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function getBranches(): Promise<Branch[]> {
  if (USE_MOCK) {
    await delay(300)
    return MOCK_BRANCHES.filter(b => b.isActive)
  }

  try {
    const response = await apiClient.getBranches()
    return response.branches.filter(b => b.isActive)
  } catch (error) {
    console.error('Failed to fetch branches:', error)
    return []
  }
}

export function selectBranch(branch: Branch): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(branch))
}

export function getSelectedBranch(): Branch | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.warn('Failed to parse branch data:', e)
  }
  return null
}

export function clearSelectedBranch(): void {
  localStorage.removeItem(STORAGE_KEY)
}
