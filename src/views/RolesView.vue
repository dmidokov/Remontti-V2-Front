<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SidebarMenu from '../components/SidebarMenu.vue'
import { useTranslation } from '../composables/useTranslation'
import { showToast } from '../composables/useToast'
import { getRoles, getPermissions, createRole, setRolePermissions, deleteRole } from '../services/roleService'
import type { Role, Permission } from '../types/api'

const route = useRoute()
const { loadTranslations, t } = useTranslation()

const roles = ref<Role[]>([])
const catalog = ref<Permission[]>([])
const isLoading = ref(false)
const isLoadingCatalog = ref(false)
const error = ref('')
const catalogFailed = ref(false)
// Названия новых ролей, созданных в текущей сессии (перевода по title_key ещё нет).
const sessionTitles = ref<Record<string, string>>({})

const showCreate = ref(false)
const showEdit = ref(false)
const showCopy = ref(false)

const createForm = ref({ name: '', code: '', sortOrder: 0 })
const createErrors = ref<Record<string, string>>({})

const editingRole = ref<Role | null>(null)
const selectedPermissions = ref<string[]>([])
const expandedCategories = ref<Set<string>>(new Set())

const copySource = ref<Role | null>(null)
const copyForm = ref({ name: '', code: '' })
const copyErrors = ref<Record<string, string>>({})

onMounted(() => {
  loadTranslations('roles')
  loadTranslations('permissions')
  loadRoles()
  loadCatalog()
})

function roleTitle(role: Role): string {
  return resolveTranslation(role.title_key, sessionTitles.value[role.code] || role.code)
}

/**
 * Перевод названия роли/права. Реальный API отдаёт ключи БЕЗ префикса страницы
 * (crm_admin, dashboard.view), mock — с полным префиксом (roles.crm_admin).
 * Пробуем оба варианта.
 */
function resolveTranslation(fullKey: string, fallback: string): string {
  const direct = t(fullKey)
  if (direct) return direct
  const i = fullKey.indexOf('.')
  if (i !== -1) {
    const suffixed = t(fullKey.slice(i + 1))
    if (suffixed) return suffixed
  }
  return fallback
}

