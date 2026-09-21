<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import SidebarMenu from '../components/SidebarMenu.vue'
import { useTranslation } from '../composables/useTranslation'
import { showToast } from '../composables/useToast'
import { getCurrentUser } from '../services/authService'
import { uploadMyIcon, deleteMyIcon, resolveIconSrc } from '../services/profileService'
import type { UserAuth } from '../types/api'

const route = useRoute()
const { loadTranslations, t } = useTranslation()

const user = ref<UserAuth | null>(getCurrentUser())
const currentIconSrc = computed(() => resolveIconSrc(user.value?.icon_url))
const hasCurrentIcon = computed(() => Boolean(user.value?.icon_url))

interface Crop {
  /** Центр рамки в пикселях исходного изображения. */
  cx: number
  cy: number
  /** Сторона квадрата в пикселях исходного изображения. */
  size: number
}

const MIN_CROP_PX = 40
const MAX_BYTES = 2 * 1024 * 1024
const ACCEPT_MIME = ['image/png', 'image/jpeg', 'image/webp']

const stage = ref<'idle' | 'cropping' | 'uploading'>('idle')
const sourceUrl = ref<string | null>(null)
const sourceMeta = ref<{ name: string; size: number } | null>(null)
const sourceImage = ref<HTMLImageElement | null>(null)
const isDeleting = ref(false)
const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const maskId = `cropper-mask-${Math.random().toString(36).slice(2, 9)}`

const crop = ref<Crop>({ cx: 0, cy: 0, size: 0 })
const containerRef = ref<HTMLDivElement | null>(null)
const containerSize = ref({ w: 0, h: 0 })
const interaction = ref<null | 'move' | 'resize'>(null)
const dragStart = ref<{ mouseX: number; mouseY: number; crop: Crop } | null>(null)

// Следим за апдейтом юзера (после save/delete) — обновим аватар без F5.
function refreshUser() {
  user.value = getCurrentUser()
}
onMounted(() => {
  loadTranslations('profile')
  window.addEventListener('remontti:user-updated', refreshUser)
})
onBeforeUnmount(() => {
  window.removeEventListener('remontti:user-updated', refreshUser)
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
})

// ===== Drag & drop / file pick =====

function openFilePicker() {
  fileInput.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
  input.value = ''
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function onDragLeave(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
}

function handleFile(file: File) {
  if (!ACCEPT_MIME.includes(file.type)) {
    showToast(t('profile.error_unsupported_type', 'Поддерживаются только PNG, JPEG и WebP'), 'error')
    return
  }
  if (file.size > MAX_BYTES) {
    showToast(t('profile.error_too_large', 'Файл больше 2 МиБ'), 'error')
    return
  }
  loadSource(file)
}

function loadSource(file: File) {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  sourceMeta.value = { name: file.name, size: file.size }
  const url = URL.createObjectURL(file)
  sourceUrl.value = url
  const img = new Image()
  img.onload = () => {
    sourceImage.value = img
    crop.value = initialCropFor(img)
    stage.value = 'cropping'
    requestAnimationFrame(updateContainerSize)
  }
  img.onerror = () => {
    showToast(t('profile.error_read_failed', 'Не удалось прочитать изображение'), 'error')
  }
  img.src = url
}

function initialCropFor(img: HTMLImageElement): Crop {
  // Берём максимально возможный квадрат: сторона = min(naturalW, naturalH),
  // центр — посередине картинки.
  const size = Math.min(img.naturalWidth, img.naturalHeight)
  return {
    cx: img.naturalWidth / 2,
    cy: img.naturalHeight / 2,
    size,
  }
}

// ===== Cropper geometry =====

function updateContainerSize() {
  const el = containerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  containerSize.value = { w: rect.width, h: rect.height }
}

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(updateContainerSize)
    resizeObserver.observe(containerRef.value)
  }
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

/** Сторона рамки в пикселях контейнера. */
const cropPx = computed(() => {
  if (containerSize.value.w === 0) return 0
  return crop.value.size * fitScale.value
})

/** Коэффициент object-fit: contain для изображения в контейнере. */
const fitScale = computed(() => {
  const img = sourceImage.value
  if (!img || containerSize.value.w === 0) return 1
  return Math.min(
    containerSize.value.w / img.naturalWidth,
    containerSize.value.h / img.naturalHeight,
  )
})

