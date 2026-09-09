import apiClient from '../api/client'
import { mockApiClient } from '../api/mockApiClient'
import { syncStore } from '../db'
import { USE_MOCK } from '../config'
import type { NavItem } from '../types/api'

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
    name: 'Users',
    link: '/users',
    iconUrl: '/icons/users.svg',
  },
  {
    id: 4,
    name: 'Management',
    link: '/management',
    iconUrl: '/icons/management.svg',
  },
]

export async function seedNavigation(): Promise<void> {
  await syncStore('navigation', INITIAL_NAV_ITEMS)
}

export async function getNavigation(): Promise<NavItem[]> {
  try {
    return USE_MOCK
      ? await mockApiClient.getNavigation()
      : await apiClient.getNavigation()
  } catch (error) {
    console.error('Failed to fetch navigation:', error)
    throw error
  }
}