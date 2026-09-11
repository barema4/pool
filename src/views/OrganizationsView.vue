<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import ShareLinkReady from '@/components/ShareLinkReady.vue'
import { useOrganizationsStore } from '@/stores/organizations'
import * as eventsApi from '@/api/events'
import { extractErrorMessage } from '@/api/client'
import type { OrganizationType, OrganizationCountry, EventRecord } from '@/types/api'

const store = useOrganizationsStore()

const showForm = ref(false)
const name = ref('')
const type = ref<OrganizationType>('OTHER')
const country = ref<OrganizationCountry>('KENYA')
const error = ref('')
const submitting = ref(false)

const countryOptions: { value: OrganizationCountry; label: string }[] = [
  { value: 'KENYA', label: '🇰🇪 Kenya — card & M-Pesa via Paystack' },
  { value: 'UGANDA', label: '🇺🇬 Uganda — MTN & Airtel Money via PawaPay' },
]

// Quick collection — skips organization setup entirely for a solo user.
// Still needs a country pick, since that determines the payment provider for
// the personal org it reuses/creates behind the scenes.
const showQuickForm = ref(false)
const quickTitle = ref('')
const quickCountry = ref<OrganizationCountry>('KENYA')
const quickError = ref('')
const quickSubmitting = ref(false)
const quickResult = ref<EventRecord | null>(null)

async function handleQuickCreate() {
  quickError.value = ''
  quickSubmitting.value = true
  try {
    quickResult.value = await eventsApi.createQuick({
      title: quickTitle.value,
      country: quickCountry.value,
    })
    quickTitle.value = ''
    showQuickForm.value = false
    await store.fetchMine()
  } catch (err) {
    quickError.value = extractErrorMessage(err)
  } finally {
    quickSubmitting.value = false
  }
}

const orgTypes: OrganizationType[] = ['CHURCH', 'CHAMA', 'SACCO', 'COLLECTIVE', 'OTHER']
const orgTypeEmoji: Record<OrganizationType, string> = {
  CHURCH: '⛪',
  CHAMA: '🤝',
  SACCO: '🏦',
  COLLECTIVE: '🎨',
  OTHER: '📁',
}

onMounted(() => store.fetchMine())

async function handleCreate() {
  error.value = ''
  submitting.value = true
  try {
    await store.createOrganization({ name: name.value, type: type.value, country: country.value })
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
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Your organizations</h1>
        <p class="mt-1 text-sm text-slate-500">Manage the churches, chamas, and groups you're part of.</p>
      </div>
      <button
        type="button"
        class="rounded-lg border border-babyblue-200 px-4 py-2 text-sm font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
        @click="showForm = !showForm"
      >
        {{ showForm ? 'Cancel' : '+ New organization' }}
      </button>
    </div>

    <!-- Quick collection: no organization step for a solo user -->
    <ShareLinkReady
      v-if="quickResult && quickResult.defaultLinkToken"
      class="mb-6"
      :token="quickResult.defaultLinkToken"
      :event-id="quickResult.id"
    />
    <div v-else class="mb-6 rounded-2xl border border-babyblue-100 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="font-medium text-slate-900">⚡ Just want to collect money for one thing?</p>
          <p class="text-sm text-slate-500">Skip the organization setup — get a shareable link in one step.</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg bg-babyblue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700"
          @click="showQuickForm = !showQuickForm"
        >
          {{ showQuickForm ? 'Cancel' : '+ Quick collection' }}
        </button>
      </div>

      <form
        v-if="showQuickForm"
        class="mt-4 space-y-2 border-t border-babyblue-100 pt-4"
        @submit.prevent="handleQuickCreate"
      >
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">What are you collecting for?</label>
          <input
            v-model="quickTitle"
            type="text"
            required
            placeholder="e.g. Mum's hospital bill"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Country</label>
          <select
            v-model="quickCountry"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          >
            <option v-for="opt in countryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <p v-if="quickError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ quickError }}</p>
        <button
          type="submit"
          :disabled="quickSubmitting"
          class="rounded-lg bg-babyblue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ quickSubmitting ? 'Creating…' : 'Create and get my link' }}
        </button>
      </form>
    </div>

    <form
      v-if="showForm"
      class="mb-6 space-y-3 rounded-2xl border border-babyblue-100 bg-white p-5 shadow-sm"
      @submit.prevent="handleCreate"
    >
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Name</label>
        <input
          v-model="name"
          type="text"
          required
          class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Type</label>
        <select
          v-model="type"
          class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
        >
          <option v-for="t in orgTypes" :key="t" :value="t">{{ orgTypeEmoji[t] }} {{ t }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Country</label>
        <select
          v-model="country"
          class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
        >
          <option v-for="opt in countryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <p class="mt-1 text-xs text-slate-500">Determines how this organization's events collect and pay out money. Cannot be changed later.</p>
      </div>
      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>
      <button
        type="submit"
        :disabled="submitting"
        class="rounded-lg bg-babyblue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ submitting ? 'Creating…' : 'Create' }}
      </button>
    </form>

    <div v-if="store.loading" class="text-sm text-slate-500">Loading…</div>
    <div
      v-else-if="store.organizations.length === 0"
      class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-10 text-center"
    >
      <p class="text-3xl">🌱</p>
      <p class="mt-2 text-sm font-medium text-slate-700">You're not part of any organization yet.</p>
      <p class="mt-1 text-sm text-slate-500">Create one to start pooling contributions.</p>
    </div>
    <ul v-else class="grid gap-3 sm:grid-cols-2">
      <li v-for="org in store.organizations" :key="org.id" class="min-w-0">
        <RouterLink
          :to="{ name: 'organization-detail', params: { organizationId: org.id } }"
          class="flex items-center justify-between rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-babyblue-300 hover:shadow-md"
        >
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-babyblue-50 text-lg">
              {{ orgTypeEmoji[org.type] }}
            </span>
            <div class="min-w-0">
              <p class="truncate font-medium text-slate-900">{{ org.name }}</p>
              <p class="truncate text-xs text-slate-500">{{ org.type }}</p>
            </div>
          </div>
          <span class="ml-2 shrink-0 rounded-full bg-babyblue-100 px-2.5 py-1 text-xs font-medium text-babyblue-700">
            {{ org.role }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </DashboardLayout>
</template>
