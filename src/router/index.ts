import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated, ensureSession } from '../services/authService'
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
  {
    path: '/roles',
    name: 'Roles',
    component: () => import('../views/RolesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/PersonalCabinetView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth) {
    // После F5 access в памяти вкладки исчезает — ensureSession восстановит его по refresh
    // или подтвердит, что сессии больше нет.
    if (!isAuthenticated() || !(await ensureSession())) {
      return { path: '/', query: { session_expired: '1' } }
    }
  } else if (to.name === 'Login' && isAuthenticated()) {
    return '/dashboard'
  }

  return true
})

export default router
