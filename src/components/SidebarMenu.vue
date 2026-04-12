<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentUser, logout } from '../services/authService'
import { getNavigation } from '../services/navigationService'
import type { NavItem } from '../types/api'
import type { UserAuth } from '../types/api'

const props = defineProps<{
  currentRoute?: string
}>()

const emit = defineEmits<{
  navigate: [route: string]
}>()

const router = useRouter()
const user = getCurrentUser()

const isExpanded = ref(false)
const navItems = ref<NavItem[]>([])
const isLoading = ref(false)

onMounted(async () => {
  await loadNavigation()
})

async function loadNavigation() {
  isLoading.value = true
  try {
    navItems.value = await getNavigation()
  } catch (error) {
    console.error('Failed to load navigation:', error)
    navItems.value = []
  } finally {
    isLoading.value = false
  }
}

function handleNavigate(route: string) {
  emit('navigate', route)
  router.push(route)
}

function handleLogout() {
  logout()
  router.push('/')
}

function toggleMenu() {
  isExpanded.value = !isExpanded.value
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<template>
  <aside class="sidebar" :class="{ expanded: isExpanded }">
    <div class="sidebar-header">
      <div class="user-avatar">
        <template v-if="user?.avatarUrl">
          <img :src="user.avatarUrl" :alt="user.name" />
        </template>
        <template v-else>
          <span class="avatar-initials">{{ getInitials(user?.name || 'U') }}</span>
        </template>
      </div>
      <div v-if="isExpanded" class="user-info">
        <span class="user-name">{{ user?.name }}</span>
        <span class="user-role">{{ user?.role }}</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div v-if="isLoading" class="nav-loading">
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <template v-else>
        <button
          v-for="item in navItems"
          :key="item.id"
          class="nav-item"
          :class="[{ active: props.currentRoute === item.link }, isExpanded ? 'nav-item-full': 'nav-item-collapsed']"
          @click="handleNavigate(item.link)"
        >
          <div class="nav-icon">
            <img :src="item.iconUrl" :alt="item.name" />
          </div>
          <span v-if="isExpanded" class="nav-label">{{ item.name }}</span>
        </button>
      </template>
    </nav>

    <div class="sidebar-footer">
      <button class="toggle-btn" @click="toggleMenu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="isExpanded ? '11 17 6 12 11 7' : '13 7 18 12 13 17'" />
          <polyline :points="isExpanded ? '18 17 13 12 18 7' : '6 7 11 12 6 17'" />
        </svg>
        <span v-if="isExpanded">{{ isExpanded ? 'Collapse' : 'Expand' }}</span>
      </button>

      <button class="logout-btn" @click="handleLogout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        <span v-if="isExpanded">Logout</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 70px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  z-index: 1000;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

.sidebar.expanded {
  width: 250px;
}

.sidebar-header {
  padding: 1.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: left;
  gap: 1rem;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.user-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
}

.user-name {
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
}

.nav-loading {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.loading-dots {
  display: flex;
  gap: 0.5rem;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: calc(100% - 1.5rem);
  margin: 0.25rem 0.75rem;
  padding: 0.875rem;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-item-collapsed {
  justify-content: center;
}

.nav-item-full {
  justify-content: left;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%);
  color: white;
}

.nav-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: brightness(0) invert(1);
}

.nav-label {
  font-size: 0.95rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  padding: 1rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toggle-btn,
.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: calc(100% - 1.5rem);
  margin: 0 0.75rem;
  padding: 0.875rem;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover,
.logout-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.logout-btn:hover {
  background: rgba(220, 53, 69, 0.2);
  color: #ff6b6b;
}

.toggle-btn svg,
.logout-btn svg {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-btn span,
.logout-btn span {
  font-size: 0.95rem;
  font-weight: 500;
  white-space: nowrap;
}

/* Scrollbar styling */
.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
