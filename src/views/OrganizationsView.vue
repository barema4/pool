<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import ShareLinkReady from '@/components/ShareLinkReady.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { useOrganizationsStore } from '@/stores/organizations'
import * as organizationsApi from '@/api/organizations'
import * as eventsApi from '@/api/events'
import * as publicApi from '@/api/public'
import { extractErrorMessage } from '@/api/client'
import type { OrganizationType, EventRecord, SupportedCountry, OrganizationWithRole } from '@/types/api'

const store = useOrganizationsStore()

// The browsable/searchable/paginated list shown on this page — separate
// from store.organizations, which stays a full unpaginated fetch feeding
// role lookups elsewhere in the app (see stores/organizations.ts).
const search = ref('')
const showArchived = ref(false)
const page = ref(1)
const PAGE_SIZE = 10
const listItems = ref<OrganizationWithRole[]>([])
const listTotal = ref(0)
const listTotalPages = ref(1)
const listLoading = ref(true)

async function loadList() {
  listLoading.value = true
  try {
    const result = await organizationsApi.listMine({
      page: page.value,
      pageSize: PAGE_SIZE,
      search: search.value || undefined,
      includeArchived: showArchived.value,
    })
    listItems.value = result.data
    listTotal.value = result.total
    listTotalPages.value = result.totalPages
  } finally {
    listLoading.value = false
  }
}

function goToPage(next: number) {
  if (next < 1 || next > listTotalPages.value) return
  page.value = next
  loadList()
}

let searchDebounce: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    page.value = 1
    loadList()
  }, 300)
})

watch(showArchived, () => {
  page.value = 1
  loadList()
})

const showForm = ref(false)
const name = ref('')
const type = ref<OrganizationType>('OTHER')
const country = ref('KE')
const error = ref('')
const submitting = ref(false)

// Sourced from the backend's SUPPORTED_COUNTRIES so this list and the
// backend never drift — shared between this form and the quick-collection
// form below.
const countryOptions = ref<SupportedCountry[]>([])
publicApi.listSupportedCountries().then((countries) => {
  countryOptions.value = countries
})

// Quick collection — skips organization setup entirely for a solo user.
// Still needs a country pick, since that determines the payment provider for
// the personal org it reuses/creates behind the scenes.
const showQuickForm = ref(false)
const quickTitle = ref('')
const quickCountry = ref('KE')
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
    await Promise.all([store.fetchMine(), loadList()])
  } catch (err) {
    quickError.value = extractErrorMessage(err)
  } finally {
    quickSubmitting.value = false
  }
}

const orgTypes: OrganizationType[] = [
  'CHURCH',
  'CHAMA',
  'SACCO',
  'COLLECTIVE',
  'EVENT_COMPANY',
  'OTHER',
]
const orgTypeEmoji: Record<OrganizationType, string> = {
  CHURCH: '⛪',
  CHAMA: '🤝',
  SACCO: '🏦',
  COLLECTIVE: '🎨',
  EVENT_COMPANY: '🎪',
  OTHER: '📁',
}

const myOrganizations = computed(() => listItems.value.filter((o) => !o.managedViaAgency))
const managedForClients = computed(() => listItems.value.filter((o) => o.managedViaAgency))

onMounted(() => {
  store.fetchMine()
  loadList()
})

async function handleCreate() {
  error.value = ''
  submitting.value = true
  try {
    await store.createOrganization({ name: name.value, type: type.value, country: country.value })
    name.value = ''
    showForm.value = false
    search.value = ''
    page.value = 1
    await loadList()
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
            <option v-for="opt in countryOptions" :key="opt.code" :value="opt.code">{{ opt.label }}</option>
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
          <option v-for="opt in countryOptions" :key="opt.code" :value="opt.code">{{ opt.label }}</option>
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

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <input
        v-model="search"
        type="search"
        placeholder="Search organizations…"
        class="w-full max-w-xs rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
      />
      <label class="flex items-center gap-2 text-sm text-slate-600">
        <input v-model="showArchived" type="checkbox" class="rounded border-babyblue-300" />
        Show archived
      </label>
    </div>

    <div v-if="listLoading" class="text-sm text-slate-500">Loading…</div>
    <div
      v-else-if="listItems.length === 0"
      class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-10 text-center"
    >
      <p class="text-3xl">🌱</p>
      <p class="mt-2 text-sm font-medium text-slate-700">
        {{ search ? 'No organizations match your search.' : "You're not part of any organization yet." }}
      </p>
      <p v-if="!search" class="mt-1 text-sm text-slate-500">Create one to start pooling contributions.</p>
    </div>
    <template v-else>
      <div v-if="myOrganizations.length > 0" class="mb-6">
        <h2 v-if="managedForClients.length > 0" class="mb-2 text-sm font-medium text-slate-500">
          My organizations
        </h2>
        <ul class="grid gap-3 sm:grid-cols-2">
          <li v-for="org in myOrganizations" :key="org.id" class="min-w-0">
            <RouterLink
              :to="{ name: 'organization-detail', params: { organizationId: org.id } }"
              class="flex items-center justify-between rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-babyblue-300 hover:shadow-md"
              :class="{ 'opacity-60': org.archivedAt }"
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
              <div class="ml-2 flex shrink-0 items-center gap-2">
                <span v-if="org.archivedAt" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                  Archived
                </span>
                <span class="rounded-full bg-babyblue-100 px-2.5 py-1 text-xs font-medium text-babyblue-700">
                  {{ org.role }}
                </span>
              </div>
            </RouterLink>
          </li>
        </ul>
      </div>

      <div v-if="managedForClients.length > 0">
        <h2 class="mb-2 text-sm font-medium text-slate-500">Managed for clients</h2>
        <ul class="grid gap-3 sm:grid-cols-2">
          <li v-for="org in managedForClients" :key="org.id" class="min-w-0">
            <RouterLink
              :to="{ name: 'organization-detail', params: { organizationId: org.id } }"
              class="flex items-center justify-between rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-babyblue-300 hover:shadow-md"
              :class="{ 'opacity-60': org.archivedAt }"
            >
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-babyblue-50 text-lg">
                  {{ orgTypeEmoji[org.type] }}
                </span>
                <div class="min-w-0">
                  <p class="truncate font-medium text-slate-900">{{ org.name }}</p>
                  <p class="truncate text-xs text-slate-500">via {{ org.managedViaAgency?.name }}</p>
                </div>
              </div>
              <div class="ml-2 flex shrink-0 items-center gap-2">
                <span v-if="org.archivedAt" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                  Archived
                </span>
                <span class="rounded-full bg-babyblue-100 px-2.5 py-1 text-xs font-medium text-babyblue-700">
                  {{ org.role }}
                </span>
              </div>
            </RouterLink>
          </li>
        </ul>
      </div>

      <PaginationControls
        v-if="listTotalPages > 1"
        class="mt-4"
        :page="page"
        :total-pages="listTotalPages"
        :total="listTotal"
        @update:page="goToPage"
      />
    </template>
  </DashboardLayout>
</template>
