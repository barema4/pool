import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/app/organizations' },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue') },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
    },

    // Public, payer-facing — no auth required.
    { path: '/pay/:token', name: 'pay', component: () => import('@/views/PayView.vue') },
    { path: '/receipt', name: 'receipt', component: () => import('@/views/ReceiptView.vue') },
    {
      path: '/events/:eventId/pledge',
      name: 'pledge',
      component: () => import('@/views/PledgeView.vue'),
    },
    {
      path: '/events/:eventId/contributors',
      name: 'public-contributors',
      component: () => import('@/views/ContributorsView.vue'),
    },
    {
      path: '/i/:token',
      name: 'personal-invoice-pay',
      component: () => import('@/views/PersonalInvoicePayView.vue'),
    },

    // Authenticated dashboard.
    {
      path: '/app/organizations',
      name: 'organizations',
      component: () => import('@/views/OrganizationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/app/organizations/:organizationId',
      name: 'organization-detail',
      component: () => import('@/views/OrganizationDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/app/events/:eventId',
      name: 'event-detail',
      component: () => import('@/views/EventDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/app/personal-invoices',
      name: 'personal-invoices',
      component: () => import('@/views/PersonalInvoicesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/app/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },

    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    return { name: 'organizations' }
  }
  return true
})

export default router
