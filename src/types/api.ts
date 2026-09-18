// User types
export interface User {
  id?: number
  login: string
  email: string
  name: string
  role: 'admin' | 'user' | 'manager' | 'employee'
  startPage?: string
  avatarUrl?: string
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
}

export interface GetRolesResponse {
  domain: string
  items: Role[]
}

export interface Permission {
  code: string
  title_key: string
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
  error?: string
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
