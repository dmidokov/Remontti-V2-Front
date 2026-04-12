<script setup lang="ts">
import { onMounted } from 'vue'
import { useTranslation } from '../composables/useTranslation'
import SidebarMenu from '../components/SidebarMenu.vue'
import { getCurrentUser } from '../services/authService'
import { useRoute } from 'vue-router'
import type { UserAuth } from '../types/api'

const { loadTranslations, t } = useTranslation()
const route = useRoute()
const user: UserAuth | null = getCurrentUser()

onMounted(() => {
  loadTranslations('management')
})
</script>

<template>
  <div class="management-page">
    <SidebarMenu :current-route="route.path" />

    <main class="management-content">
      <div class="page-header">
        <h1><T k="management.welcome" /></h1>
        <p><T k="management.description" /></p>
      </div>

      <div class="management-grid">
        <div class="management-card">
          <div class="card-icon">👥</div>
          <h3><T k="management.users" /></h3>
          <p><T k="management.users_desc" /></p>
          <button class="card-button"><T k="management.manage" tag="span" /></button>
        </div>

        <div class="management-card">
          <div class="card-icon">⚙️</div>
          <h3><T k="management.settings" /></h3>
          <p><T k="management.settings_desc" /></p>
          <button class="card-button"><T k="management.manage" tag="span" /></button>
        </div>

        <div class="management-card">
          <div class="card-icon">📋</div>
          <h3><T k="management.roles" /></h3>
          <p><T k="management.roles_desc" /></p>
          <button class="card-button"><T k="management.manage" tag="span" /></button>
        </div>

        <div class="management-card">
          <div class="card-icon">🔐</div>
          <h3><T k="management.permissions" /></h3>
          <p><T k="management.permissions_desc" /></p>
          <button class="card-button"><T k="management.manage" tag="span" /></button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.management-page {
  min-height: 100vh;
  width: 100vw;
  background: #f8f9fa;
  padding-left: 70px;
}

.management-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 0.75rem 0;
}

.page-header p {
  font-size: 1.125rem;
  color: #666;
  margin: 0;
}

.management-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.management-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.management-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.card-icon {
  font-size: 3rem;
}

.management-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.management-card p {
  font-size: 1rem;
  color: #666;
  margin: 0;
  flex-grow: 1;
}

.card-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  align-self: flex-start;
}

.card-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}
</style>