function transliterate(text: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  }
  return text
    .toLowerCase()
    .replace(/ё/g, 'e')
    .split('')
    .map(ch => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function generateCode(name: string): string {
  return transliterate(name.trim())
}

async function loadRoles() {
  isLoading.value = true
  error.value = ''
  try {
    const response = await getRoles()
    roles.value = response.items
  } catch (e) {
    error.value = t('roles.error_load', 'Failed to load roles')
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

async function loadCatalog() {
  if (isLoadingCatalog.value) return
  isLoadingCatalog.value = true
  catalogFailed.value = false
  try {
    const response = await getPermissions()
    catalog.value = response.items
  } catch (e) {
    catalogFailed.value = true
    console.error(e)
  } finally {
    isLoadingCatalog.value = false
  }
}

const catalogByCode = computed(() => {
  const map = new Map<string, Permission>()
  for (const perm of catalog.value) map.set(perm.code, perm)
  return map
})

function permTitle(code: string): string {
  const perm = catalogByCode.value.get(code)
  return perm ? resolveTranslation(perm.title_key, code) : code
}

const sortedRoles = computed(() =>
  [...roles.value].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.code.localeCompare(b.code),
  ),
)

// ---------- Создание (пустая роль) ----------

function openCreate() {
  createForm.value = { name: '', code: '', sortOrder: 0 }
  createErrors.value = {}
  showCreate.value = true
}

function onCreateName() {
  createErrors.value = {}
  createForm.value.code = generateCode(createForm.value.name)
}

function validateCode(code: string): string {
  if (!code) return t('roles.error_required_name', 'Введите название роли')
  if (!/^[a-z][a-z0-9_]*$/.test(code) || code.length > 64) {
    return t('roles.error_code_invalid', 'Код: строчные латинские буквы, цифры и подчёркивания')
  }
  return ''
}

async function handleCreate() {
  createErrors.value = {}
  if (!createForm.value.name.trim()) {
    createErrors.value.name = t('roles.error_required_name', 'Введите название роли')
    return
  }
  const codeError = validateCode(createForm.value.code)
  if (codeError) {
    createErrors.value.code = codeError
    return
  }

  try {
    const code = createForm.value.code
    const name = createForm.value.name.trim()
    await createRole({
      code,
      title_key: `roles.${code}`,
      sort_order: createForm.value.sortOrder,
    })
    sessionTitles.value[code] = name
    showToast(`${t('roles.toast_created', 'Role created')} "${name}"`, 'success')
    await loadRoles()
    showCreate.value = false
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('roles.error_failed_save', 'Failed to save role')
    showToast(msg, 'error')
    console.error(e)
  }
}

// ---------- Редактирование прав ----------

function openEdit(role: Role) {
  editingRole.value = role
  selectedPermissions.value = [...(role.permissions ?? [])]
  expandedCategories.value = new Set()
  showEdit.value = true
}

function onFieldInput() {
  createErrors.value = {}
  copyErrors.value = {}
}

function togglePermission(code: string) {
  const i = selectedPermissions.value.indexOf(code)
  if (i === -1) {
    selectedPermissions.value.push(code)
  } else {
    selectedPermissions.value.splice(i, 1)
  }
}

function toggleCategory(category: string) {
  const next = new Set(expandedCategories.value)
  if (next.has(category)) {
    next.delete(category)
  } else {
    next.add(category)
  }
  expandedCategories.value = next
}

const groupedPermissions = computed(() => {
  const map = new Map<string, Permission[]>()
  for (const perm of catalog.value) {
    const category = perm.code.split('.')[0] || 'other'
    if (!map.has(category)) map.set(category, [])
    map.get(category)!.push(perm)
  }
  return Array.from(map, ([category, items]) => ({ category, items }))
})

async function handleEditSubmit() {
  if (!editingRole.value) return
  try {
    await setRolePermissions(editingRole.value.code, {
      permissions: selectedPermissions.value,
    })
    showToast(`${t('roles.toast_updated', 'Role permissions updated')} "${roleTitle(editingRole.value)}"`, 'success')
    await loadRoles()
    showEdit.value = false
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('roles.error_failed_save', 'Failed to save role')
    showToast(msg, 'error')
    console.error(e)
  }
}

// ---------- Копирование ----------

function openCopy(role: Role) {
  copySource.value = role
  copyForm.value = { name: '', code: '' }
  copyErrors.value = {}
  showCopy.value = true
}

function onCopyName() {
  copyErrors.value = {}
  copyForm.value.code = generateCode(copyForm.value.name)
}

async function handleCopy() {
  if (!copySource.value) return
  copyErrors.value = {}
  if (!copyForm.value.name.trim()) {
    copyErrors.value.name = t('roles.error_required_name', 'Введите название роли')
    return
  }
  const codeError = validateCode(copyForm.value.code)
  if (codeError) {
    copyErrors.value.code = codeError
    return
  }

  const code = copyForm.value.code
  const name = copyForm.value.name.trim()
  try {
    await createRole({
      code,
      title_key: `roles.${code}`,
      sort_order: copySource.value.sort_order ?? 0,
    })
    sessionTitles.value[code] = name
    try {
      await setRolePermissions(code, {
        permissions: copySource.value.permissions ?? [],
      })
    } catch (e) {
      showToast(t('roles.error_copy_permissions', 'Role created, but permissions could not be copied'), 'error')
      console.error(e)
    }
    showToast(`${t('roles.toast_copied', 'Role copied')} "${name}"`, 'success')
    await loadRoles()
    showCopy.value = false
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('roles.error_failed_save', 'Failed to save role')
    showToast(msg, 'error')
    console.error(e)
  }
}

// ---------- Удаление ----------

async function handleDelete(role: Role) {
  const title = roleTitle(role)
  if (!confirm(`${t('roles.delete_confirm', 'Delete role')} "${title}"?`)) return
  try {
    await deleteRole(role.code)
    showToast(`${t('roles.toast_deleted', 'Role deleted')} "${title}"`, 'success')
    await loadRoles()
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('roles.error_failed_delete', 'Failed to delete role')
    showToast(msg, 'error')
    console.error(e)
  }
}

function closeModal(name: 'create' | 'edit' | 'copy') {
  if (name === 'create') showCreate.value = false
  if (name === 'edit') showEdit.value = false
  if (name === 'copy') showCopy.value = false
}
</script>

<template>
  <div class="roles-page">
    <SidebarMenu :current-route="route.path" />

    <main class="roles-content">
      <div class="roles-header">
        <div class="header-left">
          <h1><T k="roles.title" /></h1>
          <p class="subtitle"><T k="roles.subtitle" /></p>
        </div>
        <button class="add-btn" @click="openCreate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <T k="roles.add" />
        </button>
      </div>

      <div v-if="error" class="error-banner">{{ error }}</div>

      <div v-if="isLoading" class="loading"><T k="roles.loading" /></div>

      <div v-else-if="sortedRoles.length === 0" class="empty-state">
        <p><T k="roles.no_roles" /></p>
      </div>

      <div v-else class="roles-grid">
        <div v-for="role in sortedRoles" :key="role.code" class="role-card">
          <div class="role-card-header">
            <div class="role-title">
              <div class="role-name">{{ roleTitle(role) }}</div>
              <span class="role-code">{{ role.code }}</span>
            </div>
            <span v-if="role.sort_order" class="role-sort">{{ role.sort_order }}</span>
          </div>

          <div class="role-meta">
            <span><T k="roles.field_permissions" />:</span>
            <span class="val">{{ (role.permissions?.length ?? 0) }} {{ t('roles.perms_count', 'rights') }}</span>
          </div>

          <div v-if="role.permissions?.length" class="perm-preview">
            <span
              v-for="perm in role.permissions.slice(0, 8)"
              :key="perm"
              class="perm-chip"
            >{{ permTitle(perm) }}</span>
            <span v-if="role.permissions.length > 8" class="perm-more">
              +{{ role.permissions.length - 8 }}
            </span>
          </div>

          <div class="card-actions">
            <button class="action-btn edit-btn" @click="openEdit(role)">
              <T k="roles.edit" />
            </button>
            <button class="action-btn copy-btn" @click="openCopy(role)">
              <T k="roles.copy" />
            </button>
            <button class="action-btn delete-btn" @click="handleDelete(role)">
              <T k="roles.delete" />
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Создать роль -->
    <Teleport to="body">
      <div v-if="showCreate" class="modal-overlay" @click.self="closeModal('create')">
        <div class="modal">
          <div class="modal-header">
            <h2><T k="roles.add_title" /></h2>
            <button class="close-btn" @click="closeModal('create')">&times;</button>
          </div>

          <form class="modal-form" @submit.prevent="handleCreate">
            <div class="form-group">
              <label><T k="roles.name" /></label>
              <input
                v-model="createForm.name"
                type="text"
                autofocus
                :class="{ error: createErrors.name }"
                :placeholder="t('roles.name_placeholder', 'Например, Менеджер по продажам')"
                @input="onCreateName"
              />
              <span v-if="createErrors.name" class="field-error">{{ createErrors.name }}</span>
            </div>

            <div class="form-group">
              <label><T k="roles.field_code" /></label>
              <input
                v-model="createForm.code"
                type="text"
                :class="{ error: createErrors.code }"
                :placeholder="'manager'"
                @input="createErrors.code = ''"
              />
              <span class="form-hint"><T k="roles.code_hint" /></span>
              <span v-if="createErrors.code" class="field-error">{{ createErrors.code }}</span>
            </div>

            <div class="form-group">
              <label><T k="roles.field_sort" /></label>
              <input v-model.number="createForm.sortOrder" type="number" min="0" />
              <span class="form-hint"><T k="roles.sort_hint" /></span>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="closeModal('create')"><T k="roles.cancel" /></button>
              <button type="submit" class="btn-submit"><T k="roles.create" /></button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Изменить права роли -->
    <Teleport to="body">
      <div v-if="showEdit && editingRole" class="modal-overlay" @click.self="closeModal('edit')">
        <div class="modal">
          <div class="modal-header">
            <h2>
              <T k="roles.edit_title" /> — {{ roleTitle(editingRole) }}
            </h2>
            <button class="close-btn" @click="closeModal('edit')">&times;</button>
          </div>

          <form class="modal-form" @submit.prevent="handleEditSubmit">
            <div v-if="catalogFailed" class="empty-state block-state">
              <p><T k="roles.no_perms_title" /></p>
              <p class="muted"><T k="roles.no_perms_desc" /></p>
            </div>

            <template v-else>
              <div v-if="groupedPermissions.length === 0" class="section-empty">
                {{ t('roles.loading', 'Loading...') }}
              </div>
              <div v-else class="permission-groups">
                <div v-for="group in groupedPermissions" :key="group.category" class="permission-group">
                  <button
                    type="button"
                    class="permission-group-title"
                    :class="{ collapsed: !expandedCategories.has(group.category) }"
                    @click="toggleCategory(group.category)"
                  >
                    <svg :class="{ rotate: !expandedCategories.has(group.category) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    <span>{{ t(`permissions.category.${group.category}`, group.category) }}</span>
                    <span class="count">{{ group.items.length }}</span>
                  </button>
                  <div v-if="expandedCategories.has(group.category)" class="checkbox-grid">
                    <label
                      v-for="perm in group.items"
                      :key="perm.code"
                      class="checkbox-chip"
                      :class="{ checked: selectedPermissions.includes(perm.code) }"
                    >
                      <input
                        type="checkbox"
                        :checked="selectedPermissions.includes(perm.code)"
                        @change="togglePermission(perm.code)"
                      />
                      <span>{{ permTitle(perm.code) }}</span>
                      <span v-if="perm.system_only" class="system-badge"><T k="roles.system_only" /></span>
                    </label>
                  </div>
                </div>
              </div>
            </template>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="closeModal('edit')"><T k="roles.cancel" /></button>
              <button type="submit" class="btn-submit" :disabled="catalogFailed"><T k="roles.save" /></button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Копировать роль -->
    <Teleport to="body">
      <div v-if="showCopy && copySource" class="modal-overlay" @click.self="closeModal('copy')">
        <div class="modal modal-sm">
          <div class="modal-header">
            <h2>
              <T k="roles.copy_title" /> — {{ roleTitle(copySource) }}
            </h2>
            <button class="close-btn" @click="closeModal('copy')">&times;</button>
          </div>

          <form class="modal-form" @submit.prevent="handleCopy">
            <div class="form-group">
              <label><T k="roles.name" /></label>
              <input
                v-model="copyForm.name"
                type="text"
                autofocus
                :class="{ error: copyErrors.name }"
                :placeholder="t('roles.name_placeholder', 'Например, Менеджер по продажам')"
                @input="onCopyName"
              />
              <span v-if="copyErrors.name" class="field-error">{{ copyErrors.name }}</span>
            </div>

            <div class="form-group">
              <label><T k="roles.field_code" /></label>
              <input
                v-model="copyForm.code"
                type="text"
                :class="{ error: copyErrors.code }"
                :placeholder="'manager'"
                @input="copyErrors.code = ''"
              />
              <span class="form-hint"><T k="roles.code_hint" /></span>
              <span v-if="copyErrors.code" class="field-error">{{ copyErrors.code }}</span>
            </div>

            <div class="copy-note">
              {{ (copySource.permissions?.length ?? 0) }} {{ t('roles.perms_count', 'rights') }}
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="closeModal('copy')"><T k="roles.cancel" /></button>
              <button type="submit" class="btn-submit"><T k="roles.create" /></button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.roles-page {
  min-height: 100vh;
  width: 100vw;
  background: #f8f9fa;
  padding-left: 70px;
}

.roles-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.roles-header {
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
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.block-state {
  padding: 1.5rem;
}

.block-state .muted {
  color: #888;
  font-size: 0.9rem;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

.role-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.role-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

.role-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.role-title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.role-name {
  font-size: 1.15rem;
  font-weight: 600;
  color: #1a1a2e;
}

.role-code {
  display: inline-block;
  align-self: flex-start;
  background: #eef0f4;
  color: #555;
  border-radius: 6px;
  padding: 0.15rem 0.5rem;
  font-size: 0.78rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.role-sort {
  background: #e5e9ff;
  color: #667eea;
  border-radius: 10px;
  padding: 0.1rem 0.6rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.role-meta {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.role-meta span:first-child {
  color: #888;
  font-size: 0.8rem;
}

.role-meta .val {
  color: #333;
  font-weight: 600;
}

.perm-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.perm-chip {
  background: #eef0f4;
  border: 1px solid #dce0e6;
  color: #444;
  border-radius: 12px;
  padding: 0.2rem 0.6rem;
  font-size: 0.78rem;
}

.perm-more {
  color: #888;
  font-size: 0.8rem;
  align-self: center;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: auto;
}

.action-btn {
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.edit-btn {
  background: #667eea;
  color: white;
}

.edit-btn:hover {
  background: #5566d6;
}

.copy-btn {
  background: #17a2b8;
  color: white;
}

.copy-btn:hover {
  background: #138496;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

/* Modal */
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
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-sm {
  max-width: 420px;
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
  color-scheme: light;
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

.form-hint {
  font-size: 0.78rem;
  color: #999;
}

.field-error {
  color: #dc3545;
  font-size: 0.8rem;
}

.copy-note {
  font-size: 0.9rem;
  color: #666;
  background: #f0f4ff;
  border: 1px solid #dce4ff;
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
}

.section-empty {
  font-size: 0.85rem;
  color: #888;
}

.permission-groups {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.permission-group-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.35rem 0.5rem;
  margin-bottom: 0.15rem;
  background: none;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.permission-group-title:hover {
  background: #f0f2ff;
}

.permission-group-title svg {
  flex-shrink: 0;
  transition: transform 0.2s;
}

.permission-group-title svg.rotate {
  transform: rotate(-90deg);
}

.permission-group-title .count {
  margin-left: auto;
  background: #e5e9ff;
  color: #667eea;
  border-radius: 10px;
  padding: 0.05rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
}

.checkbox-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.checkbox-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  border: 1px solid #d0d0d0;
  border-radius: 20px;
  font-size: 0.85rem;
  color: #444;
  cursor: pointer;
  background: white;
  user-select: none;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.checkbox-chip input {
  accent-color: #667eea;
  cursor: pointer;
}

.checkbox-chip.checked {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  color: #333;
}

.system-badge {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
  border-radius: 10px;
  padding: 0.05rem 0.45rem;
  font-size: 0.7rem;
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