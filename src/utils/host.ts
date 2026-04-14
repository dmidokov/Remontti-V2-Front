/**
 * Возвращает поддомен из текущего URL.
 * Например: work.remontti.site → 'work'
 *          control.remontti.site → 'control'
 *          localhost → 'localhost'
 */
export function getCurrentHost(): string {
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost'
  }
  // Берём первую часть домена (поддомен)
  const parts = hostname.split('.')
  return parts[0] || 'localhost'
}
