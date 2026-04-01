import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '../services/authService'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
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
