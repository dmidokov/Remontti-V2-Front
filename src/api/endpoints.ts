export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/v1/auth/login',
    LOGOUT: '/v1/auth/logout',
  },
  BRANCHES: {
    LIST: '/v1/branches',
    ITEM: (id: number) => `/v1/branches/${id}`,
  },
  USERS: {
    SET_BRANCHES: (id: number) => `/v1/users/${id}/branches`,
  },
  TRANSLATIONS: {
    GET: (page: string) => `/v1/translations/${page}`,
    PAGES: '/v1/translations/pages',
    ITEM: (page: string, key: string) => `/v1/translations/${page}/${key}`,
  },
} as const