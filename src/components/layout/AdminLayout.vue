<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-babyblue-50">
    <header class="sticky top-0 z-10 border-b border-babyblue-100 bg-white/80 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <RouterLink :to="{ name: 'admin-reconciliation' }" class="flex items-center gap-2">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-white shadow-sm"
          >
            OP
          </span>
          <span class="text-lg font-semibold text-slate-900">OpenPool Admin</span>
        </RouterLink>
        <nav class="hidden items-center gap-1 sm:flex">
          <RouterLink
            :to="{ name: 'admin-reconciliation' }"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-babyblue-100 hover:text-babyblue-700"
            active-class="bg-babyblue-100 text-babyblue-700"
          >
            Reconciliation
          </RouterLink>
          <RouterLink
            v-if="auth.user?.platformRole === 'OWNER'"
            :to="{ name: 'admin-staff' }"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-babyblue-100 hover:text-babyblue-700"
            active-class="bg-babyblue-100 text-babyblue-700"
          >
            Staff
          </RouterLink>
          <RouterLink
            :to="{ name: 'organizations' }"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-babyblue-100 hover:text-babyblue-700"
          >
            ← Back to app
          </RouterLink>
        </nav>
        <button
          type="button"
          class="rounded-lg border border-babyblue-200 px-3 py-1.5 text-sm font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
          @click="handleLogout"
        >
          Log out
        </button>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-8">
      <slot />
    </main>
  </div>
</template>
