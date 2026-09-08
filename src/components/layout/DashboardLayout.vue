<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const initials = computed(() => {
  const name = auth.user?.name ?? ''
  return name
    .split(' ')
    .map((part: string) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-babyblue-50">
    <header class="sticky top-0 z-10 border-b border-babyblue-100 bg-white/80 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <RouterLink :to="{ name: 'organizations' }" class="flex items-center gap-2">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-babyblue-500 text-sm font-bold text-white shadow-sm"
          >
            OP
          </span>
          <span class="text-lg font-semibold text-slate-900">OpenPool</span>
        </RouterLink>
        <nav class="hidden items-center gap-1 sm:flex">
          <RouterLink
            :to="{ name: 'organizations' }"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-babyblue-100 hover:text-babyblue-700"
            active-class="bg-babyblue-100 text-babyblue-700"
          >
            Organizations
          </RouterLink>
          <RouterLink
            :to="{ name: 'personal-invoices' }"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-babyblue-100 hover:text-babyblue-700"
            active-class="bg-babyblue-100 text-babyblue-700"
          >
            Invoices
          </RouterLink>
          <RouterLink
            :to="{ name: 'settings' }"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-babyblue-100 hover:text-babyblue-700"
            active-class="bg-babyblue-100 text-babyblue-700"
          >
            Settings
          </RouterLink>
        </nav>
        <div class="flex items-center gap-3 text-sm text-slate-600">
          <div v-if="auth.user" class="flex items-center gap-2">
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full bg-babyblue-100 text-xs font-semibold text-babyblue-700"
            >
              {{ initials }}
            </span>
            <span class="hidden sm:inline">{{ auth.user.name }}</span>
          </div>
          <button
            type="button"
            class="rounded-lg border border-babyblue-200 px-3 py-1.5 font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
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
