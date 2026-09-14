import { kvGet, kvSet, getAll, add, remove, update } from '../db'
import { getCurrentHost } from '../utils/host'
import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  TranslationResponse,
  GetBranchesResponse,
  GetMenuResponse,
  GetUsersResponse,
  GetTenantsResponse,
  GetRolesResponse,
  GetPermissionsResponse,
  CreateUserRequest,
  UpdateUserRequest,
  MenuItem,
  Branch,
  Tenant,
  Role,
  Permission,
  User,
  UserAuth,
  ApiUser,
} from '../types/api'

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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

const MOCK_TENANTS: Tenant[] = [
  { domain: 'control.remontti.site', name: 'Управление CRM' },
  { domain: 'work.remontti.site', name: 'Рабочий тенант' },
]

const MOCK_ROLES: Record<string, Role[]> = {
  'control.remontti.site': [{ code: 'crm_admin', title_key: 'roles.crm_admin' }],
  'work.remontti.site': [
    { code: 'admin', title_key: 'roles.admin' },
    { code: 'manager', title_key: 'roles.manager' },
  ],
}

const MOCK_PERMISSIONS: Permission[] = [
  { code: 'dashboard.view', title_key: 'permissions.dashboard.view' },
  { code: 'orders.view', title_key: 'permissions.orders.view' },
  { code: 'clients.view', title_key: 'permissions.clients.view' },
  { code: 'objects.view', title_key: 'permissions.objects.view' },
  { code: 'brigades.view', title_key: 'permissions.brigades.view' },
  { code: 'estimates.view', title_key: 'permissions.estimates.view' },
  { code: 'warehouse.view', title_key: 'permissions.warehouse.view' },
  { code: 'finance.view', title_key: 'permissions.finance.view' },
  { code: 'reports.view', title_key: 'permissions.reports.view' },
  { code: 'settings.view', title_key: 'permissions.settings.view' },
  { code: 'users.view', title_key: 'permissions.users.view' },
  { code: 'users.create', title_key: 'permissions.users.create' },
  { code: 'users.update', title_key: 'permissions.users.update' },
  { code: 'users.delete', title_key: 'permissions.users.delete' },
  { code: 'users.create.cross_tenant', title_key: 'permissions.users.create.cross_tenant' },
  { code: 'tenants.view', title_key: 'permissions.tenants.view' },
]

