<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { useOrganizationsStore } from '@/stores/organizations'
import { extractErrorMessage } from '@/api/client'
import type { OrganizationType } from '@/types/api'

const store = useOrganizationsStore()

const showForm = ref(false)
const name = ref('')
const type = ref<OrganizationType>('OTHER')
const error = ref('')
const submitting = ref(false)

const orgTypes: OrganizationType[] = ['CHURCH', 'CHAMA', 'SACCO', 'COLLECTIVE', 'OTHER']

onMounted(() => store.fetchMine())

async function handleCreate() {
  error.value = ''
  submitting.value = true
  try {
    await store.createOrganization({ name: name.value, type: type.value })
    name.value = ''
    showForm.value = false
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <DashboardLayout>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-slate-900">Your organizations</h1>
      <button
        type="button"
        class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        @click="showForm = !showForm"
      >
        {{ showForm ? 'Cancel' : 'New organization' }}
      </button>
    </div>

    <form
      v-if="showForm"
      class="mb-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
      @submit.prevent="handleCreate"
    >
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Name</label>
        <input
          v-model="name"
          type="text"
          required
          class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Type</label>
        <select
          v-model="type"
          class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option v-for="t in orgTypes" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button
        type="submit"
        :disabled="submitting"
        class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {{ submitting ? 'Creating…' : 'Create' }}
      </button>
    </form>

    <div v-if="store.loading" class="text-sm text-slate-500">Loading…</div>
    <div v-else-if="store.organizations.length === 0" class="text-sm text-slate-500">
      You're not part of any organization yet.
    </div>
    <ul v-else class="space-y-2">
      <li v-for="org in store.organizations" :key="org.id">
        <RouterLink
          :to="{ name: 'organization-detail', params: { organizationId: org.id } }"
          class="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
        >
          <div>
            <p class="font-medium text-slate-900">{{ org.name }}</p>
            <p class="text-xs text-slate-500">{{ org.type }}</p>
          </div>
          <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            {{ org.role }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </DashboardLayout>
</template>
