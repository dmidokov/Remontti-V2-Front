<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTranslation } from '../composables/useTranslation'
import { getBranches, selectBranch } from '../services/branchService'
import type { Branch } from '../types/api'

const { loadTranslations, t, isLoading, isLoaded } = useTranslation()
const router = useRouter()

const branches = ref<Branch[]>([])
const selectedBranch = ref<Branch | null>(null)
const isSubmitting = ref(false)
const error = ref('')

onMounted(() => {
  loadTranslations('branches')
  loadBranches()
})

async function loadBranches() {
  try {
    branches.value = await getBranches()
  } catch (err) {
    error.value = t('branches.error.load_failed', 'Failed to load branches')
  }
}

function handleSelectBranch(branch: Branch) {
  selectedBranch.value = branch
}

async function handleSubmit() {
  if (!selectedBranch.value) {
    error.value = t('branches.error.select_branch', 'Please select a branch')
    return
  }

  isSubmitting.value = true
  selectBranch(selectedBranch.value)

  // Redirect to dashboard after selecting branch
  router.push('/dashboard')

  isSubmitting.value = false
}
</script>

<template>
  <div class="branches-page">
    <div v-if="!isLoaded || isLoading" class="loading-container">
      <div class="loading-spinner"></div>
    </div>

    <div v-else class="branches-content">
      <div class="branches-header">
        <h1><T k="branches.title" /></h1>
        <p><T k="branches.subtitle" /></p>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>

      <div class="branches-grid">
        <div
          v-for="branch in branches"
          :key="branch.id"
          class="branch-card"
          :class="{ selected: selectedBranch?.id === branch.id }"
          @click="handleSelectBranch(branch)"
        >
          <div class="branch-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-9a2 2 0 012-2v0a2 2 0 012 2v9M13 10a2 2 0 012-2h0a2 2 0 012 2v9" />
            </svg>
          </div>
          <h3 class="branch-name">{{ branch.name }}</h3>
          <p class="branch-address">{{ branch.address }}</p>
          <div class="branch-status">
            <span class="status-dot" :class="{ active: branch.isActive }"></span>
            <span>{{ branch.isActive ? t('branches.status.active') : t('branches.status.inactive') }}</span>
          </div>
        </div>
      </div>

      <div class="branches-footer">
        <button
          class="submit-button"
          :disabled="!selectedBranch || isSubmitting"
          @click="handleSubmit"
        >
          <span v-if="isSubmitting" class="spinner"></span>
          <span v-if="isSubmitting"><T k="branches.submitting" /></span>
          <span v-else><T k="branches.continue" /></span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.branches-page {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  padding: 2rem;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.branches-content {
  width: 100%;
  max-width: 900px;
}

.branches-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.branches-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 0.75rem 0;
  letter-spacing: -0.5px;
}

.branches-header p {
  font-size: 1.125rem;
  color: #666;
  margin: 0;
}

.error-message {
  color: #dc3545;
  background-color: #f8d7da;
  padding: 1rem;
  border-radius: 10px;
  font-size: 1rem;
  text-align: center;
  margin-bottom: 1.5rem;
}

.branches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.branch-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.branch-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.15);
}

.branch-card.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.25);
}

.branch-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  color: #667eea;
}

.branch-icon svg {
  width: 100%;
  height: 100%;
}

.branch-name {
  font-size: 1.35rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 0.5rem 0;
}

.branch-address {
  font-size: 0.95rem;
  color: #666;
  margin: 0 0 1rem 0;
}

.branch-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #555;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
}

.status-dot.active {
  background: #28a745;
}

.branches-footer {
  display: flex;
  justify-content: center;
}

.submit-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1.25rem 3rem;
  border-radius: 10px;
  font-size: 1.15rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-width: 250px;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>
