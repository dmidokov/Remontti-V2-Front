<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import SidebarMenu from '../components/SidebarMenu.vue'
import { useTranslation } from '../composables/useTranslation'
import { showToast } from '../composables/useToast'
import {
  fetchTranslationPages,
  fetchPageTranslations,
  saveTranslation,
  deleteTranslation,
} from '../services/translationService'
import type { TranslationPageItem, TranslationResponse } from '../types/api'

const route = useRoute()
const { loadTranslations, t } = useTranslation()

const KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/

const pages = ref<TranslationPageItem[]>([])
const isLoadingPages = ref(false)
const pagesError = ref('')

/** Состояние каждой страницы: словарь ключей, черновики редактирования, флаги загрузки/сохранения. */
interface PageState {
  loaded: boolean
  loading: boolean
  loadError: string
  /** Полный ключ (page.key) → текущее значение с сервера. */
  values: TranslationResponse
  /** Полный ключ → текущее значение в инпуте. */
  drafts: TranslationResponse
  /** Полный ключ → идёт сохранение. */
  saving: Set<string>
  /** Полный ключ → идёт удаление. */
  deleting: Set<string>
  /** Полный ключ → ошибка под полем. */
  errors: Record<string, string>
  /** Поиск внутри страницы. */
  search: string
  /** Форма создания нового ключа. */
  newKey: string
  newValue: string
  newKeyError: string
  isAdding: boolean
}

const pageStates = reactive<Record<string, PageState>>({})

function ensureState(page: string): PageState {
  if (!pageStates[page]) {
    pageStates[page] = {
      loaded: false,
      loading: false,
      loadError: '',
      values: {},
      drafts: {},
      saving: new Set(),
      deleting: new Set(),
      errors: {},
      search: '',
      newKey: '',
      newValue: '',
      newKeyError: '',
      isAdding: false,
    }
  }
  return pageStates[page]
}

const expandedPages = ref<Set<string>>(new Set())

onMounted(async () => {
  loadTranslations('translations')
  await loadPages()
})

async function loadPages() {
  isLoadingPages.value = true
  pagesError.value = ''
  try {
    pages.value = await fetchTranslationPages()
    for (const p of pages.value) ensureState(p.page)
  } catch (e) {
    pagesError.value = t('translations.error_load_pages', 'Не удалось загрузить список страниц')
    console.error(e)
  } finally {
    isLoadingPages.value = false
  }
}

function fullKey(page: string, key: string): string {
  return `${page}.${key}`
}

const PAGE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/

const showNewPageForm = ref(false)
const newPageName = ref('')
const newPageKey = ref('')
const newPageValue = ref('')
const newPageError = ref('')
const isCreatingPage = ref(false)

function openNewPageForm() {
  showNewPageForm.value = true
  newPageName.value = ''
  newPageKey.value = ''
  newPageValue.value = ''
  newPageError.value = ''
}

function closeNewPageForm() {
  showNewPageForm.value = false
  newPageName.value = ''
  newPageKey.value = ''
  newPageValue.value = ''
  newPageError.value = ''
}

function validateNewPage(): string {
  const page = newPageName.value.trim()
  if (!page) return t('translations.new_page_error_required_page')
  if (!PAGE_NAME_PATTERN.test(page)) {
    return t('translations.new_page_error_invalid_page')
  }
  if (page.length > 64) return t('translations.new_page_error_page_too_long')
  if (page === 'pages') return t('translations.new_page_error_pages_reserved')

  const key = newPageKey.value.trim()
  if (!key) return t('translations.new_page_error_required_key')
  if (!KEY_PATTERN.test(key)) {
    return t('translations.new_page_error_invalid_key')
  }
  if (key.length > 128) return t('translations.new_page_error_key_too_long')

  if (newPageValue.value.trim() === '') return t('translations.new_page_error_required_value')

  // В рамках одной формы проверим дубль ключа только если страница уже раскрыта и загружена.
  const full = fullKey(page, key)
  const state = pageStates[page]
  if (state && state.values[full] !== undefined) return t('translations.new_page_error_key_exists')

  return ''
}

