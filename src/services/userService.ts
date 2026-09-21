import apiClient from '../api/client'
import { mockApiClient } from '../api/mockApiClient'
import { kvSet, kvGet, seedStore, getAll } from '../db'
import { USE_MOCK } from '../config'
import type {
  ApiUser,
  GetUsersResponse,
  GetTenantsResponse,
  GetRolesResponse,
  GetPermissionsResponse,
  CreateUserRequest,
  UpdateUserRequest,
  SetUserBranchesRequest,
  UserBranchesResponse,
  User,
} from '../types/api'

const INITIAL_USERS: User[] = [
  {
    login: 'remontti.admin',
    email: 'admin@remontti.com',
    name: 'Admin User',
    role: 'admin',
    startPage: '/management',
    host: 'work',
    settings_right: 0b11111, // все биты
    branch_ids: [1, 2],
  },
  {
    login: 'test.employee',
    email: 'employee@remontti.com',
    name: 'Test Employee',
    role: 'employee',
    startPage: '/branches',
    host: 'work',
    settings_right: 0b00001, // только Users
    branch_ids: [1],
  },
  {
    login: 'super.admin',
    email: 'superadmin@remontti.com',
    name: 'Super Admin',
    role: 'admin',
    startPage: '/users',
    host: 'control',
    settings_right: 0b11111, // все биты
    branch_ids: [1, 2],
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

  // Seed привязок пользователей к точкам (user_branches) — add-only по логину.
  const existingUsers = await getAll<User & { id?: number }>('users')
  const byLogin = new Map(existingUsers.map(u => [u.login, u.id]))
  const userBranches = (await kvGet<Record<string, number[]>>('user_branches')) ?? {}
  let branchesChanged = false
  for (const u of INITIAL_USERS) {
    if (!u.branch_ids) continue
    const id = byLogin.get(u.login)
    if (typeof id !== 'number') continue
    const key = String(id)
    if (!(key in userBranches)) {
      userBranches[key] = [...u.branch_ids]
      branchesChanged = true
    }
  }
  if (branchesChanged) await kvSet('user_branches', userBranches)

  // Seed новых пользователей — add-only по login
  await seedStore('users', INITIAL_USERS, 'login')
}

export async function getUsers(): Promise<GetUsersResponse> {
  return USE_MOCK
    ? mockApiClient.getUsers()
    : apiClient.getUsers()
}

export async function getTenants(): Promise<GetTenantsResponse> {
  return USE_MOCK
    ? mockApiClient.getTenants()
    : apiClient.getTenants()
}

export async function createUser(data: CreateUserRequest): Promise<ApiUser> {
  return USE_MOCK
    ? mockApiClient.createUser(data)
    : apiClient.createUser(data)
}

export async function getRoles(domain?: string): Promise<GetRolesResponse> {
  return USE_MOCK
    ? mockApiClient.getRoles(domain)
    : apiClient.getRoles(domain)
}

export async function getPermissions(domain?: string): Promise<GetPermissionsResponse> {
  return USE_MOCK
    ? mockApiClient.getPermissions(domain)
    : apiClient.getPermissions(domain)
}

export async function updateUser(id: number, data: UpdateUserRequest): Promise<void> {
  if (USE_MOCK) {
    await mockApiClient.updateUser(id, data)
    return
  }
  await apiClient.updateUser(id, data)
}

export async function changeUserPassword(id: number, password: string): Promise<void> {
  if (USE_MOCK) {
    await mockApiClient.changeUserPassword(id, password)
    return
  }
  await apiClient.changeUserPassword(id, password)
}

export async function deleteUser(id: number): Promise<void> {
  if (USE_MOCK) {
    await mockApiClient.deleteUser(id)
    return
  }
  await apiClient.deleteUser(id)
}

export async function setUserBranches(
  userId: number,
  data: SetUserBranchesRequest,
): Promise<UserBranchesResponse> {
  return USE_MOCK
    ? mockApiClient.setUserBranches(userId, data)
    : apiClient.setUserBranches(userId, data)
}