<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import * as authApi from '@/api/auth'
import { extractErrorMessage } from '@/api/client'

const route = useRoute()
const router = useRouter()

const token = (route.query.token as string) ?? ''
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref(false)
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  loading.value = true
  try {
    await authApi.resetPassword({ token, newPassword: newPassword.value })
    success.value = true
    setTimeout(() => router.push({ name: 'login' }), 2000)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-babyblue-50 via-white to-babyblue-100 px-4"
  >
    <div class="w-full max-w-sm rounded-2xl border border-babyblue-100 bg-white p-8 shadow-lg shadow-babyblue-100">
      <div class="mb-6 flex flex-col items-center text-center">
        <span
          class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-babyblue-500 text-lg font-bold text-white shadow-sm"
        >
          OP
        </span>
        <h1 class="text-xl font-semibold text-slate-900">Choose a new password</h1>
      </div>

      <div v-if="!token" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
        This reset link is missing its token.
        <RouterLink :to="{ name: 'forgot-password' }" class="font-medium underline"
          >Request a new one</RouterLink
        >
      </div>
      <p v-else-if="success" class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        Password reset successfully. Redirecting to log in…
      </p>
      <form v-else class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">New password</label>
          <input
            v-model="newPassword"
            type="password"
            required
            minlength="8"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm text-slate-900 transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Confirm new password</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            minlength="8"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm text-slate-900 transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          />
        </div>
        <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-babyblue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading ? 'Resetting…' : 'Reset password' }}
        </button>
      </form>
    </div>
  </div>
</template>
