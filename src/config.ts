// Use mock mode by default. Set VITE_USE_MOCK=false in .env to use the real API.
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false'