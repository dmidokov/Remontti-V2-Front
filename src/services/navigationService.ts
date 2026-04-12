import apiClient from '../api/client'
import type { NavItem } from '../types/api'

// Use mock mode (set to false to use real API)
const USE_MOCK = true

const MOCK_NAV_ITEMS: NavItem[] = [
  {
    id: 1,
    name: 'Dashboard',
    link: '/dashboard',
    iconUrl: '/vite.svg',
  },
  {
    id: 2,
    name: 'Branches',
    link: '/branches',
    iconUrl: '/vite.svg',
  },
  {
    id: 3,
    name: 'Management',
    link: '/management',
    iconUrl: '/vite.svg',
  },
]

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function getNavigation(): Promise<NavItem[]> {
  if (USE_MOCK) {
    await delay(300)
    return MOCK_NAV_ITEMS
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
