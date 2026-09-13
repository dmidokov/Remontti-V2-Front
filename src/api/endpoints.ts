export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/v1/auth/login',
    LOGOUT: '/v1/auth/logout',
  },
  TRANSLATIONS: {
    GET: (page: string) => `/v1/translations/${page}`,
  },
} as const