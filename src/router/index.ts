import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated, isTokenExpired, clearSession } from '../services/authService'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/branches',
    name: 'Branches',
    component: () => import('../views/BranchesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/management',
    name: 'Management',
    component: () => import('../views/ManagementView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('../views/UsersView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  // Истёк срок жизни токена (JWT exp) — сбрасываем сессию сразу, без ожидания API
  const tokenExpired = isTokenExpired()
  if (tokenExpired) {
    clearSession()
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !isAuthenticated()) {
    next(tokenExpired ? { path: '/', query: { session_expired: '1' } } : '/')
  } else if (to.name === 'Login' && isAuthenticated()) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
