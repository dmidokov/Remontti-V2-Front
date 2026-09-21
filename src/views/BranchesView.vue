<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SidebarMenu from '../components/SidebarMenu.vue'
import { useTranslation } from '../composables/useTranslation'
import { showToast } from '../composables/useToast'
import {
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from '../services/branchService'
import type {
  BranchItem,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '../types/api'

const route = useRoute()
const { loadTranslations, t } = useTranslation()

const branches = ref<BranchItem[]>([])
const permissions = ref<string[]>([])
const isLoading = ref(false)
const loadError = ref('')

const showModal = ref(false)
const editingBranch = ref<BranchItem | null>(null)
const isSubmitting = ref(false)

const formData = ref<CreateBranchRequest>({ name: '', address: '', phone: '' })
const formErrors = ref<Record<string, string>>({})

onMounted(() => {
  loadTranslations('branches')
  loadList()
})

function hasPermission(perm: string): boolean {
  return permissions.value.includes(perm)
}

async function loadList() {
  isLoading.value = true
  loadError.value = ''
  try {
    const response = await listBranches()
    branches.value = response.items
    permissions.value = response.permissions
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    loadError.value = msg || t('branches.error_load', 'Не удалось загрузить список точек')
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

function openAddModal() {
  editingBranch.value = null
  formData.value = { name: '', address: '', phone: '' }
  formErrors.value = {}
  showModal.value = true
}

function openEditModal(branch: BranchItem) {
  editingBranch.value = branch
  formData.value = { name: branch.name, address: branch.address, phone: branch.phone }
  formErrors.value = {}
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingBranch.value = null
}

function onFieldInput(field: string) {
  formErrors.value[field] = ''
}

function validateForm(): boolean {
  formErrors.value = {}
  const name = formData.value.name.trim()
  const address = formData.value.address.trim()
  const phone = (formData.value.phone ?? '').trim()

  if (!name) {
    formErrors.value.name = t('branches.name_required', 'Введите название')
    return false
  }
  if (name.length > 128) {
    formErrors.value.name = t('branches.name_too_long', 'Название должно быть не длиннее 128 символов')
    return false
  }
  if (!address) {
    formErrors.value.address = t('branches.address_required', 'Введите адрес')
    return false
  }
  if (address.length > 255) {
    formErrors.value.address = t('branches.address_too_long', 'Адрес должен быть не длиннее 255 символов')
    return false
  }
  if (phone.length > 32) {
    formErrors.value.phone = t('branches.phone_too_long', 'Телефон должен быть не длиннее 32 символов')
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validateForm()) return

  isSubmitting.value = true
  const payload: CreateBranchRequest | UpdateBranchRequest = {
    name: formData.value.name.trim(),
    address: formData.value.address.trim(),
    phone: (formData.value.phone ?? '').trim(),
  }
  try {
    if (editingBranch.value) {
      await updateBranch(editingBranch.value.id, payload)
      showToast(t('branches.toast_updated', 'Точка изменена'), 'success')
    } else {
      await createBranch(payload)
      showToast(t('branches.toast_created', 'Точка создана'), 'success')
    }
    await loadList()
    closeModal()
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('branches.error_save', 'Не удалось сохранить точку')
    showToast(msg, 'error')
    console.error(e)
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(branch: BranchItem) {
  if (!confirm(`${t('branches.delete_confirm', 'Удалить точку')} «${branch.name}»?`)) return
  try {
    await deleteBranch(branch.id)
    showToast(t('branches.toast_deleted', 'Точка удалена'), 'success')
    await loadList()
  } catch (e) {
    const err = e as { code?: string; message?: string }
    if (err?.code === 'BRANCH_IN_USE') {
      showToast(t('branches.error_in_use', 'К точке подключены пользователи'), 'error')
    } else {
      showToast(err?.message || t('branches.error_delete', 'Не удалось удалить точку'), 'error')
    }
    console.error(e)
  }
}

const showNoAccess = computed(() =>
  !isLoading.value && permissions.value.length > 0 && !hasPermission('branches.view'),
)
</script>

<template>
  <div class="branches-page">
    <SidebarMenu :current-route="route.path" />

    <main class="branches-content">
      <header class="branches-header">
        <div class="header-left">
          <h1><T k="branches.title" /></h1>
          <p class="subtitle"><T k="branches.subtitle" /></p>
        </div>
        <button
          v-if="hasPermission('branches.create')"
          class="add-btn"
          @click="openAddModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <T k="branches.add" />
        </button>
      </header>

      <div v-if="loadError" class="error-banner">{{ loadError }}</div>

      <div v-if="showNoAccess" class="empty-state">
        <p><T k="branches.error_no_access" /></p>
      </div>

      <div v-else-if="isLoading" class="loading"><T k="branches.loading" /></div>

      <div v-else-if="branches.length === 0" class="empty-state">
        <p><T k="branches.empty" /></p>
      </div>

      <div v-else class="branches-grid">
        <article v-for="branch in branches" :key="branch.id" class="branch-card">
          <header class="branch-card-head">
            <div class="branch-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-9a2 2 0 012-2v0a2 2 0 012 2v9" />
              </svg>
            </div>
            <h2 class="branch-name">{{ branch.name }}</h2>
          </header>

          <dl class="branch-meta">
            <div>
              <dt><T k="branches.field_address" /></dt>
              <dd>{{ branch.address || '—' }}</dd>
            </div>
            <div>
              <dt><T k="branches.field_phone" /></dt>
              <dd>
                <template v-if="branch.phone">{{ branch.phone }}</template>
                <span v-else class="muted">—</span>
              </dd>
            </div>
          </dl>

          <footer class="branch-card-actions">
            <button
              v-if="hasPermission('branches.update')"
              class="action-btn edit-btn"
              @click="openEditModal(branch)"
            >
              <T k="branches.edit" />
            </button>
            <button
              v-if="hasPermission('branches.delete')"
              class="action-btn delete-btn"
              @click="handleDelete(branch)"
            >
              <T k="branches.delete" />
            </button>
          </footer>
        </article>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <h2>
              {{ editingBranch ? t('branches.edit_title', 'Изменить точку') : t('branches.add_title', 'Создать точку') }}
            </h2>
            <button class="close-btn" @click="closeModal">&times;</button>
          </div>

          <form class="modal-form" @submit.prevent="handleSubmit">
            <div class="form-group">
              <label><T k="branches.field_name" /> *</label>
              <input
                v-model="formData.name"
                type="text"
                :class="{ error: formErrors.name }"
                :placeholder="t('branches.name_placeholder', 'Точка на Ленина')"
                @input="onFieldInput('name')"
              />
              <span v-if="formErrors.name" class="field-error">{{ formErrors.name }}</span>
            </div>

            <div class="form-group">
              <label><T k="branches.field_address" /> *</label>
              <input
                v-model="formData.address"
                type="text"
                :class="{ error: formErrors.address }"
                :placeholder="t('branches.address_placeholder', 'г. Казань, ул. Ленина, 12')"
                @input="onFieldInput('address')"
              />
              <span v-if="formErrors.address" class="field-error">{{ formErrors.address }}</span>
            </div>

            <div class="form-group">
              <label><T k="branches.field_phone" /></label>
              <input
                v-model="formData.phone"
                type="text"
                :class="{ error: formErrors.phone }"
                :placeholder="t('branches.phone_placeholder', '+7 843 000-00-00')"
                @input="onFieldInput('phone')"
              />
              <span v-if="formErrors.phone" class="field-error">{{ formErrors.phone }}</span>
              <span class="field-hint"><T k="branches.phone_empty_hint" /></span>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="closeModal"><T k="branches.cancel" /></button>
              <button type="submit" class="btn-submit" :disabled="isSubmitting">
                {{ isSubmitting
                  ? t('branches.saving', 'Сохранение...')
                  : editingBranch ? t('branches.save', 'Сохранить') : t('branches.create', 'Создать') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.branches-page {
  min-height: 100vh;
  width: 100vw;
  background: #f8f9fa;
  padding-left: 70px;
}

.branches-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.branches-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
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

.add-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
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
  font-size: 1.1rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.branches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.branch-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.branch-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

.branch-card-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.branch-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.branch-icon svg {
  width: 24px;
  height: 24px;
}

.branch-name {
  font-size: 1.15rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
  word-break: break-word;
}

.branch-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
}

.branch-meta div {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.branch-meta dt {
  font-size: 0.75rem;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.branch-meta dd {
  margin: 0;
  font-size: 0.95rem;
  color: #333;
  word-break: break-word;
}

.muted {
  color: #999;
}

.branch-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: auto;
}

.action-btn {
  border: none;
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

.edit-btn {
  background: #667eea;
  color: white;
}

.edit-btn:hover {
  background: #5566d6;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.4rem;
  color: #1a1a2e;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.modal-form {
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #555;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #ffffff;
  color: #333;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input.error {
  border-color: #dc3545;
}

.field-error {
  color: #dc3545;
  font-size: 0.8rem;
}

.field-hint {
  font-size: 0.78rem;
  color: #888;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 0.5rem;
}

.btn-cancel,
.btn-submit {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f0f0f0;
  color: #333;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-submit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