async function submitNewPage() {
  const err = validateNewPage()
  if (err) {
    newPageError.value = err
    return
  }
  const page = newPageName.value.trim()
  const key = newPageKey.value.trim()
  const value = newPageValue.value
  isCreatingPage.value = true
  newPageError.value = ''
  try {
    await saveTranslation(page, key, value)
    // Страница могла не существовать — добавляем её в общий список (если бэк её уже отдал,
    // см. fetchTranslationPages; иначе — пустая запись, чтобы счётчик стал 1).
    const exists = pages.value.some(p => p.page === page)
    if (!exists) {
      const next = [...pages.value, { page, keys_count: 1 }]
        .sort((a, b) => a.page.localeCompare(b.page))
      pages.value = next
    }
    ensureState(page)
    closeNewPageForm()
    showToast(t('translations.new_page_toast_created'), 'success')
    // Подтягиваем словарь новой страницы и сразу её раскрываем.
    expandedPages.value = new Set([...expandedPages.value, page])
    await loadPageEntries(page)
    // Перечитываем список — бэк мог пересчитать keys_count.
    await refreshPagesCount(page)
  } catch (e) {
    const msg = (e as { message?: string })?.message || t('translations.new_page_error_failed')
    newPageError.value = msg
    showToast(msg, 'error')
    console.error(e)
  } finally {
    isCreatingPage.value = false
  }
}

function stripPrefix(page: string, fullKey: string): string {
  const prefix = `${page}.`
  return fullKey.startsWith(prefix) ? fullKey.slice(prefix.length) : fullKey
}

async function togglePage(page: string) {
  const next = new Set(expandedPages.value)
  if (next.has(page)) {
    next.delete(page)
  } else {
    next.add(page)
    await loadPageEntries(page)
  }
  expandedPages.value = next
}

async function loadPageEntries(page: string) {
  const state = ensureState(page)
  if (state.loaded || state.loading) return
  state.loading = true
  state.loadError = ''
  try {
    const values = await fetchPageTranslations(page)
    state.values = { ...values }
    state.drafts = { ...values }
    state.loaded = true
  } catch (e) {
    state.loadError = t('translations.error_load_page', 'Не удалось загрузить словарь страницы')
    console.error(e)
  } finally {
    state.loading = false
  }
}

const filteredEntries = (page: string) => {
  const state = ensureState(page)
  const q = state.search.trim().toLowerCase()
  const entries = Object.entries(state.values).map(([fk, val]) => ({
    fullKey: fk,
    key: stripPrefix(page, fk),
    value: val,
  }))
  if (!q) return entries
  return entries.filter(e => e.fullKey.toLowerCase().includes(q) || e.value.toLowerCase().includes(q))
}

function setDraft(page: string, fullKey: string, value: string) {
  const state = ensureState(page)
  state.drafts[fullKey] = value
  if (state.errors[fullKey]) state.errors[fullKey] = ''
}

async function saveEntry(page: string, fullKey: string) {
  const state = ensureState(page)
  const key = stripPrefix(page, fullKey)
  const value = state.drafts[fullKey] ?? ''
  if (value.trim() === '') {
    state.errors[fullKey] = t('translations.error_required_value', 'Введите значение перевода')
    return
  }
  state.saving.add(fullKey)
  try {
    const item = await saveTranslation(page, key, value)
    state.values[fullKey] = item.value
    state.drafts[fullKey] = item.value
    state.errors[fullKey] = ''
    showToast(t('translations.toast_saved', 'Перевод сохранён'), 'success')
    await refreshPagesCount(page)
  } catch (e) {
    const msg = (e as { message?: string })?.message || t('translations.error_save_failed', 'Не удалось сохранить перевод')
    state.errors[fullKey] = msg
    showToast(msg, 'error')
    console.error(e)
  } finally {
    state.saving.delete(fullKey)
  }
}

async function removeEntry(page: string, fullKey: string) {
  if (!confirm(t('translations.delete_confirm', 'Удалить перевод?'))) return
  const state = ensureState(page)
  const key = stripPrefix(page, fullKey)
  state.deleting.add(fullKey)
  try {
    await deleteTranslation(page, key)
    delete state.values[fullKey]
    delete state.drafts[fullKey]
    delete state.errors[fullKey]
    showToast(t('translations.toast_deleted', 'Перевод удалён'), 'success')
    await refreshPagesCount(page)
  } catch (e) {
    const msg = (e as { message?: string })?.message || t('translations.error_delete_failed', 'Не удалось удалить перевод')
    showToast(msg, 'error')
    console.error(e)
  } finally {
    state.deleting.delete(fullKey)
  }
}

