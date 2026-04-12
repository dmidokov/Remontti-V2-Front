import apiClient from '../api/client'
import { getAll, syncStore } from '../db'
import type { NavItem } from '../types/api'

// Use mock mode (set to false to use real API)
const USE_MOCK = true

const INITIAL_NAV_ITEMS: NavItem[] = [
  {
    id: 1,
    name: 'Dashboard',
    link: '/dashboard',
    iconUrl: '/icons/dashboard.svg',
  },
  {
    id: 2,
    name: 'Branches',
    link: '/branches',
    iconUrl: '/icons/branches.svg',
  },
  {
    id: 3,
    name: 'Management',
    link: '/management',
    iconUrl: '/icons/management.svg',
  },
]

export async function seedNavigation(): Promise<void> {
  await syncStore('navigation', INITIAL_NAV_ITEMS)
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function getNavigation(): Promise<NavItem[]> {
  if (USE_MOCK) {
    await delay(300)
    return getAll<NavItem>('navigation')
  }

  // Real API call
  try {
    const response = await apiClient.getNavigation()
    return response
  } catch (error) {
    console.error('Failed to fetch navigation:', error)
    throw error
  }
}