const MOCK_TRANSLATIONS: Record<string, TranslationResponse> = {
  login: {
    'login.title': 'Ремонтти Версия 2.0',
    'login.subtitle': 'Enter your credentials to access your account',
    'login.login.label': 'Login',
    'login.login.placeholder': 'john.doe',
    'login.password.label': 'Password',
    'login.password.placeholder': 'Enter your password',
    'login.remember_me': 'Запомни меня',
    'login.forgot_password': 'Forgot password?',
    'login.sign_in': 'Войти',
    'login.signing_in': 'Signing in...',
    'login.no_account': "Don't have an account?",
    'login.contact_admin': 'Contact administrator',
    'login.error.required': 'Please fill in all fields',
    'login.error.invalid_format': 'Please enter a valid login (format: string.string)',
    'login.error.invalid_credentials': 'Invalid login or password',
  },
  dashboard: {
    'dashboard.title': 'CRM System',
    'dashboard.logout': 'Logout',
    'dashboard.welcome': 'Welcome back!',
    'dashboard.welcome_text': 'Here\'s what\'s happening with your projects today.',
    'dashboard.projects': 'Projects',
    'dashboard.team_members': 'Team Members',
    'dashboard.completed': 'Completed',
    'dashboard.in_progress': 'In Progress',
  },
  branches: {
    'branches.title': 'Выберите филиал',
    'branches.subtitle': 'Где вы будете работать сегодня?',
    'branches.status.active': 'Активен',
    'branches.status.inactive': 'Не активен',
    'branches.continue': 'Продолжить',
    'branches.submitting': 'Загрузка...',
    'branches.error.load_failed': 'Не удалось загрузить список филиалов',
    'branches.error.select_branch': 'Пожалуйста, выберите филиал',
  },
  management: {
    'management.users': 'Работники',
    'management.users_desc': 'Управление работниками. Создание/редактирование/удаление',
    'management.branches': 'Филиалы',
    'management.manage': 'Открыть',
    'management.welcome': 'Управление',
    'management.description': 'общие настройки / меню и описание будут редактироваться - эти надпи для теста ',
  },
  users: {
    'users.title': 'Пользователи',
    'users.subtitle': 'Управление пользователями системы',
    'users.add': 'Добавить пользователя',
    'users.loading': 'Загрузка пользователей...',
    'users.error_load': 'Не удалось загрузить пользователей',
    'users.search_placeholder': 'Поиск по логину, домену или роли...',
    'users.field_domain': 'Домен',
    'users.field_created': 'Создан',
    'users.field_roles': 'Роли',
    'users.field_permissions': 'Права',
    'users.view_permissions_btn': 'Показать',
    'users.view_permissions_title': 'Права пользователя',
    'users.edit': 'Изменить',
    'users.delete': 'Удалить',
    'users.delete_confirm': 'Удалить пользователя',
    'users.no_results': 'Ничего не найдено по запросу',
    'users.add_title': 'Добавить пользователя',
    'users.edit_title': 'Изменить пользователя',
    'users.login': 'Логин',
    'users.name': 'Имя / Фамилия',
    'users.name_placeholder': 'Иван Иванов',
    'users.login_auto': 'Логин (формируется автоматически)',
    'users.password': 'Пароль',
    'users.new_password': 'Новый пароль',
    'users.roles': 'Роли',
    'users.permissions': 'Права',
    'users.no_items': 'Нет доступных значений',
    'users.password_placeholder_edit': 'Оставьте пустым, чтобы не менять',
    'users.password_too_short': 'Пароль должен быть не короче 8 символов',
    'users.error_failed_options': 'Не удалось загрузить роли/права',
    'users.tenant': 'Тенант',
    'users.tenant_current': 'Текущий тенант',
    'users.cancel': 'Отмена',
    'users.create': 'Создать',
    'users.save': 'Сохранить',
    'users.saving': 'Сохранение...',
    'users.toast_created': 'Пользователь создан',
    'users.toast_updated': 'Пользователь обновлён',
    'users.toast_deleted': 'Пользователь удалён',
    'users.error_required_name': 'Введите имя и фамилию',
    'users.error_required_password': 'Введите пароль',
    'users.error_failed_save': 'Не удалось сохранить пользователя',
    'users.error_failed_delete': 'Не удалось удалить пользователя',
    'users.error_failed_tenants': 'Не удалось загрузить список тенантов',
  },
}

/** Эмуляция бэкенда на IndexedDB + localStorage. Методы повторяют интерфейс реального ApiClient. */
export class MockApiClient {
  async login(data: LoginRequest): Promise<LoginResponse> {
    await delay(500)

    const currentHost = getCurrentHost()
    const credentials = await kvGet<Record<string, string>>('credentials')
    const storedPassword = credentials?.[data.login]

    if (storedPassword && data.password === storedPassword) {
      const users = await getAll<User>('users')
      const user = users.find(u => u.login === data.login)

      if (user) {
        // Проверяем соответствие поддомена
        if (user.host && user.host !== 'localhost' && user.host !== currentHost && currentHost !== 'localhost') {
          return {
            success: false,
            error: 'Этот пользователь не доступен на данном поддомене',
          }
        }

        const userAuth: UserAuth = { ...user }
        return { success: true, user: userAuth }
      }
    }

    return {
      success: false,
      error: 'Invalid login or password',
    }
  }

  async logout(): Promise<LogoutResponse> {
    return { success: true }
  }

