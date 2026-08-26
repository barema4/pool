<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import * as authApi from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage } from '@/api/client'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const { user, accessToken, refreshToken } = await authApi.login({
      email: email.value,
      password: password.value,
    })
    auth.setSession(user, { accessToken, refreshToken })
    const redirect = (route.query.redirect as string) || '/app/organizations'
    router.push(redirect)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <div class="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 class="mb-6 text-xl font-semibold text-slate-900">Log in to OpenPool</h1>
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {{ loading ? 'Logging in…' : 'Log in' }}
        </button>
      </form>
      <p class="mt-4 text-center text-sm text-slate-600">
        No account?
        <RouterLink :to="{ name: 'register' }" class="font-medium text-slate-900 underline"
          >Register</RouterLink
        >
      </p>
    </div>
  </div>
</template>
