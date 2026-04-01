// User types
export interface User {
  id?: number
  login: string
  email: string
  name: string
  role: 'admin' | 'user' | 'manager'
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

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T
  status: number
}
