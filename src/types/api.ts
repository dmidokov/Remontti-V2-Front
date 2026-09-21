// User types
export interface User {
  id?: number
  login: string
  email: string
  name: string
  /** Фамилия для инициалов (real API); в моке имя может уже содержать "Имя Фамилия". */
  last_name?: string
  role: 'admin' | 'user' | 'manager' | 'employee'
  startPage?: string
  /** Ссылка на иконку пользователя. Приходит на login и в списке пользователей. Пустая строка = иконки нет. */
  icon_url?: string
  host?: string
  settings_right?: number
  roles?: string[]
  direct_permissions?: string[]
}

export interface UserAuth extends User {
    password?: never
}

// Backend user (GET/POST /v1/users)
export interface ApiUser {
    id: number
    login: string
    domain: string
    creator: number | null
    created_at: string
    roles: string[]
    direct_permissions: string[]
    icon_url?: string
    name?: string
    last_name?: string
}

export interface GetUsersResponse {
    items: ApiUser[]
    permissions: string[]
}

export interface CreateUserRequest {
    login: string
    password: string
    /** Тенант (домен), в который добавляется пользователь. По умолчанию — текущий. */
    domain?: string
    name: string
    last_name: string
}

/** Частичное обновление пользователя (PATCH /v1/users/:id) — роли и прямые права. */
export interface UpdateUserRequest {
    roles?: string[]
    /** В запросе поле "permissions", в ответе GET — "direct_permissions". */
    permissions?: string[]
}

// Role and permission types
export interface Role {
    code: string
    title_key: string
    sort_order?: number
    /** Права роли (коды). */
    permissions?: string[]
}

export interface CreateRoleRequest {
    code: string
    title_key: string
    sort_order?: number
}

/** Набор прав роли; PUT заменяет его целиком, отсутствующее поле = пустой набор. */
export interface SetRolePermissionsRequest {
    permissions: string[]
}

export interface SuccessResponse {
    success: boolean
}

export interface GetRolesResponse {
    domain: string
    items: Role[]
}

export interface Permission {
    code: string
    title_key: string
    /** system_only-право можно выдать роли, лишь если вызывающий носит его сам. */
    system_only?: boolean
}

export interface GetPermissionsResponse {
    items: Permission[]
}

// Tenant types
export interface Tenant {
    domain: string
    name: string
}

export interface GetTenantsResponse {
    items: Tenant[]
}

// API Request types
export interface LoginRequest {
    login: string
    password: string
}

export interface LogoutRequest {
    // Empty, just for consistency
}

export interface GetTranslationsRequest {
    page: string
}

// API Response types
export interface LoginResponse {
  success: boolean
  user?: UserAuth
  /** Access token — держим в памяти вкладки. */
  token?: string
  /** Секунд жизни access. */
  expires_in?: number
  /** Refresh token — держим в localStorage (общий для вкладок). */
  refresh_token?: string
  /** Секунд жизни refresh (остаток жизни сессии). */
  refresh_expires_in?: number
  start_page?: string
  /** Имя (real API отдаёт name/last_name на верхнем уровне). */
  name?: string
  /** Фамилия (real API). */
  last_name?: string
  /** Ссылка на иконку авторизованного пользователя. Пустая строка = иконки нет. */
  icon_url?: string
  error?: string
}

/** Ответ загрузки/получения иконки профиля (POST /v1/me/icon). */
export interface IconResponse {
    success: boolean
    icon_url: string
}

export interface LogoutResponse {
    success: boolean
}

export interface TranslationResponse {
    [key: string]: string
}

/** Ответ API переводов (внутри items ключи БЕЗ префикса страницы). */
export interface GetTranslationsResponse {
    page: string
    language: string
    items: Record<string, string>
}

/** Элемент списка страниц переводов (GET /v1/translations/pages). */
export interface TranslationPageItem {
    page: string
    /** Сколько ключей этой страницы заполнено на языке пользователя. 0 — пробел, а не отсутствие страницы. */
    keys_count: number
}

/** Ответ GET /v1/translations/pages. */
export interface TranslationPagesResponse {
    items: TranslationPageItem[]
}

/** Тело PUT /v1/translations/{page}/{key}. */
export interface SaveTranslationRequest {
    /** Текст перевода. Сохраняется как есть, без срезания пробелов по краям. */
    value: string
}

/** Ответ PUT /v1/translations/{page}/{key}. Поля language нет — язык один и тот же у чтения и записи. */
export interface TranslationItem {
    page: string
    key: string
    value: string
}

// API Error types
export interface ApiError {
    status: number
    message: string
    code?: string
}

export interface ValidationError {
    field: string
    message: string
}

export interface ValidationErrorResponse {
    status: 422
    errors: ValidationError[]
}

// Branch types
export interface Branch {
    id: number
    name: string
    code: string
    address?: string
    isActive: boolean
}

export interface GetBranchesResponse {
    success: boolean
    branches: Branch[]
}

// Navigation types
export interface MenuItem {
    code: string
    parent_code?: string | null
    title_key: string
    path: string
    icon: string
    sort_order: number
}

export interface GetMenuResponse {
    domain: string
    items: MenuItem[]
}

// Management card types
export interface ManagementCard {
    id: number
    title: string
    description: string
    iconUrl: string
    requiredBit: number
    link: string
}

// Generic API response wrapper
export interface ApiResponse<T> {
    data: T
    status: number
}
