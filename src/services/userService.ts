import apiClient from '../api/client'
import { mockApiClient } from '../api/mockApiClient'
import { kvSet, kvGet, seedStore } from '../db'
import { USE_MOCK } from '../config'
import type { ApiUser, GetUsersResponse, CreateUserRequest, UpdateUserRequest, User } from '../types/api'

const INITIAL_USERS: User[] = [
  {
    login: 'remontti.admin',
    email: 'admin@remontti.com',
    name: 'Admin User',
    role: 'admin',
    startPage: '/management',
    host: 'work',
    settings_right: 0b11111, // все биты
  },
  {
    login: 'test.employee',
    email: 'employee@remontti.com',
    name: 'Test Employee',
    role: 'employee',
    startPage: '/branches',
    host: 'work',
    settings_right: 0b00001, // только Users
  },
  {
    login: 'super.admin',
    email: 'superadmin@remontti.com',
    name: 'Super Admin',
    role: 'admin',
    startPage: '/users',
    host: 'control',
    settings_right: 0b11111, // все биты
  },
]

export async function seedUsers(): Promise<void> {
  // Seed auth credentials (login/password pairs) — всегда обновляем
  const credentials = (await kvGet<Record<string, string>>('credentials')) || {}
  await kvSet('credentials', {
    ...credentials,
    'remontti.admin': 'password',
    'test.employee': 'password',
    'super.admin': 'password',
  })

  // Seed новых пользователей — add-only по login
  await seedStore('users', INITIAL_USERS, 'login')
}

export async function getUsers(): Promise<GetUsersResponse> {
  return USE_MOCK
    ? mockApiClient.getUsers()
    : apiClient.getUsers()
}

export async function createUser(data: CreateUserRequest): Promise<ApiUser> {
  return USE_MOCK
    ? mockApiClient.createUser(data)
    : apiClient.createUser(data)
}

export async function updateUser(id: number, data: UpdateUserRequest): Promise<ApiUser> {
  return USE_MOCK
    ? mockApiClient.updateUser(id, data)
    : apiClient.updateUser(id, data)
}

export async function deleteUser(id: number): Promise<void> {
  if (USE_MOCK) {
    await mockApiClient.deleteUser(id)
    return
  }
  await apiClient.deleteUser(id)
}