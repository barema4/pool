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
  <div class="min-h-screen bg-slate-50">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <RouterLink :to="{ name: 'organizations' }" class="text-lg font-semibold text-slate-900">
          OpenPool
        </RouterLink>
        <div class="flex items-center gap-4 text-sm text-slate-600">
          <span v-if="auth.user">{{ auth.user.name }}</span>
          <button
            type="button"
            class="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
            @click="handleLogout"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-8">
      <slot />
    </main>
  </div>
</template>
