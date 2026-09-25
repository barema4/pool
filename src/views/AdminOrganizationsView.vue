<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import * as adminOrganizationsApi from '@/api/adminOrganizations'
import { extractErrorMessage } from '@/api/client'
import { formatDate } from '@/lib/format'
import type { Organization } from '@/types/api'

const search = ref('')
const showArchived = ref(false)
const page = ref(1)
const PAGE_SIZE = 10

const items = ref<Organization[]>([])
const total = ref(0)
const totalPages = ref(1)
const loading = ref(true)
const loadError = ref('')
const archivingId = ref<string | null>(null)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await adminOrganizationsApi.list({
      page: page.value,
      pageSize: PAGE_SIZE,
      search: search.value || undefined,
      includeArchived: showArchived.value,
    })
    items.value = result.data
    total.value = result.total
    totalPages.value = result.totalPages
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function goToPage(next: number) {
  if (next < 1 || next > totalPages.value) return
  page.value = next
  load()
}

let searchDebounce: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})
watch(showArchived, () => {
  page.value = 1
  load()
})

onMounted(load)

async function handleToggleArchived(org: Organization) {
  const nextArchived = !org.archivedAt
  if (
    !confirm(
      nextArchived
        ? `Archive "${org.name}"? It's hidden from the organizer's list by default — nothing else is affected.`
        : `Unarchive "${org.name}"?`,
    )
  ) {
    return
  }
  archivingId.value = org.id
  try {
    await adminOrganizationsApi.setArchived(org.id, nextArchived)
    await load()
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    archivingId.value = null
  }
}
</script>

<template>
  <AdminLayout>
    <h1 class="mb-6 text-2xl font-semibold text-slate-900">Organizations</h1>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <input
        v-model="search"
        type="search"
        placeholder="Search by name…"
        class="w-full max-w-xs rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
      />
      <label class="flex items-center gap-2 text-sm text-slate-600">
        <input v-model="showArchived" type="checkbox" class="rounded border-babyblue-300" />
        Show archived
      </label>
    </div>

    <div v-if="loading" class="text-sm text-slate-500">Loading…</div>
    <div v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>
    <div
      v-else-if="items.length === 0"
      class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
    >
      No organizations match.
    </div>
    <template v-else>
      <ul class="space-y-2">
        <li
          v-for="org in items"
          :key="org.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
        >
          <div class="min-w-0">
            <p class="flex items-center gap-2 font-medium text-slate-900">
              {{ org.name }}
              <span v-if="org.archivedAt" class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                Archived
              </span>
            </p>
            <p class="text-xs text-slate-500">
              {{ org.type }} · {{ org.country }} · created {{ formatDate(org.createdAt) }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              :disabled="archivingId === org.id"
              class="rounded-lg border border-babyblue-200 px-2.5 py-1.5 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleToggleArchived(org)"
            >
              {{ org.archivedAt ? 'Unarchive' : 'Archive' }}
            </button>
          </div>
        </li>
      </ul>

      <PaginationControls
        v-if="totalPages > 1"
        class="mt-4 rounded-2xl border border-babyblue-100 bg-white"
        :page="page"
        :total-pages="totalPages"
        :total="total"
        @update:page="goToPage"
      />
    </template>
  </AdminLayout>
</template>
