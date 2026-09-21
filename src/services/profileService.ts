import apiClient from '../api/client'
import { mockApiClient } from '../api/mockApiClient'
import { USE_MOCK } from '../config'
import { getCurrentUser } from './authService'
import { resolveMockIconUrl } from '../db/mockIconStore'
import type { IconResponse, SuccessResponse, UserAuth } from '../types/api'

/**
 * Загрузить свою иконку. Обновляет user.icon_url в localStorage,
 * чтобы SidebarMenu сразу увидел новую картинку без перезагрузки.
 */
export async function uploadMyIcon(file: Blob): Promise<IconResponse> {
  const user = getCurrentUser()
  if (!user) throw new Error('Не авторизован')

  const response = USE_MOCK
    ? await mockApiClient.uploadMyIcon(user.login, file)
    : await apiClient.uploadMyIcon(file)

  setMyIconUrl(response.icon_url)
  return response
}

/** Снять свою иконку. Идемпотентно. */
export async function deleteMyIcon(): Promise<SuccessResponse> {
  const user = getCurrentUser()
  if (!user) throw new Error('Не авторизован')

  const response = USE_MOCK
    ? await mockApiClient.deleteMyIcon(user.login)
    : await apiClient.deleteMyIcon()

  setMyIconUrl('')
  return response
}

/** Подменяет icon_url в сохранённой сессии. Пустая строка — иконки нет. */
function setMyIconUrl(icon_url: string): void {
  const user = getCurrentUser()
  if (!user) return
  const updated: UserAuth = { ...user, icon_url }
  localStorage.setItem('auth_user', JSON.stringify(updated))
  // SidebarMenu читает getCurrentUser() на mount, но если страница уже открыта —
  // уведомляем подписчиков через storage-event (срабатывает между вкладками;
  // в этой же вкладке дёрнем кастомное событие).
  window.dispatchEvent(new CustomEvent('remontti:user-updated', { detail: updated }))
}

/**
 * Возвращает реально работающий URL иконки для <img>.
 * В мок-режиме icon_url из API — это `/uploads/mock-...png`, которого физически нет;
 * вместо него подставляем blob URL из IndexedDB.
 */
export function resolveIconSrc(icon_url: string | undefined | null): string | null {
  if (!icon_url) return null
  if (USE_MOCK) return resolveMockIconUrl(icon_url)
  return icon_url
}
