<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import * as authApi from '@/api/auth'
import * as publicApi from '@/api/public'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage } from '@/api/client'

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const inviteToken = (route.query.invite as string) || undefined
const inviteBanner = ref<{ organizationName: string; role: string } | null>(null)

onMounted(async () => {
  if (!inviteToken) return
  try {
    const invitation = await publicApi.getOrganizationInvitation(inviteToken)
    inviteBanner.value = { organizationName: invitation.organizationName, role: invitation.role }
    email.value = invitation.email
  } catch {
    // Bad/expired/consumed invite token — fall back to a normal, unprefilled
    // registration; never block signup over a stale invite link.
  }
})

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const { user, accessToken, refreshToken } = await authApi.register({
      name: name.value,
      email: email.value,
      password: password.value,
      inviteToken,
    })
    auth.setSession(user, { accessToken, refreshToken })
    router.push({ name: 'organizations' })
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
        <h1 class="text-xl font-semibold text-slate-900">Create your account</h1>
        <p class="mt-1 text-sm text-slate-500">Start pooling contributions in minutes</p>
      </div>

      <p
        v-if="inviteBanner"
        class="mb-4 rounded-lg bg-babyblue-50 px-3 py-2 text-sm text-babyblue-700"
      >
        You're invited to join <strong>{{ inviteBanner.organizationName }}</strong> as
        {{ inviteBanner.role }}.
      </p>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input
            v-model="name"
            type="text"
            required
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm text-slate-900 transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            v-model="email"
            type="email"
            required
            :readonly="!!inviteBanner"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm text-slate-900 transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none disabled:bg-babyblue-50"
            :class="{ 'bg-babyblue-50 text-slate-500': inviteBanner }"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            v-model="password"
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
          {{ loading ? 'Creating account…' : 'Register' }}
        </button>
      </form>
      <p class="mt-6 text-center text-sm text-slate-500">
        Already have an account?
        <RouterLink :to="{ name: 'login' }" class="font-medium text-babyblue-600 hover:text-babyblue-700"
          >Log in</RouterLink
        >
      </p>
    </div>
  </div>
</template>
