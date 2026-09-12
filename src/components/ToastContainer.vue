<script setup lang="ts">
import { useToast, type Toast, type ToastType } from '../composables/useToast'

const { toasts, removeToast } = useToast()

const ICONS: Record<ToastType, string> = {
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01M10.29 3.86l-8.03 14a1.75 1.75 0 001.75 2.64h16.08a1.75 1.75 0 001.75-2.64l-8.03-14a1.75 1.75 0 00-3.52 0z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
}

function toastClass(toast: Toast): string {
  return `toast toast-${toast.type}`
}

function iconPath(toast: Toast): string {
  return ICONS[toast.type]
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <TransitionGroup name="toast">
        <div v-for="toast in toasts" :key="toast.id" :class="toastClass(toast)" role="alert">
          <span class="toast-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="iconPath(toast)" />
            </svg>
          </span>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" @click="removeToast(toast.id)" aria-label="Close">&times;</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 380px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  font-size: 0.95rem;
  pointer-events: auto;
}

.toast-info {
  background: #eaf2fe;
  color: #1d4ed8;
}

.toast-success {
  background: #e6f7ec;
  color: #15803d;
}

.toast-warning {
  background: #fdf3d8;
  color: #b45309;
}

.toast-error {
  background: #fdeaea;
  color: #b91c1c;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.toast-icon svg {
  width: 24px;
  height: 24px;
}

.toast-message {
  flex: 1;
  line-height: 1.4;
  word-break: break-word;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  line-height: 1;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  padding: 0;
}

.toast-close:hover {
  opacity: 1;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>