  async getTranslations(page: string): Promise<TranslationResponse> {
    await delay(300)
    return MOCK_TRANSLATIONS[page] || {}
  }

  async getBranches(): Promise<GetBranchesResponse> {
    await delay(300)
    return { success: true, branches: MOCK_BRANCHES }
  }

  async getNavigation(): Promise<GetMenuResponse> {
    await delay(300)
    const items = await getAll<MenuItem>('navigation')
    return { domain: `${getCurrentHost()}.remontti.site`, items }
  }

  private toApiUser(user: User & { id?: number }): ApiUser {
    return {
      id: user.id!,
      login: user.login,
      domain: user.host && user.host !== 'localhost'
        ? `${user.host}.remontti.site`
        : `${getCurrentHost()}.remontti.site`,
      creator: null,
      created_at: new Date().toISOString(),
      roles: user.roles ?? [user.role],
      direct_permissions: user.direct_permissions ?? [],
    }
  }

  async getUsers(): Promise<GetUsersResponse> {
    await delay(300)
    const users = await getAll<User>('users')
    return {
      items: users.map(u => this.toApiUser(u)),
      permissions: ['users.view', 'users.create', 'users.update', 'users.delete', 'users.create.cross_tenant', 'tenants.view'],
    }
  }

  async getTenants(): Promise<GetTenantsResponse> {
    await delay(300)
    return { items: MOCK_TENANTS }
  }

  async getRoles(domain?: string): Promise<GetRolesResponse> {
    await delay(300)
    const d = domain || `${getCurrentHost()}.remontti.site`
    return { domain: d, items: MOCK_ROLES[d] || [] }
  }

  async getPermissions(_domain?: string): Promise<GetPermissionsResponse> {
    await delay(300)
    return { items: MOCK_PERMISSIONS }
  }

  async createUser(data: CreateUserRequest): Promise<ApiUser> {
    await delay(500)
    const existing = await getAll<User>('users')
    if (existing.some(u => u.login === data.login)) {
      throw new Error('Логин уже существует')
    }

    const host = data.domain ? data.domain.split('.')[0] : getCurrentHost()
    const user: User = {
      login: data.login,
      email: `${data.login}@${host}.remontti.site`,
      name: data.login,
      role: 'user',
      startPage: '/dashboard',
      host,
      settings_right: 0,
    }
    const id = await add<User>('users', user)

    // Добавляем пароль в credentials, чтобы mock-логин работал
    const credentials = (await kvGet<Record<string, string>>('credentials')) || {}
    await kvSet('credentials', { ...credentials, [data.login]: data.password })

    return this.toApiUser({ ...user, id })
  }

  async updateUser(id: number, data: UpdateUserRequest): Promise<{ success: boolean; roles: string[]; direct_permissions: string[] }> {
    await delay(500)
    const users = await getAll<User>('users')
    const user = users.find(u => u.id === id)
    if (!user) {
      throw new Error(`User ${id} not found`)
    }

    if (data.roles) user.roles = data.roles
    if (data.permissions) user.direct_permissions = data.permissions
    await update<User & { id: number }>('users', user as User & { id: number })

    return { success: true, roles: user.roles ?? [], direct_permissions: user.direct_permissions ?? [] }
  }

  async changeUserPassword(id: number, password: string): Promise<{ success: boolean }> {
    await delay(400)
    if (password.length < 8) {
      throw new Error('пароль короче 8 символов')
    }

    const users = await getAll<User>('users')
    const user = users.find(u => u.id === id)
    if (!user) {
      throw new Error(`User ${id} not found`)
    }

    const credentials = (await kvGet<Record<string, string>>('credentials')) || {}
    await kvSet('credentials', { ...credentials, [user.login]: password })
    return { success: true }
  }

  async deleteUser(id: number): Promise<{ success: boolean }> {
    await delay(300)
    await remove('users', id)
    return { success: true }
  }
}

export const mockApiClient = new MockApiClient()
export { MOCK_TRANSLATIONS }