import { getAll, add, update, remove, kvSet, kvGet, getById, seedStore } from '../db'
import type { User } from '../types/api'

export type CreateUserInput = Pick<User, 'login' | 'email' | 'name' | 'role' | 'avatarUrl' | 'startPage' | 'host'>
export type UpdateUserInput = Partial<CreateUserInput> & { id: number }

const INITIAL_USERS: (CreateUserInput & { login: string })[] = [
  {
    login: 'remontti.admin',
    email: 'admin@remontti.com',
    name: 'Admin User',
    role: 'admin',
    startPage: '/management',
    host: 'work',
  },
  {
    login: 'test.employee',
    email: 'employee@remontti.com',
    name: 'Test Employee',
    role: 'employee',
    startPage: '/branches',
    host: 'work',
  },
  {
    login: 'super.admin',
    email: 'superadmin@remontti.com',
    name: 'Super Admin',
    role: 'admin',
    startPage: '/users',
    host: 'control',
  },
]

async function migrateUsersHost(): Promise<void> {
  const users = await getAll<User>('users')
  for (const user of users) {
    if (!user.host) {
      await update('users', { ...user, host: 'work' } as User & { id: number })
    }
  }
}

export async function seedUsers(): Promise<void> {
  // Seed auth credentials (login/password pairs) — всегда обновляем
  const credentials = await kvGet<Record<string, string>>('credentials') || {}
  await kvSet('credentials', {
    ...credentials,
    'remontti.admin': 'password',
    'test.employee': 'password',
    'super.admin': 'password',
  })

  // Миграция: добавить host существующим пользователям
  await migrateUsersHost()

  // Seed новых пользователей — add-only по login
  await seedStore('users', INITIAL_USERS, 'login')
}

export async function getUsers(): Promise<User[]> {
  return getAll<User>('users')
}

export async function getUserById(id: number): Promise<User | undefined> {
  return getById<User>('users', id)
}

export async function getUserByLogin(login: string): Promise<User | undefined> {
  const users = await getAll<User>('users')
  return users.find(u => u.login === login)
}

export async function createUser(data: CreateUserInput): Promise<number> {
  return add<User>('users', data as User)
}

export async function updateUser(data: UpdateUserInput): Promise<void> {
  const existing = await getUserById(data.id)
  if (!existing) throw new Error(`User ${data.id} not found`)
  const merged = { ...existing, ...data, id: data.id }
  return update('users', merged)
}

export async function deleteUser(id: number): Promise<void> {
  return remove('users', id)
}
