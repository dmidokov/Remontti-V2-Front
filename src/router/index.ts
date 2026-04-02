import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '../services/authService'
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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  if (requiresAuth && !isAuthenticated()) {
    next('/')
  } else if (to.name === 'Login' && isAuthenticated()) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
