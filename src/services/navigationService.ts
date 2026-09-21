import apiClient from '../api/client'
import { mockApiClient } from '../api/mockApiClient'
import { seedStore } from '../db'
import { USE_MOCK } from '../config'
import type { MenuItem } from '../types/api'

const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    code: 'dashboard',
    parent_code: null,
    title_key: 'menu.dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    sort_order: 10,
  },
  {
    code: 'branches',
    parent_code: null,
    title_key: 'menu.branches',
    path: '/branches',
    icon: 'branches',
    sort_order: 20,
  },
  {
    code: 'users',
    parent_code: null,
    title_key: 'menu.users',
    path: '/users',
    icon: 'user-cog',
    sort_order: 30,
  },
  {
    code: 'roles',
    parent_code: null,
    title_key: 'menu.roles',
    path: '/roles',
    icon: 'shield',
    sort_order: 35,
  },
  {
    code: 'management',
    parent_code: null,
    title_key: 'menu.management',
    path: '/management',
    icon: 'management',
    sort_order: 40,
  },
  {
    code: 'translations',
    parent_code: null,
    title_key: 'menu.translations',
    path: '/translations',
    icon: 'translations',
    sort_order: 50,
  },
]

export async function seedNavigation(): Promise<void> {
  await seedStore('navigation', INITIAL_MENU_ITEMS, 'code')
}

export async function getNavigation(): Promise<MenuItem[]> {
  try {
    const response = USE_MOCK
      ? await mockApiClient.getNavigation()
      : await apiClient.getMenu()
    return response.items
  } catch (error) {
    console.error('Failed to fetch navigation:', error)
    throw error
  }
}