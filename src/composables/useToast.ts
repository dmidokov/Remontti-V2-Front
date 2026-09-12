import { ref, readonly } from 'vue'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

const toasts = ref<Toast[]>([])
let nextId = 1
const DEFAULT_DURATION = 4000

export function showToast(message: string, type: ToastType = 'info', duration = DEFAULT_DURATION): void {
  const id = nextId++
  toasts.value.push({ id, message, type })

  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }
}

export function removeToast(id: number): void {
  toasts.value = toasts.value.filter(toast => toast.id !== id)
}

export function useToast() {
  return {
    toasts: readonly(toasts),
    showToast,
    removeToast,
  }
}