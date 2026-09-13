<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SidebarMenu from '../components/SidebarMenu.vue'
import { getUsers, createUser, updateUser, deleteUser } from '../services/userService'
import { showToast } from '../composables/useToast'
import type { ApiUser } from '../types/api'

const route = useRoute()

const users = ref<ApiUser[]>([])
const permissions = ref<string[]>([])
const searchQuery = ref('')
const isLoading = ref(false)
const error = ref('')
const showModal = ref(false)
const editingUser = ref<ApiUser | null>(null)
const isSubmitting = ref(false)

const formData = ref({
  login: '',
  password: '',
})

const formErrors = ref<Record<string, string>>({})

onMounted(() => {
  loadUsers()
})

function hasPermission(perm: string): boolean {
  return permissions.value.includes(perm)
}

async function loadUsers() {
  isLoading.value = true
  error.value = ''
  try {
    const response = await getUsers()
    users.value = response.items
    permissions.value = response.permissions
  } catch (e) {
    error.value = 'Failed to load users'
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

function openAddModal() {
  editingUser.value = null
  formData.value = { login: '', password: '' }
  formErrors.value = {}
  showModal.value = true
}

function openEditModal(user: ApiUser) {
  editingUser.value = user
  formData.value = { login: user.login, password: '' }
  formErrors.value = {}
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingUser.value = null
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

function onLoginInput() {
  formErrors.value.login = ''
}

function validateForm(): boolean {
  formErrors.value = {}

  if (!formData.value.login.trim()) {
    formErrors.value.login = 'Login is required'
    return false
  }

  if (!formData.value.password.trim()) {
    formErrors.value.password = 'Password is required'
    return false
  }

  return true
}

async function handleSubmit() {
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    if (editingUser.value) {
      await updateUser(editingUser.value.id, { login: editingUser.value.login, password: formData.value.password })
      showToast(`User "${editingUser.value.login}" updated`, 'success')
    } else {
      await createUser({ login: formData.value.login, password: formData.value.password })
      showToast(`User "${formData.value.login}" created`, 'success')
    }
    await loadUsers()
    closeModal()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to save user'
    showToast(msg, 'error')
    console.error(e)
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(user: ApiUser) {
  if (!confirm(`Delete user "${user.login}"?`)) return
  try {
    await deleteUser(user.id)
    showToast(`User "${user.login}" deleted`, 'success')
    await loadUsers()
  } catch (e) {
    showToast('Failed to delete user', 'error')
    console.error(e)
  }
}

function formatLogin(login: string): string {
  return transliterate(login)
}

function getInitials(login: string): string {
  return login.split('.')[0]?.toUpperCase().slice(0, 2) || login.slice(0, 2).toUpperCase()
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
</script>

<template>
  <div class="users-page">
    <SidebarMenu :current-route="route.path" />

    <main class="users-content">
      <div class="users-header">
        <div class="header-left">
          <h1>Users</h1>
          <p class="subtitle">Manage system users</p>
        </div>
        <button v-if="hasPermission('users.create')" class="add-btn" @click="openAddModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add User
        </button>
      </div>

      <div v-if="error" class="error-banner">{{ error }}</div>

      <div v-if="isLoading" class="loading">Loading users...</div>

      <div class="users-cards-block">
        <div class="search-row">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Поиск по логину, домену или роли..."
          />
        </div>

        <div class="users-cards">
          <div v-for="user in filteredUsers" :key="user.id" class="user-card">
            <div class="user-card-header">
              <div class="user-avatar-large">{{ getInitials(user.login) }}</div>
              <div class="user-card-name">
                <h3>{{ user.login }}</h3>
              </div>
            </div>

            <div class="user-card-meta">
              <div><span>Domain:</span> <span class="val">{{ user.domain }}</span></div>
              <div><span>Created:</span> <span class="val">{{ new Date(user.created_at).toLocaleDateString() }}</span></div>
              <div>
                <span>Roles:</span>
                <span class="val">{{ user.roles.length ? user.roles.join(', ') : '—' }}</span>
              </div>
              <div>
                <span>Permissions:</span>
                <span class="val">{{ user.direct_permissions.length ? user.direct_permissions.join(', ') : '—' }}</span>
              </div>
            </div>

            <div class="card-actions">
              <button
                v-if="hasPermission('users.update')"
                class="action-btn edit-btn"
                @click="openEditModal(user)"
              >
                Edit
              </button>
              <button
                v-if="hasPermission('users.delete')"
                class="action-btn delete-btn"
                @click="handleDelete(user)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredUsers.length === 0 && !isLoading" class="no-results">
          Ничего не найдено по запросу «{{ searchQuery }}»
        </div>
      </div>
    </main>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingUser ? 'Edit User' : 'Add User' }}</h2>
            <button class="close-btn" @click="closeModal">&times;</button>
          </div>

          <form class="modal-form" @submit.prevent="handleSubmit">
            <div class="form-group">
              <label>Login</label>
              <input
                v-model="formData.login"
                type="text"
                :class="{ error: formErrors.login }"
                :readonly="!!editingUser"
                placeholder="ivan.ivanov"
                @input="onLoginInput"
              />
              <span v-if="formErrors.login" class="field-error">{{ formErrors.login }}</span>
            </div>

            <div class="form-group">
              <label>{{ editingUser ? 'New Password' : 'Password' }}</label>
              <input
                v-model="formData.password"
                type="password"
                :class="{ error: formErrors.password }"
                placeholder="password"
              />
              <span v-if="formErrors.password" class="field-error">{{ formErrors.password }}</span>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="closeModal">Cancel</button>
              <button type="submit" class="btn-submit" :disabled="isSubmitting">
                {{ isSubmitting ? 'Saving...' : editingUser ? 'Save' : 'Create' }}
              </button>
            </div>
          </form>
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
  max-width: 500px;
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

.form-group input[readonly] {
  background: #f0f0f0;
  color: #666;
  cursor: not-allowed;
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