/** Координаты рамки в пикселях контейнера (для абсолютного позиционирования). */
const cropBox = computed(() => {
  const img = sourceImage.value
  if (!img || containerSize.value.w === 0) {
    return { left: 0, top: 0, size: 0, centerX: 0, centerY: 0 }
  }
  const cw = containerSize.value.w
  const ch = containerSize.value.h
  const scale = fitScale.value
  const drawW = img.naturalWidth * scale
  const drawH = img.naturalHeight * scale
  const offsetX = (cw - drawW) / 2
  const offsetY = (ch - drawH) / 2
  const sizePx = cropPx.value
  const centerX = offsetX + crop.value.cx * scale
  const centerY = offsetY + crop.value.cy * scale
  return {
    left: centerX - sizePx / 2,
    top: centerY - sizePx / 2,
    size: sizePx,
    centerX,
    centerY,
  }
})

/** Позиция верхнего-левого угла handle (24×24). Точка на круге на 45° от центра. */
const HANDLE_SIZE = 24
const handlePos = computed(() => {
  if (cropBox.value.size === 0) return { left: 0, top: 0 }
  const r = cropBox.value.size / 2
  const dx = r * Math.SQRT1_2
  return {
    left: cropBox.value.centerX + dx - HANDLE_SIZE / 2,
    top: cropBox.value.centerY + dx - HANDLE_SIZE / 2,
  }
})

function onCropPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement
  interaction.value = target.dataset.handle === 'resize' ? 'resize' : 'move'
  dragStart.value = {
    mouseX: event.clientX,
    mouseY: event.clientY,
    crop: { ...crop.value },
  }
  ;(event.target as Element).setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!interaction.value || !dragStart.value || !containerRef.value || !sourceImage.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const scale = fitScale.value
  if (scale <= 0) return
  // Смещение мыши → пиксели исходного изображения.
  const dxImg = (event.clientX - dragStart.value.mouseX) / scale
  const dyImg = (event.clientY - dragStart.value.mouseY) / scale
  const img = sourceImage.value
  const start = dragStart.value.crop

  if (interaction.value === 'move') {
    crop.value = {
      size: start.size,
      cx: clamp(start.cx + dxImg, start.size / 2, img.naturalWidth - start.size / 2),
      cy: clamp(start.cy + dyImg, start.size / 2, img.naturalHeight - start.size / 2),
    }
  } else if (interaction.value === 'resize') {
    // Тянем за нижне-правый край круга — растём по диагонали.
    // Math.max даёт симметричный resize: ведём вправо — растёт, вверх — уменьшается.
    const drag = Math.max(dxImg, dyImg)
    const maxSize = Math.min(img.naturalWidth, img.naturalHeight)
    const nextSize = clamp(start.size + drag, MIN_CROP_PX, maxSize)
    crop.value = {
      size: nextSize,
      cx: clamp(start.cx, nextSize / 2, img.naturalWidth - nextSize / 2),
      cy: clamp(start.cy, nextSize / 2, img.naturalHeight - nextSize / 2),
    }
  }
}

function onPointerUp() {
  interaction.value = null
  dragStart.value = null
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

// ===== Save / Cancel =====

function cancelCrop() {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  sourceUrl.value = null
  sourceImage.value = null
  sourceMeta.value = null
  stage.value = 'idle'
}

async function applyCrop() {
  const img = sourceImage.value
  if (!img) return
  stage.value = 'uploading'
  try {
    const blob = await renderCroppedBlob(img, crop.value)
    await uploadMyIcon(blob)
    refreshUser()
    showToast(t('profile.toast_uploaded', 'Иконка обновлена'), 'success')
    cancelCrop()
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('profile.error_failed_upload', 'Не удалось сохранить иконку')
    showToast(msg, 'error')
    stage.value = 'cropping'
  }
}

function renderCroppedBlob(img: HTMLImageElement, c: Crop): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const outSize = 512
    const sx = c.cx - c.size / 2
    const sy = c.cy - c.size / 2
    const canvas = document.createElement('canvas')
    canvas.width = outSize
    canvas.height = outSize
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas unsupported'))
      return
    }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, c.size, c.size, 0, 0, outSize, outSize)
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('toBlob failed'))
          return
        }
        resolve(blob)
      },
      'image/png',
      0.92,
    )
  })
}

