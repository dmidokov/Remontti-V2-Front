import { kvGet, kvSet, getAll, add, remove, update } from '../db'
import { getCurrentHost } from '../utils/host'
import { setIcon, deleteIcon, listIcons } from '../db/mockIconStore'
import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  TranslationResponse,
  BranchesResponse,
  BranchItem,
  CreateBranchRequest,
  UpdateBranchRequest,
  SetUserBranchesRequest,
  UserBranchesResponse,
  GetMenuResponse,
  GetUsersResponse,
  GetTenantsResponse,
  GetRolesResponse,
  GetPermissionsResponse,
  CreateUserRequest,
  UpdateUserRequest,
  CreateRoleRequest,
  SetRolePermissionsRequest,
  SuccessResponse,
  MenuItem,
  Tenant,
  Role,
  Permission,
  User,
  UserAuth,
  ApiUser,
  IconResponse,
  TranslationPagesResponse,
  TranslationPageItem,
  SaveTranslationRequest,
  TranslationItem,
} from '../types/api'

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const PAGE_PATTERN = /^[a-z][a-z0-9_]*$/
const KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/

function mockError(status: number, code: string, message: string): Error & { status: number; code: string } {
  const err = new Error(message) as Error & { status: number; code: string }
  err.status = status
  err.code = code
  return err
}

function isPositiveId(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

/** Считает число ключей на каждой странице. MOCK_TRANSLATIONS[page] уже словарь. */
function countTranslationsByPage(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [page, inner] of Object.entries(MOCK_TRANSLATIONS)) {
    out[page] = Object.keys(inner).length
  }
  return out
}

const MOCK_BRANCHES: BranchItem[] = [
  {
    id: 1,
    name: 'Точка на Ленина',
    address: 'г. Казань, ул. Ленина, 12',
    phone: '+7 843 000-00-00',
  },
  {
    id: 2,
    name: 'Мастерская на Рабочей',
    address: 'г. Казань, ул. Рабочая, 15',
    phone: '',
  },
]

const MOCK_TENANTS: Tenant[] = [
  { domain: 'control.remontti.site', name: 'Управление CRM' },
  { domain: 'work.remontti.site', name: 'Рабочий тенант' },
]

