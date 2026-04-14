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
}

export interface UserAuth extends User {
  password?: never
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
  token?: string
  error?: string
}

export interface LogoutResponse {
  success: boolean
}

export interface TranslationResponse {
  [key: string]: string
}

export interface GetTranslationsResponse {
  translations: TranslationResponse
  timestamp: number
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
export interface NavItem {
  id: number
  name: string
  link: string
  iconUrl: string
}

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T
  status: number
}
