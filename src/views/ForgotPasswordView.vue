<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import * as authApi from '@/api/auth'
import { extractErrorMessage } from '@/api/client'

const email = ref('')
const error = ref('')
const message = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const result = await authApi.forgotPassword({ email: email.value })
    message.value = result.message
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
        <h1 class="text-xl font-semibold text-slate-900">Forgot your password?</h1>
        <p class="mt-1 text-sm text-slate-500">We'll email you a link to reset it</p>
      </div>

      <p v-if="message" class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        {{ message }}
      </p>
      <form v-else class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm text-slate-900 transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          />
        </div>
        <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-babyblue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading ? 'Sending…' : 'Send reset link' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-500">
        <RouterLink :to="{ name: 'login' }" class="font-medium text-babyblue-600 hover:text-babyblue-700"
          >Back to log in</RouterLink
        >
      </p>
    </div>
  </div>
</template>
