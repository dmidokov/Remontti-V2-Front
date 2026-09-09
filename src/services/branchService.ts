import apiClient from '../api/client'
import { mockApiClient } from '../api/mockApiClient'
import { USE_MOCK } from '../config'
import type { Branch } from '../types/api'

const STORAGE_KEY = 'selected_branch'

export async function getBranches(): Promise<Branch[]> {
  try {
    const response = USE_MOCK
      ? await mockApiClient.getBranches()
      : await apiClient.getBranches()
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