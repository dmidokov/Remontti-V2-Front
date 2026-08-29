<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SidebarMenu from '../components/SidebarMenu.vue'
import { getCurrentUser } from '../services/authService'
import { getManagementCards } from '../services/managementCardService'
import type { ManagementCard, UserAuth } from '../types/api'

const route = useRoute()
const router = useRouter()
const user: UserAuth | null = getCurrentUser()

const cards = ref<ManagementCard[]>([])
const isLoading = ref(false)

onMounted(() => {
  loadCards()
})

async function loadCards() {
  isLoading.value = true
  try {
    console.log("Try to load user rights", user?.settings_right)
    cards.value = await getManagementCards(user?.settings_right ?? 0)
  } catch (e) {
    console.error('Failed to load management cards:', e)
    cards.value = []
  } finally {
    isLoading.value = false
  }
}

function handleNavigate(link: string) {
  router.push(link)
}
</script>

<template>
  <div class="management-page">
    <SidebarMenu :current-route="route.path" />

    <main class="management-content">
      <div class="page-header">
        <h1>Управление</h1>
        <p>Доступные разделы управления системой</p>
      </div>

      <div v-if="isLoading" class="loading">Загрузка...</div>

      <div v-else-if="cards.length === 0" class="empty-state">
        <p>У вас нет доступных разделов управления</p>
      </div>

      <div v-else class="cards-grid">
        <div
          v-for="card in cards"
          :key="card.id"
          class="management-card"
          @click="handleNavigate(card.link)"
        >
          <div class="card-icon">
            <img :src="card.iconUrl" :alt="card.title" />
          </div>
          <div class="card-body">
            <h3>{{ card.title }}</h3>
            <p>{{ card.description }}</p>
          </div>
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
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 0.25rem 0;
}

.page-header p {
  font-size: 1.125rem;
  color: #666;
  margin: 0;
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

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

.management-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.25rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.management-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.card-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.card-body h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 0.5rem 0;
}

.card-body p {
  font-size: 0.95rem;
  color: #666;
  margin: 0;
  line-height: 1.5;
}
</style>
