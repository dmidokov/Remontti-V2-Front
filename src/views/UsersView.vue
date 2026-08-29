<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SidebarMenu from '../components/SidebarMenu.vue'
import { getUsers, createUser, updateUser, deleteUser } from '../services/userService'
import type { User } from '../types/api'

const route = useRoute()

const users = ref<User[]>([])
const isLoading = ref(false)
const error = ref('')
const showModal = ref(false)
const editingUser = ref<User | null>(null)
const isSubmitting = ref(false)

const formData = ref({
  login: '',
  email: '',
  name: '',
  role: 'user' as User['role'],
  startPage: '/dashboard',
  avatarUrl: '',
  host: 'work',
  settings_right: 0,
})

const formErrors = ref<Record<string, string>>({})

onMounted(() => {
  loadUsers()
})

async function loadUsers() {
  isLoading.value = true
  error.value = ''
  try {
    users.value = await getUsers()
  } catch (e) {
    error.value = 'Failed to load users'
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

function openAddModal() {
  editingUser.value = null
  formData.value = {
    login: '',
    email: '',
    name: '',
    role: 'user',
    startPage: '/dashboard',
    avatarUrl: '',
    host: 'work',
    settings_right: 0,
  }
  formErrors.value = {}
  showModal.value = true
}

function openEditModal(user: User) {
  editingUser.value = user
  formData.value = {
    login: user.login,
    email: user.email,
    name: user.name,
    role: user.role,
    startPage: user.startPage || '/dashboard',
    avatarUrl: user.avatarUrl || '',
    host: user.host || 'work',
    settings_right: user.settings_right ?? 0,
  }
  formErrors.value = {}
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingUser.value = null
}

const bitOptions = [
  { value: 0b00001, label: 'Пользователи' },
  { value: 0b00010, label: 'Настройки' },
  { value: 0b00100, label: 'Роли' },
  { value: 0b01000, label: 'Безопасность' },
  { value: 0b10000, label: 'Бэкапы' },
]

function toggleBit(bit: number) {
  formData.value.settings_right ^= bit
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

function getMainDomain(): string {
  return window.location.hostname.split('.').slice(-2).join('.')
}

function onNameInput() {
  if (editingUser.value) return
  formData.value.login = transliterate(formData.value.name)
  formData.value.email = formData.value.login
    ? `${formData.value.login}@${getMainDomain()}`
    : ''
}

function validateForm(): boolean {
  formErrors.value = {}
  if (!formData.value.login.trim()) formErrors.value.login = 'Login is required'
  if (!formData.value.email.trim()) formErrors.value.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) formErrors.value.email = 'Invalid email format'
  if (!formData.value.name.trim()) formErrors.value.name = 'Name is required'
  return Object.keys(formErrors.value).length === 0
}

async function handleSubmit() {
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    if (editingUser.value) {
      await updateUser({
        id: editingUser.value.id!,
        login: formData.value.login,
        email: formData.value.email,
        name: formData.value.name,
        role: formData.value.role,
        startPage: formData.value.startPage,
        avatarUrl: formData.value.avatarUrl || undefined,
        host: formData.value.host,
        settings_right: formData.value.settings_right,
      })
    } else {
      await createUser({
        login: formData.value.login,
        email: formData.value.email,
        name: formData.value.name,
        role: formData.value.role,
        startPage: formData.value.startPage,
        avatarUrl: formData.value.avatarUrl || undefined,
        host: formData.value.host,
        settings_right: formData.value.settings_right,
      })
    }
    await loadUsers()
    closeModal()
  } catch (e) {
    const err = e as Error
    if (err.message?.includes('UNIQUE') || err.message?.includes('constraint')) {
      formErrors.value.login = 'Login already exists'
    } else {
      error.value = 'Failed to save user'
      console.error(e)
    }
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(user: User) {
  if (!confirm(`Delete user "${user.name}"?`)) return
  try {
    await deleteUser(user.id!)
    await loadUsers()
  } catch (e) {
    error.value = 'Failed to delete user'
    console.error(e)
  }
}

const ROLE_LABELS: Record<User['role'], string> = {
  admin: 'Admin',
  user: 'User',
  manager: 'Manager',
  employee: 'Employee',
}

const ROLE_COLORS: Record<User['role'], string> = {
  admin: '#dc3545',
  user: '#667eea',
  manager: '#28a745',
  employee: '#ffc107',
}
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
        <button class="add-btn" @click="openAddModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add User
        </button>
      </div>

      <div v-if="error" class="error-banner">{{ error }}</div>

      <div v-if="isLoading" class="loading">Loading users...</div>

      <div v-else class="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Login</th>
              <th>Email</th>
              <th>Role</th>
              <th>Host</th>
              <th>Rights</th>
              <th>Start Page</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td class="name-cell">
                <div class="user-avatar-small">
                  {{ user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }}
                </div>
                {{ user.name }}
              </td>
              <td><code>{{ user.login }}</code></td>
              <td>{{ user.email }}</td>
              <td>
                <span class="role-badge" :style="{ background: ROLE_COLORS[user.role] + '22', color: ROLE_COLORS[user.role] }">
                  {{ ROLE_LABELS[user.role] }}
                </span>
              </td>
              <td><code>{{ user.host || '—' }}</code></td>
              <td><code>{{ user.settings_right?.toString(2).padStart(5, '0') || '00000' }}</code></td>
              <td><code>{{ user.startPage || '/dashboard' }}</code></td>
              <td class="actions-cell">
                <button class="action-btn edit-btn" @click="openEditModal(user)">Edit</button>
                <button class="action-btn delete-btn" @click="handleDelete(user)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
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
              <label>Name</label>
              <input v-model="formData.name" @input="onNameInput" type="text" :class="{ error: formErrors.name }" placeholder="Иван Иванов" />
              <span v-if="formErrors.name" class="field-error">{{ formErrors.name }}</span>
            </div>

            <div class="form-group">
              <label>Login</label>
              <input v-model="formData.login" type="text" :class="{ error: formErrors.login }" placeholder="ivan.ivanov" />
              <span v-if="formErrors.login" class="field-error">{{ formErrors.login }}</span>
            </div>

            <div class="form-group">
              <label>Email</label>
              <input v-model="formData.email" type="email" :class="{ error: formErrors.email }" placeholder="john@company.com" />
              <span v-if="formErrors.email" class="field-error">{{ formErrors.email }}</span>
            </div>

            <div class="form-group">
              <label>Role</label>
              <select v-model="formData.role">
                <option v-for="role in ['admin', 'user', 'manager', 'employee']" :key="role" :value="role">
                  {{ ROLE_LABELS[role as User['role']] }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Start Page</label>
              <select v-model="formData.startPage">
                <option value="/dashboard">Dashboard</option>
                <option value="/branches">Branches</option>
                <option value="/management">Management</option>
                <option value="/users">Users</option>
              </select>
            </div>

            <div class="form-group">
              <label>Host (поддомен)</label>
              <select v-model="formData.host">
                <option value="work">work</option>
                <option value="control">control</option>
              </select>
            </div>

            <div class="form-group">
              <label>Права (битовая маска)</label>
              <div class="bits-row">
                <label v-for="bit in bitOptions" :key="bit.value" class="bit-check">
                  <input type="checkbox" :checked="!!(formData.settings_right & bit.value)" @change="toggleBit(bit.value)" />
                  <span>{{ bit.label }}</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>Avatar URL (optional)</label>
              <input v-model="formData.avatarUrl" type="text" placeholder="/avatars/user.png" />
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="closeModal">Cancel</button>
              <button type="submit" class="btn-submit" :disabled="isSubmitting">
                {{ isSubmitting ? 'Saving...' : (editingUser ? 'Save' : 'Create') }}
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

.users-table {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 1rem 1.25rem;
  background: #f8f9fa;
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e0e0e0;
}

td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.95rem;
  color: #333;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover td {
  background: #f8f9fa;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  flex-shrink: 0;
}

code {
  background: #f0f0f0;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
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
  background: #5a6fd6;
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

.form-group input,
.form-group select {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
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

.bits-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.bit-check {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  cursor: pointer;
  user-select: none;
}

.bit-check input[type="checkbox"] {
  accent-color: #667eea;
  width: 16px;
  height: 16px;
  cursor: pointer;
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