function validateNewKey(page: string): string {
  const state = ensureState(page)
  const raw = state.newKey.trim()
  if (!raw) return t('translations.error_required_key', 'Введите ключ')
  if (!KEY_PATTERN.test(raw)) {
    return t('translations.error_invalid_key', 'Ключ: строчные латинские буквы, цифры и подчёркивания, разделённые точками')
  }
  const full = fullKey(page, raw)
  if (state.values[full] !== undefined) return 'Такой ключ уже существует'
  return ''
}

async function submitNewEntry(page: string) {
  const state = ensureState(page)
  const err = validateNewKey(page)
  if (err) {
    state.newKeyError = err
    return
  }
  if (state.newValue.trim() === '') {
    state.newKeyError = t('translations.error_required_value', 'Введите значение перевода')
    return
  }
  state.isAdding = true
  const key = state.newKey.trim()
  try {
    const item = await saveTranslation(page, key, state.newValue)
    const full = fullKey(page, key)
    state.values[full] = item.value
    state.drafts[full] = item.value
    state.newKey = ''
    state.newValue = ''
    state.newKeyError = ''
    showToast(t('translations.toast_saved', 'Перевод сохранён'), 'success')
    await refreshPagesCount(page)
  } catch (e) {
    const msg = (e as { message?: string })?.message || t('translations.error_save_failed', 'Не удалось сохранить перевод')
    state.newKeyError = msg
    showToast(msg, 'error')
    console.error(e)
  } finally {
    state.isAdding = false
  }
}

/** После добавления/удаления ключа обновляем счётчик страницы в шапке. */
async function refreshPagesCount(_page: string) {
  try {
    pages.value = await fetchTranslationPages()
  } catch (e) {
    // Список лучше оставить как был: ошибка не критична для редактирования.
    console.error('Failed to refresh translation pages:', e)
  }
}

const totalKeys = computed(() => pages.value.reduce((sum, p) => sum + p.keys_count, 0))
</script>