async function handleDelete() {
  if (!user.value?.icon_url) return
  if (!confirm(t('profile.confirm_delete', 'Удалить иконку?'))) return
  isDeleting.value = true
  try {
    await deleteMyIcon()
    refreshUser()
    showToast(t('profile.toast_deleted', 'Иконка удалена'), 'success')
  } catch (e) {
    showToast(t('profile.error_failed_delete', 'Не удалось удалить иконку'), 'error')
  } finally {
    isDeleting.value = false
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(2)} МиБ`
}

function getInitials(u: UserAuth | null): string {
  if (!u) return 'U'
  const first = (u.name || '').trim()[0] || ''
  const last = (u.last_name || '').trim()[0] || ''
  return ((first + last) || u.login.slice(0, 2)).toUpperCase().slice(0, 2)
}
</script>

<template>
  <div class="profile-page">
    <SidebarMenu :current-route="route.path" />

    <main class="profile-content">
      <header class="profile-header">
        <h1><T k="profile.title" /></h1>
        <p class="subtitle"><T k="profile.subtitle" /></p>
      </header>

      <section class="profile-card">
        <div class="profile-avatar-block">
          <div class="profile-avatar">
            <template v-if="currentIconSrc">
              <img :src="currentIconSrc" :alt="user?.name" />
            </template>
            <template v-else>
              <span class="profile-avatar-initials">{{ getInitials(user) }}</span>
            </template>
          </div>
          <div class="profile-avatar-meta">
            <span class="profile-avatar-name">{{ user?.name }}</span>
            <span class="profile-avatar-login">@{{ user?.login }}</span>
          </div>
        </div>

        <div class="profile-actions">
          <button class="btn-primary" type="button" @click="openFilePicker">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <T k="profile.upload" />
          </button>

          <button
            v-if="hasCurrentIcon"
            class="btn-danger"
            type="button"
            :disabled="isDeleting"
            @click="handleDelete"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            {{ isDeleting ? t('profile.deleting', 'Удаление...') : t('profile.delete', 'Удалить иконку') }}
          </button>
        </div>

        <p class="profile-hint">
          <T k="profile.hint" />
        </p>

        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          @change="onFileChange"
        />
      </section>
    </main>

    <!-- Cropper modal -->
    <Teleport to="body">
      <div
        v-if="stage === 'cropping' || stage === 'uploading'"
        class="modal-overlay"
        @click.self="stage !== 'uploading' && cancelCrop()"
      >
        <div class="cropper-modal">
          <header class="cropper-header">
            <div>
              <h2><T k="profile.crop_title" /></h2>
              <p v-if="sourceMeta" class="cropper-meta">
                {{ sourceMeta.name }} · {{ formatSize(sourceMeta.size) }}
              </p>
            </div>
            <button class="close-btn" :disabled="stage === 'uploading'" @click="cancelCrop">&times;</button>
          </header>

          <div
            ref="containerRef"
            class="cropper-stage"
            :class="{ 'is-dragging': interaction !== null }"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointerleave="onPointerUp"
          >
            <img
              v-if="sourceUrl"
              :src="sourceUrl"
              class="cropper-image"
              alt=""
              draggable="false"
              @load="updateContainerSize"
            />

            <!-- Затемнение вне круга — SVG с круглой дыркой через mask. -->
            <svg
              class="cropper-mask-svg"
              :viewBox="`0 0 ${containerSize.w} ${containerSize.h}`"
              preserveAspectRatio="none"
            >
              <defs>
                <mask :id="maskId">
                  <rect width="100%" height="100%" fill="white" />
                  <circle
                    :cx="cropBox.centerX"
                    :cy="cropBox.centerY"
                    :r="cropBox.size / 2"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.6)"
                :mask="`url(#${maskId})`"
              />
            </svg>

            <!-- Круглая рамка кропа -->
            <div
              class="cropper-frame"
              :class="{ 'is-active': interaction !== null }"
              :style="{
                left: cropBox.left + 'px',
                top: cropBox.top + 'px',
                width: cropBox.size + 'px',
                height: cropBox.size + 'px',
              }"
              @pointerdown="onCropPointerDown"
            >
              <div class="cropper-grid">
                <span></span><span></span><span></span><span></span>
              </div>
            </div>

            <!-- Handle ресайза — снаружи frame, иначе его обрежет overflow:hidden у круга. -->
            <button
              type="button"
              class="cropper-handle"
              data-handle="resize"
              aria-label="Изменить размер"
              :style="{ left: handlePos.left + 'px', top: handlePos.top + 'px' }"
              @pointerdown.stop="onCropPointerDown"
            >
              <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 5 L5 11 M11 8 L8 11" />
              </svg>
            </button>
          </div>

          <footer class="cropper-footer">
            <p class="cropper-hint"><T k="profile.crop_hint" /></p>
            <div class="cropper-actions">
              <button
                class="btn-cancel"
                type="button"
                :disabled="stage === 'uploading'"
                @click="cancelCrop"
              >
                <T k="profile.cancel" />
              </button>
              <button
                class="btn-primary"
                type="button"
                :disabled="stage === 'uploading'"
                @click="applyCrop"
              >
                {{ stage === 'uploading'
                  ? t('profile.uploading', 'Загрузка...')
                  : t('profile.apply', 'Применить') }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- Drop zone (визуальный, на всю страницу) -->
    <div
      v-if="stage === 'idle'"
      class="drop-zone-overlay"
      :class="{ active: isDragOver }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    ></div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  width: 100vw;
  background: #f8f9fa;
  padding-left: 70px;
}

.profile-content {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.profile-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 0.25rem 0;
}

.subtitle {
  color: #666;
  margin: 0 0 2rem 0;
}

.profile-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-avatar-block {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.profile-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  font-weight: 600;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar-initials {
  user-select: none;
}

.profile-avatar-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.profile-avatar-name {
  font-size: 1.15rem;
  font-weight: 600;
  color: #1a1a2e;
}

.profile-avatar-login {
  font-size: 0.9rem;
  color: #666;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.profile-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.profile-hint {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
  border-top: 1px solid #f0f0f0;
  padding-top: 1.25rem;
  line-height: 1.5;
}

.btn-primary,
.btn-danger,
.btn-cancel {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(102, 126, 234, 0.4);
}

.btn-danger {
  background: #fff;
  color: #dc3545;
  border: 1px solid #f3c4c4;
}

.btn-danger:hover:not(:disabled) {
  background: #fff5f5;
}

.btn-cancel {
  background: #f0f0f0;
  color: #333;
}

.btn-cancel:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-primary:disabled,
.btn-danger:disabled,
.btn-cancel:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* === Drop zone === */
.drop-zone-overlay {
  position: fixed;
  inset: 70px 0 0 0;
  pointer-events: none;
  z-index: 1;
}

.drop-zone-overlay.active::after {
  content: '';
  position: absolute;
  inset: 1rem;
  border: 3px dashed #667eea;
  border-radius: 16px;
  background: rgba(102, 126, 234, 0.06);
  pointer-events: auto;
}

/* === Cropper modal === */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.cropper-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  max-height: 92vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.cropper-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.cropper-header h2 {
  font-size: 1.25rem;
  margin: 0;
  color: #1a1a2e;
}

.cropper-meta {
  font-size: 0.8rem;
  color: #888;
  margin: 0.25rem 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  line-height: 1;
  padding: 0;
}

.close-btn:hover:not(:disabled) {
  color: #333;
}

.cropper-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #1a1a2e;
  overflow: hidden;
  user-select: none;
  touch-action: none;
  cursor: default;
}

.cropper-stage.is-dragging {
  cursor: grabbing;
}

.cropper-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.cropper-mask-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.cropper-frame {
  position: absolute;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  cursor: grab;
  touch-action: none;
  overflow: hidden;
}

.cropper-frame.is-active {
  cursor: grabbing;
}

.cropper-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.cropper-grid span {
  position: absolute;
  background: rgba(255, 255, 255, 0.45);
}

.cropper-grid span:nth-child(1) { top: 33%; left: 0; right: 0; height: 1px; }
.cropper-grid span:nth-child(2) { top: 66%; left: 0; right: 0; height: 1px; }
.cropper-grid span:nth-child(3) { left: 33%; top: 0; bottom: 0; width: 1px; }
.cropper-grid span:nth-child(4) { left: 66%; top: 0; bottom: 0; width: 1px; }

.cropper-handle {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  border: 2px solid #667eea;
  color: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: nwse-resize;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.cropper-handle:hover {
  background: #667eea;
  color: white;
}

.cropper-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f0f0f0;
  gap: 1rem;
}

.cropper-hint {
  font-size: 0.85rem;
  color: #666;
  margin: 0;
}

.cropper-actions {
  display: flex;
  gap: 0.5rem;
}
</style>
