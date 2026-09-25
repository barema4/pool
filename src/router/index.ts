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
      path: '/app/events/:eventId/deposit',
      name: 'event-deposit',
      component: () => import('@/views/DepositView.vue'),
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

    // Platform-admin dashboard — gated by platformRole, not org membership.
    {
      path: '/admin/reconciliation',
      name: 'admin-reconciliation',
      component: () => import('@/views/AdminReconciliationView.vue'),
      meta: { requiresAuth: true, requiresPlatformRole: ['OWNER', 'STAFF'] },
    },
    {
      path: '/admin/staff',
      name: 'admin-staff',
      component: () => import('@/views/AdminStaffView.vue'),
      meta: { requiresAuth: true, requiresPlatformRole: ['OWNER'] },
    },
    {
      path: '/admin/platform-payouts',
      name: 'admin-platform-payouts',
      component: () => import('@/views/AdminPlatformPayoutsView.vue'),
      meta: { requiresAuth: true, requiresPlatformRole: ['OWNER'] },
    },
    {
      path: '/admin/organizations',
      name: 'admin-organizations',
      component: () => import('@/views/AdminOrganizationsView.vue'),
      meta: { requiresAuth: true, requiresPlatformRole: ['OWNER', 'STAFF'] },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/views/AdminUsersView.vue'),
      meta: { requiresAuth: true, requiresPlatformRole: ['OWNER', 'STAFF'] },
    },
    {
      path: '/admin/transactions',
      name: 'admin-transactions',
      component: () => import('@/views/AdminTransactionsView.vue'),
      meta: { requiresAuth: true, requiresPlatformRole: ['OWNER', 'STAFF'] },
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
  const requiredPlatformRoles = to.meta.requiresPlatformRole as string[] | undefined
  if (requiredPlatformRoles) {
    const role = auth.user?.platformRole
    if (!role || !requiredPlatformRoles.includes(role)) {
      return { name: 'organizations' }
    }
  }
  return true
})

export default router