<template>
  <div class="translations-page">
    <SidebarMenu :current-route="route.path" />

    <main class="translations-content">
      <div class="page-header">
        <div class="header-left">
          <h1><T k="translations.title" /></h1>
          <p class="subtitle"><T k="translations.subtitle" /></p>
          <div v-if="!isLoadingPages && pages.length > 0" class="header-stats">
            {{ pages.length }} · {{ totalKeys }} {{ t('translations.keys_count', 'ключей') }}
          </div>
        </div>
        <div class="header-actions">
          <button class="new-page-btn" @click="openNewPageForm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {{ t('translations.new_page', 'Новая страница') }}
          </button>
          <button class="refresh-btn" @click="loadPages" :disabled="isLoadingPages" aria-label="Обновить">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <path d="M21 12a9 9 0 1 1-3.51-7.12" />
              <polyline points="21 4 21 10 15 10" />
            </svg>
          </button>
        </div>
      </div>

      <form v-if="showNewPageForm" class="new-page-form" @submit.prevent="submitNewPage">
        <input
          v-model="newPageName"
          type="text"
          class="new-page-input"
          :class="{ error: !!newPageError }"
          :placeholder="t('translations.new_page_placeholder_page', 'страница, например orders')"
          autofocus
        />
        <input
          v-model="newPageKey"
          type="text"
          class="new-page-input"
          :class="{ error: !!newPageError }"
          :placeholder="t('translations.new_page_placeholder_key', 'ключ, например title')"
        />
        <input
          v-model="newPageValue"
          type="text"
          class="new-page-input"
          :class="{ error: !!newPageError }"
          :placeholder="t('translations.new_page_placeholder_value', 'значение')"
        />
        <button type="submit" class="action-btn new-page-submit" :disabled="isCreatingPage">
          {{ isCreatingPage ? t('translations.new_page_creating', 'Создание...') : t('translations.new_page_create', 'Создать') }}
        </button>
        <button type="button" class="new-page-cancel" @click="closeNewPageForm" :disabled="isCreatingPage">
          {{ t('translations.new_page_cancel', 'Отмена') }}
        </button>
        <span v-if="newPageError" class="new-page-error">{{ newPageError }}</span>
      </form>

      <div v-if="pagesError" class="error-banner">{{ pagesError }}</div>

      <div v-if="isLoadingPages" class="loading"><T k="translations.loading_pages" /></div>

      <div v-else-if="pages.length === 0" class="empty-state">
        <T k="translations.empty_gap" />
      </div>

      <div v-else class="pages-list">
        <section v-for="page in pages" :key="page.page" class="page-group">
          <header class="page-group-header">
            <button
              type="button"
              class="page-group-toggle"
              :class="{ collapsed: !expandedPages.has(page.page) }"
              @click="togglePage(page.page)"
            >
              <svg :class="{ rotate: !expandedPages.has(page.page) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span class="page-name">{{ page.page }}</span>
              <span
                class="page-count"
                :class="{ 'page-count-empty': page.keys_count === 0 }"
              >{{ page.keys_count }}</span>
            </button>
          </header>

          <div v-if="expandedPages.has(page.page)" class="page-group-body">
            <div v-if="ensureState(page.page).loading" class="loading-inline">Загрузка...</div>

            <div v-else-if="ensureState(page.page).loadError" class="error-inline">
              {{ ensureState(page.page).loadError }}
            </div>

            <template v-else>
              <div class="search-row">
                <input
                  :value="ensureState(page.page).search"
                  @input="(e) => ensureState(page.page).search = (e.target as HTMLInputElement).value"
                  type="text"
                  class="search-input"
                  :placeholder="t('translations.search_placeholder', 'Поиск по ключу или значению...')"
                />
              </div>

              <div v-if="filteredEntries(page.page).length === 0" class="empty-inline">
                {{ ensureState(page.page).search
                  ? t('translations.no_results', 'Ничего не найдено')
                  : t('translations.empty_page', 'В этой странице пока нет переводов') }}
              </div>

              <div v-else class="entries">
                <div
                  v-for="entry in filteredEntries(page.page)"
                  :key="entry.fullKey"
                  class="entry-row"
                >
                  <div class="entry-key">
                    <code class="key-chip">{{ entry.fullKey }}</code>
                  </div>
                  <div class="entry-value">
                    <input
                      :value="ensureState(page.page).drafts[entry.fullKey] ?? ''"
                      @input="(e) => setDraft(page.page, entry.fullKey, (e.target as HTMLInputElement).value)"
                      type="text"
                      class="value-input"
                      :class="{ error: !!ensureState(page.page).errors[entry.fullKey] }"
                      :placeholder="t('translations.value_placeholder', 'Текст перевода')"
                    />
                    <span
                      v-if="ensureState(page.page).errors[entry.fullKey]"
                      class="field-error"
                    >{{ ensureState(page.page).errors[entry.fullKey] }}</span>
                  </div>
                  <div class="entry-actions">
                    <button
                      class="action-btn save-btn"
                      :disabled="ensureState(page.page).saving.has(entry.fullKey) || (ensureState(page.page).drafts[entry.fullKey] ?? '') === entry.value"
                      @click="saveEntry(page.page, entry.fullKey)"
                    >
                      {{ ensureState(page.page).saving.has(entry.fullKey)
                        ? t('translations.saving', 'Сохранение...')
                        : t('translations.save', 'Сохранить') }}
                    </button>
                    <button
                      class="action-btn delete-btn"
                      :disabled="ensureState(page.page).deleting.has(entry.fullKey)"
                      @click="removeEntry(page.page, entry.fullKey)"
                    >
                      {{ t('translations.delete', 'Удалить') }}
                    </button>
                  </div>
                </div>
              </div>

              <form class="add-row" @submit.prevent="submitNewEntry(page.page)">
                <span class="form-group">
                  <label>{{ t('translations.new_key', 'Новый ключ') }}</label>
                  <input
                    v-model="ensureState(page.page).newKey"
                    type="text"
                    class="key-input"
                    :class="{ error: !!ensureState(page.page).newKeyError }"
                    :placeholder="t('translations.key_placeholder', 'например, login.button')"
                  />
                </span>
                <span class="form-group">
                  <label>{{ t('translations.value_placeholder', 'Текст перевода') }}</label>
                  <input
                    v-model="ensureState(page.page).newValue"
                    type="text"
                    class="value-input"
                    :class="{ error: !!ensureState(page.page).newKeyError }"
                    :placeholder="t('translations.value_placeholder', 'Текст перевода')"
                  />
                </span>
                <span v-if="ensureState(page.page).newKeyError" class="form-error">{{ ensureState(page.page).newKeyError }}</span>
                <button type="submit" class="action-btn add-btn" :disabled="ensureState(page.page).isAdding">
                  {{ ensureState(page.page).isAdding
                    ? t('translations.saving', 'Сохранение...')
                    : t('translations.add_key', 'Добавить ключ') }}
                </button>
              </form>
            </template>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.translations-page {
  min-height: 100vh;
  width: 100vw;
  background: #f8f9fa;
  padding-left: 70px;
}

