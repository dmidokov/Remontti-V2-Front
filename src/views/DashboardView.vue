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
  loadTranslations('dashboard')
})
</script>

<template>
  <div class="dashboard-page">
    <SidebarMenu :current-route="route.path" />

    <main class="dashboard-content">
      <div class="welcome-card">
        <h1><T k="dashboard.welcome" /></h1>
        <p><T k="dashboard.welcome_text" /></p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <h3><T k="dashboard.projects" /></h3>
            <span class="stat-value">12</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <h3><T k="dashboard.team_members" /></h3>
            <span class="stat-value">8</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <h3><T k="dashboard.completed" /></h3>
            <span class="stat-value">24</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <h3><T k="dashboard.in_progress" /></h3>
            <span class="stat-value">5</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  width: 100vw;
  background: #f8f9fa;
  padding-left: 70px;
}

.dashboard-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.welcome-card {
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.welcome-card h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 0.75rem 0;
}

.welcome-card p {
  font-size: 1.125rem;
  color: #666;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 1.75rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  font-size: 3rem;
}

.stat-info h3 {
  font-size: 0.9rem;
  font-weight: 500;
  color: #666;
  margin: 0 0 0.5rem 0;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #667eea;
}
</style>
