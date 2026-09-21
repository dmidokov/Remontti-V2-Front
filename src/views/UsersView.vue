<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SidebarMenu from '../components/SidebarMenu.vue'
import { useTranslation } from '../composables/useTranslation'
import { getUsers, createUser, updateUser, deleteUser, getTenants, getRoles, getPermissions, changeUserPassword } from '../services/userService'
import { resolveIconSrc } from '../services/profileService'
import { showToast } from '../composables/useToast'
import type { ApiUser, Tenant, Role, Permission } from '../types/api'

const route = useRoute()
const { loadTranslations, t } = useTranslation()

const users = ref<ApiUser[]>([])
const permissions = ref<string[]>([])
const searchQuery = ref('')
const isLoading = ref(false)
const error = ref('')
const showModal = ref(false)
const editingUser = ref<ApiUser | null>(null)
const isSubmitting = ref(false)

const formData = ref({
  fullName: '',
  password: '',
  tenant: '',
})

const tenants = ref<Tenant[]>([])
const availableRoles = ref<Role[]>([])
const availablePermissions = ref<Permission[]>([])
const selectedRoles = ref<string[]>([])
const selectedPermissions = ref<string[]>([])
const expandedCategories = ref<Set<string>>(new Set())
const viewingUser = ref<ApiUser | null>(null)
const viewedExpanded = ref<Set<string>>(new Set())
const formErrors = ref<Record<string, string>>({})

onMounted(() => {
  loadTranslations('users')
  loadUsers()
  void ensureTenants()
})

function hasPermission(perm: string): boolean {
  return permissions.value.includes(perm)
}

const canSelectTenant = computed(() =>
  hasPermission('users.create.cross_tenant') || hasPermission('tenants.view'),
)