.translations-content {
  padding: 2rem;
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.header-left h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 0.25rem 0;
}

.subtitle {
  font-size: 1rem;
  color: #666;
  margin: 0;
}

.header-stats {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #888;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  line-height: 0;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: white;
  color: #555;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.refresh-btn svg {
  display: block;
  width: 18px;
  height: 18px;
  color: inherit;
  stroke: currentColor;
  fill: none;
}

.refresh-btn:hover:not(:disabled) {
  background: #f0f2ff;
  border-color: #667eea;
  color: #667eea;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.new-page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.95rem;
  height: 40px;
  line-height: 1;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.new-page-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
}

.new-page-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.new-page-input {
  flex: 1;
  padding: 0.55rem 0.75rem;
  border: 1px solid #d8dde4;
  border-radius: 7px;
  font-size: 0.9rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: #fafbfc;
  color: #333;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.new-page-input:focus {
  outline: none;
  background: white;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.08);
}

.new-page-input.error {
  border-color: #dc3545;
}

.new-page-submit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  height: 36px;
}

.new-page-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.35);
}

.new-page-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.new-page-cancel {
  background: transparent;
  border: 1px solid #e0e0e0;
  color: #555;
  height: 36px;
  padding: 0 0.95rem;
  border-radius: 7px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.new-page-cancel:hover:not(:disabled) {
  background: #f5f6f8;
  border-color: #c8ccd2;
}

.new-page-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.new-page-error {
  flex-basis: 100%;
  font-size: 0.8rem;
  color: #dc3545;
}

.error-banner {
  background: #f8d7da;
  color: #dc3545;
  padding: 1rem;
  border-radius: 10px;
  margin-bottom: 1.5rem;
  text-align: center;
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.pages-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-group {
  background: white;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.page-group-header {
  padding: 0;
}

.page-group-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.9rem 1.25rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  font-size: 1rem;
  transition: background 0.15s;
}

.page-group-toggle:hover {
  background: #f7f8fc;
}

.page-group-toggle svg {
  flex-shrink: 0;
  color: #667eea;
  transition: transform 0.2s;
}

.page-group-toggle svg.rotate {
  transform: rotate(-90deg);
}

.page-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a2e;
}

.page-count {
  margin-left: auto;
  background: #e5e9ff;
  color: #667eea;
  border-radius: 10px;
  padding: 0.15rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.page-count-empty {
  background: #fff1f0;
  color: #c43d3d;
}

.page-group-body {
  padding: 0.25rem 1.25rem 1.25rem 1.25rem;
  border-top: 1px solid #f0f0f0;
}

.loading-inline,
.error-inline,
.empty-inline {
  padding: 1.5rem;
  text-align: center;
  color: #666;
  font-size: 0.95rem;
}

.error-inline {
  color: #dc3545;
}

.search-row {
  margin: 1rem 0;
}

.search-input {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  color: #333;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.entries {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.entry-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(220px, 2fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  background: #fafbfc;
}

.key-chip {
  display: inline-block;
  background: #eef0f4;
  border: 1px solid #dce0e6;
  color: #444;
  border-radius: 6px;
  padding: 0.35rem 0.55rem;
  font-size: 0.8rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  word-break: break-all;
}

.entry-value {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.value-input,
.key-input {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid #d8dde4;
  border-radius: 7px;
  font-size: 0.9rem;
  background: white;
  color: #333;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.value-input:focus,
.key-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.08);
}

.value-input.error,
.key-input.error {
  border-color: #dc3545;
}

.field-error,
.form-error {
  color: #dc3545;
  font-size: 0.78rem;
}

.entry-actions {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: center;
}

.action-btn {
  border: none;
  padding: 0.4rem 0.85rem;
  border-radius: 7px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.save-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.35);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-btn {
  background: white;
  color: #dc3545;
  border: 1px solid #f3c2c7;
}

.delete-btn:hover:not(:disabled) {
  background: #fdf1f2;
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(220px, 2fr) auto;
  gap: 0.75rem;
  align-items: end;
  padding: 0.85rem;
  border: 1px dashed #d0d5db;
  border-radius: 10px;
  background: #fafbfc;
}

.add-row .form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.add-row label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.add-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  align-self: end;
  height: 38px;
}

.add-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.35);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .entry-row,
  .add-row {
    grid-template-columns: 1fr;
  }
}
</style>
