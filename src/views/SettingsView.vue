<script setup lang="ts">
import { ref } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import * as usersApi from '@/api/users'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage } from '@/api/client'

const auth = useAuthStore()

const name = ref(auth.user?.name ?? '')
const email = ref(auth.user?.email ?? '')
const profileError = ref('')
const profileSuccess = ref(false)
const savingProfile = ref(false)

async function handleSaveProfile() {
  profileError.value = ''
  profileSuccess.value = false
  savingProfile.value = true
  try {
    const updated = await usersApi.updateProfile({ name: name.value, email: email.value })
    auth.setSession(
      { id: updated.id, name: updated.name, email: updated.email },
      { accessToken: auth.accessToken!, refreshToken: auth.refreshToken! },
    )
    profileSuccess.value = true
  } catch (err) {
    profileError.value = extractErrorMessage(err)
  } finally {
    savingProfile.value = false
  }
}

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref(false)
const savingPassword = ref(false)

async function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = false
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'New passwords do not match'
    return
  }
  savingPassword.value = true
  try {
    await usersApi.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    passwordSuccess.value = true
  } catch (err) {
    passwordError.value = extractErrorMessage(err)
  } finally {
    savingPassword.value = false
  }
}

const inputClass =
  'w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none'
const primaryButtonClass =
  'rounded-lg bg-babyblue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <DashboardLayout>
    <h1 class="mb-6 text-2xl font-semibold text-slate-900">Settings</h1>

    <div class="max-w-lg space-y-8">
      <section class="rounded-2xl border border-babyblue-100 bg-white p-5 shadow-sm">
        <h2 class="mb-4 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Profile</h2>
        <form class="space-y-4" @submit.prevent="handleSaveProfile">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input v-model="name" required :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input v-model="email" type="email" required :class="inputClass" />
          </div>
          <p v-if="profileError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {{ profileError }}
          </p>
          <p v-if="profileSuccess" class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Profile updated.
          </p>
          <button type="submit" :disabled="savingProfile" :class="primaryButtonClass">
            {{ savingProfile ? 'Saving…' : 'Save profile' }}
          </button>
        </form>
      </section>

      <section class="rounded-2xl border border-babyblue-100 bg-white p-5 shadow-sm">
        <h2 class="mb-4 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Change password</h2>
        <form class="space-y-4" @submit.prevent="handleChangePassword">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Current password</label>
            <input v-model="currentPassword" type="password" required :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">New password</label>
            <input v-model="newPassword" type="password" required minlength="8" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Confirm new password</label>
            <input v-model="confirmPassword" type="password" required minlength="8" :class="inputClass" />
          </div>
          <p v-if="passwordError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {{ passwordError }}
          </p>
          <p v-if="passwordSuccess" class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Password changed.
          </p>
          <button type="submit" :disabled="savingPassword" :class="primaryButtonClass">
            {{ savingPassword ? 'Saving…' : 'Change password' }}
          </button>
        </form>
      </section>
    </div>
  </DashboardLayout>
</template>