async function loadUsers() {
  isLoading.value = true
  error.value = ''
  try {
    const response = await getUsers()
    users.value = response.items
    permissions.value = response.permissions
  } catch (e) {
    error.value = t('users.error_load', 'Failed to load users')
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

function openAddModal() {
  editingUser.value = null
  formData.value = { fullName: '', password: '', tenant: '' }
  if (canSelectTenant.value) loadTenants()
  formErrors.value = {}
  showModal.value = true
}

function openEditModal(user: ApiUser) {
  editingUser.value = user
  formData.value = { fullName: '', password: '', tenant: '' }
  selectedRoles.value = [...user.roles]
  selectedPermissions.value = [...user.direct_permissions]
  formErrors.value = {}
  loadUserOptions(user.domain)
  showModal.value = true
}

async function loadTenants() {
  if (tenants.value.length > 0) return
  try {
    const response = await getTenants()
    tenants.value = response.items
  } catch (e) {
    showToast(t('users.error_failed_tenants', 'Failed to load tenants'), 'error')
    console.error(e)
  }
}

/** Молча подтягивает реестр тенантов для отображения имён групп. Ошибки не критичны. */
async function ensureTenants() {
  if (tenants.value.length > 0) return
  try {
    const response = await getTenants()
    tenants.value = response.items
  } catch {
    // Без имён в карточках останутся домены — на функциональность не влияет.
  }
}

async function loadUserOptions(domain: string) {
  try {
    const [rolesRes, permsRes] = await Promise.all([
      getRoles(domain),
      getPermissions(domain),
    ])
    availableRoles.value = rolesRes.items
    availablePermissions.value = permsRes.items
    expandedCategories.value = new Set()
  } catch (e) {
    showToast(t('users.error_failed_options', 'Failed to load roles/permissions'), 'error')
    console.error(e)
  }
}

function toggleRole(code: string) {
  const i = selectedRoles.value.indexOf(code)
  if (i === -1) {
    selectedRoles.value.push(code)
  } else {
    selectedRoles.value.splice(i, 1)
  }
}

function togglePermission(code: string) {
  const i = selectedPermissions.value.indexOf(code)
  if (i === -1) {
    selectedPermissions.value.push(code)
  } else {
    selectedPermissions.value.splice(i, 1)
  }
}

const groupedPermissions = computed(() => {
  const map = new Map<string, Permission[]>()
  for (const perm of availablePermissions.value) {
    const category = perm.code.split('.')[0] || 'other'
    if (!map.has(category)) map.set(category, [])
    map.get(category)!.push(perm)
  }
  return Array.from(map, ([category, items]) => ({ category, items }))
})

function toggleCategory(category: string) {
  const next = new Set(expandedCategories.value)
  if (next.has(category)) {
    next.delete(category)
  } else {
    next.add(category)
  }
  expandedCategories.value = next
}

function openViewPermissions(user: ApiUser) {
  viewingUser.value = user
  viewedExpanded.value = new Set()
}

function closeViewPermissions() {
  viewingUser.value = null
}

function toggleViewedCategory(category: string) {
  const next = new Set(viewedExpanded.value)
  if (next.has(category)) {
    next.delete(category)
  } else {
    next.add(category)
  }
  viewedExpanded.value = next
}

const viewedPermissionGroups = computed(() => {
  if (!viewingUser.value) return []
  const map = new Map<string, string[]>()
  for (const perm of viewingUser.value.direct_permissions) {
    const category = perm.split('.')[0] || 'other'
    if (!map.has(category)) map.set(category, [])
    map.get(category)!.push(perm)
  }
  return Array.from(map, ([category, items]) => ({ category, items }))
})

function closeModal() {
  showModal.value = false
  editingUser.value = null
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
    .replace(/[^a-z0-9.]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.')
}

const generatedLogin = computed(() => {
  const tokens = formData.value.fullName.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ''
  const first = transliterate(tokens[0])
  const last = tokens.length > 1 ? transliterate(tokens[tokens.length - 1]) : ''
  return [first, last].filter(Boolean).join('.')
})

function onFieldInput(field: string) {
  formErrors.value[field] = ''
}

function validateForm(): boolean {
  formErrors.value = {}

  if (!editingUser.value) {
    if (!formData.value.fullName.trim()) {
      formErrors.value.fullName = t('users.error_required_name', 'Введите имя и фамилию')
      return false
    }

    if (!generatedLogin.value) {
      formErrors.value.login = 'Логин не может быть сформирован'
      return false
    }

    if (!formData.value.password.trim()) {
      formErrors.value.password = t('users.error_required_password', 'Password is required')
      return false
    }
  }

  const password = formData.value.password.trim()
  if (password && password.length < 8) {
    formErrors.value.password = t('users.password_too_short', 'Пароль должен быть не короче 8 символов')
    return false
  }

  return true
}

async function handleSubmit() {
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    if (editingUser.value) {
      await updateUser(editingUser.value.id, {
        roles: selectedRoles.value,
        permissions: selectedPermissions.value,
      })
      const password = formData.value.password.trim()
      if (password) {
        await changeUserPassword(editingUser.value.id, password)
      }
      showToast(`${t('users.toast_updated', 'User updated')} "${editingUser.value.login}"`, 'success')
    } else {
      const login = generatedLogin.value
      const splitName = formData.value.fullName.trim().split(/\s+/)
      await createUser({
        login,
        password: formData.value.password,
        domain: canSelectTenant.value && formData.value.tenant ? formData.value.tenant : undefined,
        name: splitName.length > 0 ? splitName[0] : "unknown",
        last_name: splitName.length > 1 ? splitName[1] : "unknown"
      })
      showToast(`${t('users.toast_created', 'User created')} "${login}"`, 'success')
    }
    await loadUsers()
    closeModal()
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('users.error_failed_save', 'Failed to save user')
    showToast(msg, 'error')
    console.error(e)
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(user: ApiUser) {
  if (!confirm(`${t('users.delete_confirm', 'Delete user')} "${user.login}"?`)) return
  try {
    await deleteUser(user.id)
    showToast(`${t('users.toast_deleted', 'User deleted')} "${user.login}"`, 'success')
    await loadUsers()
  } catch (e) {
    showToast(t('users.error_failed_delete', 'Failed to delete user'), 'error')
    console.error(e)
  }
}

function getInitials(user: ApiUser): string {
  // Реальный API отдаёт name/last_name. В моковых учётках поля пустые —
  // берём инициалы из логина как фолбэк.
  const first = (user.name || '').trim()[0] || ''
  const last = (user.last_name || '').trim()[0] || ''
  if (first || last) return (first + last).toUpperCase().slice(0, 2)
  return user.login.split('.')[0]?.toUpperCase().slice(0, 2) || user.login.slice(0, 2).toUpperCase()
}

function iconSrcFor(user: ApiUser): string | null {
  return resolveIconSrc(user.icon_url)
}

const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(user =>
    user.login.toLowerCase().includes(q) ||
    user.domain.toLowerCase().includes(q) ||
    user.roles.some(r => r.toLowerCase().includes(q)),
  )
})

const tenantByDomain = computed(() => {
  const map = new Map<string, Tenant>()
  for (const tenant of tenants.value) map.set(tenant.domain, tenant)
  return map
})

const groupedByDomain = computed(() => {
  const map = new Map<string, ApiUser[]>()
  for (const user of filteredUsers.value) {
    if (!map.has(user.domain)) map.set(user.domain, [])
    map.get(user.domain)!.push(user)
  }
  return Array.from(map, ([domain, items]) => ({
    domain,
    tenantName: tenantByDomain.value.get(domain)?.name || null,
    items: [...items].sort((a, b) => a.login.localeCompare(b.login)),
  })).sort((a, b) => a.domain.localeCompare(b.domain))
})

// По умолчанию все группы свернуты.
const collapsedGroups = ref<Set<string>>(new Set())

function toggleGroup(domain: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(domain)) {
    next.delete(domain)
  } else {
    next.add(domain)
  }
  collapsedGroups.value = next
}
</script>

<template>
  <div class="users-page">
    <SidebarMenu :current-route="route.path" />

    <main class="users-content">
      <div class="users-header">
        <div class="header-left">
          <h1><T k="users.title" /></h1>
          <p class="subtitle"><T k="users.subtitle" /></p>
        </div>
        <button v-if="hasPermission('users.create')" class="add-btn" @click="openAddModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <T k="users.add" />
        </button>
      </div>

      <div v-if="error" class="error-banner">{{ error }}</div>

      <div v-if="isLoading" class="loading"><T k="users.loading" /></div>

      <div class="users-cards-block">
        <div class="search-row">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            :placeholder="t('users.search_placeholder', 'Поиск по логину, домену или роли...')"
          />
        </div>

        <div class="users-groups">
          <section v-for="group in groupedByDomain" :key="group.domain" class="users-group">
            <header class="users-group-header">
              <button
                type="button"
                class="users-group-toggle"
                :class="{ collapsed: collapsedGroups.has(group.domain) }"
                @click="toggleGroup(group.domain)"
              >
                <svg :class="{ rotate: collapsedGroups.has(group.domain) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <h2>{{ group.tenantName || group.domain }}</h2>
                <span v-if="group.tenantName" class="users-group-domain">{{ group.domain }}</span>
                <span class="users-group-count">{{ group.items.length }}</span>
              </button>
            </header>

            <div v-if="collapsedGroups.has(group.domain)" class="users-cards">
              <div v-for="user in group.items" :key="user.id" class="user-card">
                <div class="user-card-header">
                  <div class="user-avatar-large">
                    <template v-if="iconSrcFor(user)">
                      <img :src="iconSrcFor(user)!" :alt="user.login" />
                    </template>
                    <template v-else>{{ getInitials(user) }}</template>
                  </div>
                  <div class="user-card-name">
                    <h3>{{ user.login }}</h3>
                  </div>
                </div>

                <div class="user-card-meta">
                  <div>
                    <span><T k="users.field_domain" />:</span>
                    <span class="val">{{ user.domain }}</span>
                  </div>
                  <div>
                    <span><T k="users.field_created" />:</span>
                    <span class="val">{{ new Date(user.created_at).toLocaleDateString() }}</span>
                  </div>
                  <div>
                    <span><T k="users.field_roles" />:</span>
                    <span class="val">{{ user.roles.length ? user.roles.join(', ') : '—' }}</span>
                  </div>
                  <div class="meta-permissions">
                    <span><T k="users.field_permissions" />:</span>
                    <button
                      v-if="user.direct_permissions.length"
                      class="view-perms-btn"
                      @click="openViewPermissions(user)"
                    >
                      {{ t('users.view_permissions_btn', 'Показать') }} ({{ user.direct_permissions.length }})
                    </button>
                    <span v-else class="val">—</span>
                  </div>
                </div>

                <div class="card-actions">
                  <button
                    v-if="hasPermission('users.update')"
                    class="action-btn edit-btn"
                    @click="openEditModal(user)"
                  >
                    <T k="users.edit" />
                  </button>
                  <button
                    v-if="hasPermission('users.delete')"
                    class="action-btn delete-btn"
                    @click="handleDelete(user)"
                  >
                    <T k="users.delete" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div v-if="filteredUsers.length === 0 && !isLoading" class="no-results">
          {{ t('users.no_results', 'Ничего не найдено по запросу') }} «{{ searchQuery }}»
        </div>
      </div>
    </main>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingUser ? t('users.edit_title', 'Edit User') : t('users.add_title', 'Add User') }}</h2>
            <button class="close-btn" @click="closeModal">&times;</button>
          </div>

          <form class="modal-form" @submit.prevent="handleSubmit">
            <span v-if="editingUser" class="form-group">
              <label><T k="users.login" /></label>
              <input
                :value="editingUser.login"
                type="text"
                readonly
                class="login-readonly"
              />
            </span>

            <template v-if="!editingUser">
              <div class="form-group">
                <label><T k="users.name" /></label>
                <input
                  v-model="formData.fullName"
                  type="text"
                  :class="{ error: formErrors.fullName }"
                  :placeholder="t('users.name_placeholder', 'Иван Иванов')"
                  @input="onFieldInput('fullName')"
                />
                <span v-if="formErrors.fullName" class="field-error">{{ formErrors.fullName }}</span>
              </div>

              <div class="form-group">
                <label><T k="users.login_auto" /></label>
                <input
                  :value="generatedLogin"
                  type="text"
                  readonly
                  class="login-readonly"
                  placeholder="ivan.ivanov"
                />
                <span v-if="formErrors.login" class="field-error">{{ formErrors.login }}</span>
              </div>
            </template>

            <template v-if="editingUser">
              <div class="edit-section">
                <div class="section-title"><T k="users.roles" /></div>
                <div v-if="availableRoles.length === 0" class="section-empty">{{ t('users.no_items', 'Нет доступных ролей') }}</div>
                <div v-else class="checkbox-grid">
                  <label
                    v-for="role in availableRoles"
                    :key="role.code"
                    class="checkbox-chip"
                    :class="{ checked: selectedRoles.includes(role.code) }"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedRoles.includes(role.code)"
                      @change="toggleRole(role.code)"
                    />
                    <span>{{ resolveTranslation(role.title_key, role.code) }}</span>
                  </label>
                </div>
              </div>

              <div class="edit-section">
                <div class="section-title"><T k="users.permissions" /></div>
                <div v-if="availablePermissions.length === 0" class="section-empty">{{ t('users.no_items', 'Нет доступных прав') }}</div>
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
                        <span>{{ resolveTranslation(perm.title_key, perm.code) }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <div class="form-group">
              <label>{{ editingUser ? t('users.new_password', 'New Password') : t('users.password', 'Password') }}</label>
              <input
                v-model="formData.password"
                type="password"
                :class="{ error: formErrors.password }"
                :placeholder="editingUser ? t('users.password_placeholder_edit', 'Оставьте пустым, чтобы не менять') : 'password'"
              />
              <span v-if="formErrors.password" class="field-error">{{ formErrors.password }}</span>
            </div>

            <div class="form-group" v-if="!editingUser && canSelectTenant">
              <label><T k="users.tenant" /></label>
              <select v-model="formData.tenant" class="tenant-select">
                <option value=""><T k="users.tenant_current" /></option>
                <option v-for="tenant in tenants" :key="tenant.domain" :value="tenant.domain">
                  {{ tenant.name }}
                </option>
              </select>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="closeModal"><T k="users.cancel" /></button>
              <button type="submit" class="btn-submit" :disabled="isSubmitting">
                {{ isSubmitting ? t('users.saving', 'Saving...') : editingUser ? t('users.save', 'Save') : t('users.create', 'Create') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal: просмотр прав пользователя -->
    <Teleport to="body">
      <div v-if="viewingUser" class="modal-overlay" @click.self="closeViewPermissions">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ t('users.view_permissions_title', 'Права пользователя') }} — {{ viewingUser.login }}</h2>
            <button class="close-btn" @click="closeViewPermissions">&times;</button>
          </div>

          <div class="modal-body">
            <div v-if="viewedPermissionGroups.length === 0" class="section-empty">
              {{ t('users.no_items', 'Нет доступных значений') }}
            </div>
            <div v-else class="permission-groups">
              <div v-for="group in viewedPermissionGroups" :key="group.category" class="permission-group">
                <button
                  type="button"
                  class="permission-group-title"
                  @click="toggleViewedCategory(group.category)"
                >
                  <svg :class="{ rotate: !viewedExpanded.has(group.category) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  <span>{{ t(`permissions.category.${group.category}`, group.category) }}</span>
                  <span class="count">{{ group.items.length }}</span>
                </button>
                <div v-if="viewedExpanded.has(group.category)" class="view-perm-chips">
                  <span v-for="perm in group.items" :key="perm" class="perm-chip">{{ perm }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.users-page {
  min-height: 100vh;
  width: 100vw;
  background: #f8f9fa;
  padding-left: 70px;
}

.users-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.users-header {
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

.loading {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.users-cards-block {
  margin-top: 1.5rem;
}

.search-row {
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 0.95rem;
  background: white;
  color: #333;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.users-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.users-groups {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.users-group-header {
  padding: 0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 1rem;
}

.users-group-toggle {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  width: 100%;
  padding: 0.5rem 0.25rem;
  background: none;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.users-group-toggle:hover {
  background: #f0f2ff;
}

.users-group-toggle svg {
  flex-shrink: 0;
  align-self: center;
  color: #667eea;
  transition: transform 0.2s;
}

.users-group-toggle svg.rotate {
  transform: rotate(-90deg);
}

.users-group-toggle h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.users-group-domain {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  color: #666;
  background: #f0f0f0;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.users-group-count {
  margin-left: auto;
  background: #e5e9ff;
  color: #667eea;
  border-radius: 10px;
  padding: 0.1rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.no-results {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.05rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.user-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.user-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

.user-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
}

.user-avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-card-name h3 {
  font-size: 1.15rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
  word-break: break-all;
}

.user-card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: #333;
  text-align: left;
  padding-left: 10px;
}

.user-card-meta div {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.user-card-meta div span:first-child {
  color: #888;
  font-size: 0.8rem;
  width: 90px;
  flex-shrink: 0;
  text-align: left;
}

.user-card-meta div span.val {
  font-size: 0.9rem;
  color: #333;
  word-break: break-all;
  background: #f0f0f0;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.meta-permissions {
  align-items: center;
}

.view-perms-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.view-perms-btn:hover {
  background: #5566d6;
}

.modal-body {
  padding: 1.5rem 2rem;
  max-height: 60vh;
  overflow-y: auto;
}

.view-perm-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.25rem 0 0.5rem 0.25rem;
}

.perm-chip {
  background: #eef0f4;
  border: 1px solid #dce0e6;
  color: #444;
  border-radius: 14px;
  padding: 0.3rem 0.7rem;
  font-size: 0.78rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
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

.action-btn + .action-btn {
  margin-left: 0.5rem;
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
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

.form-group input[readonly],
.login-readonly {
  background: #f0f0f0;
  color: #555;
  cursor: not-allowed;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.form-group select {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #ffffff;
  color: #333;
  color-scheme: light;
  transition: border-color 0.2s;
}

.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.edit-section {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.section-empty {
  font-size: 0.85rem;
  color: #888;
}

.checkbox-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
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

.field-error {
  color: #dc3545;
  font-size: 0.8rem;
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