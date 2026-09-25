<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import * as adminUsersApi from '@/api/adminUsers'
import { extractErrorMessage } from '@/api/client'
import { formatDate } from '@/lib/format'
import type { AdminUser } from '@/types/api'

const search = ref('')
const page = ref(1)
const PAGE_SIZE = 10

const items = ref<AdminUser[]>([])
const total = ref(0)
const totalPages = ref(1)
const loading = ref(true)
const loadError = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await adminUsersApi.list({
      page: page.value,
      pageSize: PAGE_SIZE,
      search: search.value || undefined,
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

onMounted(load)
</script>

<template>
  <AdminLayout>
    <h1 class="mb-6 text-2xl font-semibold text-slate-900">Users</h1>

    <input
      v-model="search"
      type="search"
      placeholder="Search by email or name…"
      class="mb-4 w-full max-w-xs rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
    />

    <div v-if="loading" class="text-sm text-slate-500">Loading…</div>
    <div v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>
    <div
      v-else-if="items.length === 0"
      class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
    >
      No users match.
    </div>
    <template v-else>
      <ul class="space-y-2">
        <li
          v-for="user in items"
          :key="user.id"
          class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="min-w-0">
              <p class="font-medium text-slate-900">{{ user.name }}</p>
              <p class="text-xs text-slate-500">
                {{ user.email }} · {{ user.country }} · joined {{ formatDate(user.createdAt) }}
              </p>
            </div>
            <span
              v-if="user.platformRole"
              class="shrink-0 rounded-full bg-babyblue-100 px-2.5 py-1 text-xs font-medium text-babyblue-700"
            >
              {{ user.platformRole }}
            </span>
          </div>
          <div v-if="user.memberships.length > 0" class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="m in user.memberships"
              :key="m.organization.id"
              class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {{ m.organization.name }} ({{ m.role }})
            </span>
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