const MOCK_ROLES: Record<string, Role[]> = {
  'control.remontti.site': [
    {
      code: 'crm_admin',
      title_key: 'roles.crm_admin',
      sort_order: 10,
      permissions: [
        'dashboard.view',
        'orders.view',
        'clients.view',
        'users.view',
        'users.create',
        'users.create.cross_tenant',
        'tenants.view',
        'settings.view',
      ],
    },
  ],
  'work.remontti.site': [
    {
      code: 'admin',
      title_key: 'roles.admin',
      sort_order: 10,
      permissions: [
        'dashboard.view',
        'orders.view',
        'clients.view',
        'users.view',
        'users.create',
        'settings.view',
      ],
    },
    {
      code: 'manager',
      title_key: 'roles.manager',
      sort_order: 20,
      permissions: [
        'dashboard.view',
        'orders.view',
        'clients.view',
        'objects.view',
        'estimates.view',
      ],
    },
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
  { code: 'users.create.cross_tenant', title_key: 'permissions.users.create.cross_tenant', system_only: true },
  { code: 'tenants.view', title_key: 'permissions.tenants.view', system_only: true },
  { code: 'branches.view', title_key: 'permissions.branches.view' },
  { code: 'branches.create', title_key: 'permissions.branches.create' },
  { code: 'branches.update', title_key: 'permissions.branches.update' },
  { code: 'branches.delete', title_key: 'permissions.branches.delete' },
  { code: 'branches.assign', title_key: 'permissions.branches.assign' },
]

// Права branches.* в моке зависят от логина вызывающего.
// branches.assign — отдельное право «доступ людей к точкам».
const BRANCH_PERMS_BY_LOGIN: Record<string, string[]> = {
  'remontti.admin': ['branches.view', 'branches.create', 'branches.update', 'branches.delete', 'branches.assign'],
  'super.admin': ['branches.view', 'branches.create', 'branches.update', 'branches.delete', 'branches.assign'],
  'test.employee': ['branches.view'],
}

function mockBranchPermissions(login: string): string[] {
  return BRANCH_PERMS_BY_LOGIN[login] ?? []
}

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
    'branches.title': 'Точки',
    'branches.subtitle': 'Справочник точек тенанта: филиалы и отделения',
    'branches.add': 'Создать точку',
    'branches.loading': 'Загрузка точек...',
    'branches.error_load': 'Не удалось загрузить список точек',
    'branches.error_no_access': 'Нет доступа к разделу',
    'branches.field_name': 'Название',
    'branches.field_address': 'Адрес',
    'branches.field_phone': 'Телефон',
    'branches.phone_empty_hint': 'Пусто — если телефон не задан',
    'branches.edit': 'Изменить',
    'branches.delete': 'Удалить',
    'branches.delete_confirm': 'Удалить точку',
    'branches.empty': 'Точек пока нет',
    'branches.add_title': 'Создать точку',
    'branches.edit_title': 'Изменить точку',
    'branches.name_placeholder': 'Например, Точка на Ленина',
    'branches.address_placeholder': 'г. Казань, ул. Ленина, 12',
    'branches.phone_placeholder': '+7 843 000-00-00',
    'branches.name_required': 'Введите название',
    'branches.address_required': 'Введите адрес',
    'branches.name_too_long': 'Название должно быть не длиннее 128 символов',
    'branches.address_too_long': 'Адрес должен быть не длиннее 255 символов',
    'branches.phone_too_long': 'Телефон должен быть не длиннее 32 символов',
    'branches.error_in_use': 'К точке подключены пользователи. Сначала снимите привязки.',
    'branches.toast_created': 'Точка создана',
    'branches.toast_updated': 'Точка изменена',
    'branches.toast_deleted': 'Точка удалена',
    'branches.error_save': 'Не удалось сохранить точку',
    'branches.error_delete': 'Не удалось удалить точку',
    'branches.cancel': 'Отмена',
    'branches.create': 'Создать',
    'branches.save': 'Сохранить',
    'branches.saving': 'Сохранение...',
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
  roles: {
    'roles.title': 'Роли и права',
    'roles.subtitle': 'Управление ролями системы',
    'roles.add': 'Добавить роль',
    'roles.loading': 'Загрузка ролей...',
    'roles.error_load': 'Не удалось загрузить роли',
    'roles.error_permissions': 'Не удалось загрузить каталог прав (нужно право users.view)',
    'roles.no_roles': 'Ролей пока нет',
    'roles.field_code': 'Код',
    'roles.field_sort': 'Порядок',
    'roles.field_permissions': 'Права',
    'roles.edit': 'Изменить',
    'roles.delete': 'Удалить',
    'roles.delete_confirm': 'Удалить роль',
    'roles.copy': 'Скопировать',
    'roles.add_title': 'Добавить роль',
    'roles.edit_title': 'Права роли',
    'roles.copy_title': 'Копировать роль',
    'roles.name': 'Название роли',
    'roles.name_placeholder': 'Например, «Менеджер по продажам»',
    'roles.code_hint': 'Код формируется из названия, можно отредактировать',
    'roles.sort_hint': 'Меньше — выше в списке',
    'roles.create': 'Создать',
    'roles.save': 'Сохранить',
    'roles.saving': 'Сохранение...',
    'roles.cancel': 'Отмена',
    'roles.no_perms_title': 'Нет доступа к каталогу прав',
    'roles.no_perms_desc': 'Каталог прав доступен при наличии права users.view',
    'roles.toast_created': 'Роль создана',
    'roles.toast_copied': 'Роль скопирована',
    'roles.toast_updated': 'Права роли обновлены',
    'roles.toast_deleted': 'Роль удалена',
    'roles.error_required_name': 'Введите название роли',
    'roles.error_code_invalid': 'Код: строчные латинские буквы, цифры и подчёркивания',
    'roles.error_failed_save': 'Не удалось сохранить роль',
    'roles.error_failed_delete': 'Не удалось удалить роль',
    'roles.error_copy_permissions': 'Роль создана, но права скопировать не удалось',
    'roles.system_only': 'системное',
    'roles.perms_count': 'прав',
    'roles.admin': 'Администратор',
    'roles.manager': 'Менеджер',
    'roles.crm_admin': 'Администратор CRM',
  },
  profile: {
    'profile.title': 'Личный кабинет',
    'profile.subtitle': 'Ваш профиль и настройки',
    'profile.upload': 'Загрузить иконку',
    'profile.delete': 'Удалить иконку',
    'profile.deleting': 'Удаление...',
    'profile.hint': 'PNG, JPEG или WebP, не больше 2 МиБ. После загрузки выберите область кадрирования — иконка отображается в кружке в левом верхнем углу.',
    'profile.crop_title': 'Выберите область',
    'profile.crop_hint': 'Тяните за рамку, чтобы переместить. За угол — чтобы изменить размер.',
    'profile.apply': 'Применить',
    'profile.cancel': 'Отмена',
    'profile.uploading': 'Загрузка...',
    'profile.confirm_delete': 'Удалить иконку?',
    'profile.toast_uploaded': 'Иконка обновлена',
    'profile.toast_deleted': 'Иконка удалена',
    'profile.error_unsupported_type': 'Поддерживаются только PNG, JPEG и WebP',
    'profile.error_too_large': 'Файл больше 2 МиБ',
    'profile.error_read_failed': 'Не удалось прочитать изображение',
    'profile.error_failed_upload': 'Не удалось сохранить иконку',
    'profile.error_failed_delete': 'Не удалось удалить иконку',
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

        const iconMap = await listIcons()
        const icon_url = iconMap.get(user.login) ?? ''
        const userAuth: UserAuth = { ...user, icon_url }
        return { success: true, user: userAuth, icon_url }
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

  async getBranches(): Promise<BranchesResponse> {
    await delay(300)
    const caller = this.getCallerLogin()
    const permissions = mockBranchPermissions(caller)
    const all = await getAll<BranchItem>('branches')
    const items = all.length > 0 ? all : MOCK_BRANCHES
    if (!permissions.includes('branches.view')) {
      throw mockError(403, 'BRANCHES_FORBIDDEN', 'Нет права branches.view')
    }
    // Предикат видимости: носитель branches.assign видит все, иначе — только user_branches.
    const visible = permissions.includes('branches.assign')
      ? items
      : await this.visibleBranchesForCaller(items, caller)
    return { items: visible, permissions }
  }

  async createBranch(data: CreateBranchRequest): Promise<BranchItem> {
    await delay(400)
    const caller = this.getCallerLogin()
    const permissions = mockBranchPermissions(caller)
    if (!permissions.includes('branches.create')) {
      throw mockError(403, 'BRANCHES_FORBIDDEN', 'Нет права branches.create')
    }
    const name = (data.name ?? '').trim()
    const address = (data.address ?? '').trim()
    const phone = (data.phone ?? '').trim()
    if (!name) throw mockError(400, 'NAME_REQUIRED', 'Название обязательно')
    if (name.length > 128) throw mockError(400, 'NAME_TOO_LONG', 'Название длиннее 128 символов')
    if (!address) throw mockError(400, 'ADDRESS_REQUIRED', 'Адрес обязателен')
    if (address.length > 255) throw mockError(400, 'ADDRESS_TOO_LONG', 'Адрес длиннее 255 символов')
    if (phone.length > 32) throw mockError(400, 'PHONE_TOO_LONG', 'Телефон длиннее 32 символов')
    const item: BranchItem = { id: 0, name, address, phone }
    const id = await add<BranchItem>('branches', item)
    return { ...item, id }
  }

  async updateBranch(id: number, data: UpdateBranchRequest): Promise<BranchItem> {
    await delay(400)
    if (!isPositiveId(id)) {
      throw mockError(400, 'BRANCH_ID_INVALID', 'id точки не положительное число')
    }
    const caller = this.getCallerLogin()
    const permissions = mockBranchPermissions(caller)
    if (!permissions.includes('branches.update')) {
      throw mockError(403, 'BRANCHES_FORBIDDEN', 'Нет права branches.update')
    }
    const all = await getAll<BranchItem>('branches')
    const existing = all.find(b => b.id === id) ?? MOCK_BRANCHES.find(b => b.id === id)
    if (!existing) throw mockError(404, 'BRANCH_NOT_FOUND', 'Точка не найдена')
    const name = (data.name ?? '').trim()
    const address = (data.address ?? '').trim()
    const phone = (data.phone ?? '').trim()
    if (!name) throw mockError(400, 'NAME_REQUIRED', 'Название обязательно')
    if (name.length > 128) throw mockError(400, 'NAME_TOO_LONG', 'Название длиннее 128 символов')
    if (!address) throw mockError(400, 'ADDRESS_REQUIRED', 'Адрес обязателен')
    if (address.length > 255) throw mockError(400, 'ADDRESS_TOO_LONG', 'Адрес длиннее 255 символов')
    if (phone.length > 32) throw mockError(400, 'PHONE_TOO_LONG', 'Телефон длиннее 32 символов')
    const updated: BranchItem = { id, name, address, phone }
    if (all.some(b => b.id === id)) {
      await update<BranchItem>('branches', updated)
    } else {
      // Точка из MOCK_BRANCHES — мигрируем в IndexedDB.
      await add<BranchItem>('branches', updated)
    }
    return updated
  }

  async deleteBranch(id: number): Promise<SuccessResponse> {
    await delay(300)
    if (!isPositiveId(id)) {
      throw mockError(400, 'BRANCH_ID_INVALID', 'id точки не положительное число')
    }
    const caller = this.getCallerLogin()
    const permissions = mockBranchPermissions(caller)
    if (!permissions.includes('branches.delete')) {
      throw mockError(403, 'BRANCHES_FORBIDDEN', 'Нет права branches.delete')
    }
    const all = await getAll<BranchItem>('branches')
    const exists = all.some(b => b.id === id) || MOCK_BRANCHES.some(b => b.id === id)
    if (!exists) throw mockError(404, 'BRANCH_NOT_FOUND', 'Точка не найдена')
    // Сначала проверка «на неё ссылаются» — 409 BRANCH_IN_USE.
    const refs = await this.userIdsWithBranch(id)
    if (refs.length > 0) {
      throw mockError(409, 'BRANCH_IN_USE', 'К точке подключены пользователи')
    }
    // Точка могла жить только в MOCK_BRANCHES — мигрируем в IDB перед удалением.
    if (!all.some(b => b.id === id)) {
      const stub = MOCK_BRANCHES.find(b => b.id === id)
      if (stub) await add<BranchItem>('branches', stub)
    }
    await remove('branches', id)
    return { success: true }
  }

  async setUserBranches(userId: number, data: SetUserBranchesRequest): Promise<UserBranchesResponse> {
    await delay(300)
    if (!isPositiveId(userId)) {
      throw mockError(400, 'USER_ID_INVALID', 'id пользователя не положительное число')
    }
    const caller = this.getCallerLogin()
    const permissions = mockBranchPermissions(caller)
    if (!permissions.includes('branches.assign')) {
      throw mockError(403, 'BRANCHES_FORBIDDEN', 'Нет права branches.assign')
    }
    const users = await getAll<User & { id: number }>('users')
    const target = users.find(u => u.id === userId)
    if (!target) throw mockError(404, 'USER_NOT_FOUND', 'Пользователь не найден')
    const raw = Array.isArray(data.branches) ? data.branches : []
    const unique = Array.from(new Set(raw))
    const all = await getAll<BranchItem>('branches')
    const validIds = new Set([
      ...all.map(b => b.id),
      ...MOCK_BRANCHES.map(b => b.id),
    ])
    for (const id of unique) {
      if (!validIds.has(id)) {
        throw mockError(400, 'BRANCH_NOT_FOUND', `Точка ${id} не из тенанта`)
      }
    }
    const map = (await kvGet<Record<string, number[]>>('user_branches')) ?? {}
    map[String(userId)] = unique
    await kvSet('user_branches', map)
    target.branch_ids = unique
    await update<User & { id: number }>('users', target)
    return { success: true, branches: unique }
  }

  private getCallerLogin(): string {
    try {
      const raw = localStorage.getItem('auth_user')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed?.login === 'string') return parsed.login
      }
    } catch {
      // localStorage недоступен — caller = 'anonymous' → прав нет.
    }
    return 'anonymous'
  }

  private async visibleBranchesForCaller(all: BranchItem[], callerLogin: string): Promise<BranchItem[]> {
    const map = (await kvGet<Record<string, number[]>>('user_branches')) ?? {}
    const users = await getAll<User & { id: number }>('users')
    const caller = users.find(u => u.login === callerLogin)
    if (!caller || caller.id === undefined) return []
    const ids = new Set(map[String(caller.id)] ?? caller.branch_ids ?? [])
    if (ids.size === 0) return []
    return all.filter(b => ids.has(b.id))
  }

  private async userIdsWithBranch(branchId: number): Promise<number[]> {
    const map = (await kvGet<Record<string, number[]>>('user_branches')) ?? {}
    const result: number[] = []
    for (const [uid, ids] of Object.entries(map)) {
      if (Array.isArray(ids) && ids.includes(branchId)) {
        const n = Number(uid)
        if (Number.isInteger(n)) result.push(n)
      }
    }
    const users = await getAll<User & { id: number }>('users')
    for (const u of users) {
      if (u.id !== undefined && Array.isArray(u.branch_ids) && u.branch_ids.includes(branchId) && !result.includes(u.id)) {
        result.push(u.id)
      }
    }
    return result
  }

  async getNavigation(): Promise<GetMenuResponse> {
    await delay(300)
    const items = await getAll<MenuItem>('navigation')
    return { domain: `${getCurrentHost()}.remontti.site`, items }
  }

  private toApiUser(user: User & { id?: number }, iconMap: Map<string, string>): ApiUser {
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
      icon_url: iconMap.get(user.login) ?? '',
    }
  }

  async getUsers(): Promise<GetUsersResponse> {
    await delay(300)
    const [users, iconMap] = await Promise.all([
      getAll<User>('users'),
      listIcons(),
    ])
    return {
      items: users.map(u => this.toApiUser(u, iconMap)),
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
    return { domain: d, items: [...(MOCK_ROLES[d] || [])] }
  }

  async getPermissions(_domain?: string): Promise<GetPermissionsResponse> {
    await delay(300)
    return { items: MOCK_PERMISSIONS }
  }

  async createRole(data: CreateRoleRequest): Promise<Role> {
    await delay(500)
    const d = `${getCurrentHost()}.remontti.site`
    const roles = MOCK_ROLES[d] || (MOCK_ROLES[d] = [])
    if (roles.some(r => r.code === data.code)) {
      throw new Error('Роль с таким кодом уже существует')
    }
    const role: Role = {
      code: data.code,
      title_key: data.title_key,
      sort_order: data.sort_order ?? 0,
      permissions: [],
    }
    roles.push(role)
    return { ...role }
  }

  async setRolePermissions(code: string, data: SetRolePermissionsRequest): Promise<Role> {
    await delay(500)
    const d = `${getCurrentHost()}.remontti.site`
    const role = (MOCK_ROLES[d] || []).find(r => r.code === code)
    if (!role) {
      throw new Error('Роль не найдена')
    }
    role.permissions = [...data.permissions]
    return { ...role }
  }

  async deleteRole(code: string): Promise<SuccessResponse> {
    await delay(300)
    const d = `${getCurrentHost()}.remontti.site`
    const roles = MOCK_ROLES[d] || []
    const i = roles.findIndex(r => r.code === code)
    if (i === -1) {
      throw new Error('Роль не найдена')
    }
    roles.splice(i, 1)
    return { success: true }
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

    const iconMap = await listIcons()
    return this.toApiUser({ ...user, id }, iconMap)
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

  // ---------- Translations: pages list / save / delete ----------

  async getTranslationPages(): Promise<TranslationPagesResponse> {
    await delay(300)
    const counts = countTranslationsByPage()
    const items: TranslationPageItem[] = Object.keys(counts)
      .sort((a, b) => a.localeCompare(b))
      .map(page => ({ page, keys_count: counts[page] }))
    return { items }
  }

  async saveTranslation(page: string, key: string, data: SaveTranslationRequest): Promise<TranslationItem> {
    await delay(300)
    if (!page) throw mockError(400, 'PAGE_REQUIRED', 'page обязателен')
    if (page === 'pages') throw mockError(400, 'PAGE_INVALID', 'pages — зарезервированное имя списка страниц')
    if (!PAGE_PATTERN.test(page) || page.length > 64) throw mockError(400, 'PAGE_INVALID', 'Неверный формат page')
    if (!key) throw mockError(400, 'KEY_REQUIRED', 'key обязателен')
    if (!KEY_PATTERN.test(key) || key.length > 128) throw mockError(400, 'KEY_INVALID', 'Неверный формат key')
    if (typeof data.value !== 'string' || data.value.trim() === '') {
      throw mockError(400, 'VALUE_REQUIRED', 'value не может быть пустым')
    }
    if (!MOCK_TRANSLATIONS[page]) MOCK_TRANSLATIONS[page] = {}
    MOCK_TRANSLATIONS[page][`${page}.${key}`] = data.value
    return { page, key, value: data.value }
  }

  async deleteTranslation(page: string, key: string): Promise<SuccessResponse> {
    await delay(300)
    const inner = MOCK_TRANSLATIONS[page]
    const fullKey = `${page}.${key}`
    if (!inner || !(fullKey in inner)) {
      throw mockError(404, 'TRANSLATION_NOT_FOUND', 'Такого перевода нет')
    }
    delete inner[fullKey]
    return { success: true }
  }

  // ---------- Profile ----------
  /** Сохранить blob как иконку пользователя и вернуть публичный icon_url. */
  async uploadMyIcon(login: string, file: Blob): Promise<IconResponse> {
    await delay(500)
    if (!file || file.size === 0) {
      throw { status: 400, code: 'ICON_REQUIRED', message: 'Файл иконки пуст' }
    }
    if (file.size > 2 * 1024 * 1024) {
      throw { status: 413, code: 'ICON_TOO_LARGE', message: 'Файл больше 2 МиБ' }
    }
    const icon_url = await setIcon(login, file)
    return { success: true, icon_url }
  }

  /** Снять иконку пользователя. Идемпотентно: отсутствие — это 200, не 404. */
  async deleteMyIcon(login: string): Promise<SuccessResponse> {
    await delay(300)
    await deleteIcon(login)
    return { success: true }
  }
}

export const mockApiClient = new MockApiClient()
export { MOCK_TRANSLATIONS }