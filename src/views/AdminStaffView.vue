<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import * as platformAdminApi from '@/api/platformAdmin'
import { extractErrorMessage } from '@/api/client'
import { formatDate } from '@/lib/format'
import type { PlatformStaffMember } from '@/types/api'

const staff = ref<PlatformStaffMember[]>([])
const loading = ref(true)
const loadError = ref('')

const inviteEmail = ref('')
const inviteError = ref('')
const inviteSuccess = ref('')
const inviting = ref(false)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    staff.value = await platformAdminApi.listStaff()
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function handleInvite() {
  inviteError.value = ''
  inviteSuccess.value = ''
  inviting.value = true
  try {
    await platformAdminApi.inviteStaff(inviteEmail.value)
    inviteSuccess.value = `Invitation sent to ${inviteEmail.value}, or access granted immediately if they already have an account.`
    inviteEmail.value = ''
    await load()
  } catch (err) {
    inviteError.value = extractErrorMessage(err)
  } finally {
    inviting.value = false
  }
}

async function handleRevoke(userId: string) {
  if (!confirm('Remove platform access for this person?')) return
  try {
    await platformAdminApi.revokeStaff(userId)
    await load()
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  }
}

const inputClass =
  'w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none'
const primaryButtonClass =
  'rounded-lg bg-babyblue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <AdminLayout>
    <h1 class="mb-6 text-2xl font-semibold text-slate-900">Staff</h1>

    <form
      class="mb-6 flex flex-wrap items-end gap-2 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
      @submit.prevent="handleInvite"
    >
      <div class="min-w-64 flex-1">
        <label class="mb-1 block text-xs font-medium text-slate-700">Invite by email</label>
        <input v-model="inviteEmail" type="email" required :class="inputClass" />
      </div>
      <button type="submit" :disabled="inviting" :class="primaryButtonClass">
        {{ inviting ? 'Inviting…' : 'Invite' }}
      </button>
      <p v-if="inviteError" class="w-full text-sm text-red-600">{{ inviteError }}</p>
      <p v-if="inviteSuccess" class="w-full text-sm text-green-700">{{ inviteSuccess }}</p>
    </form>

    <div v-if="loading" class="text-sm text-slate-500">Loading…</div>
    <div v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>
    <div
      v-else-if="staff.length === 0"
      class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
    >
      No staff members yet.
    </div>
    <ul v-else class="space-y-2">
      <li
        v-for="member in staff"
        :key="member.id"
        class="flex items-center justify-between rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
      >
        <div>
          <p class="font-medium text-slate-900">{{ member.name }}</p>
          <p class="text-xs text-slate-500">
            {{ member.email }} · {{ member.platformRole }} · since {{ formatDate(member.createdAt) }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          @click="handleRevoke(member.id)"
        >
          Revoke
        </button>
      </li>
    </ul>
  </AdminLayout>
</template>
