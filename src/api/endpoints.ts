export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
  },
  TRANSLATIONS: {
    GET: (page: string) => `/translations/${page}`,
  },
} as const
