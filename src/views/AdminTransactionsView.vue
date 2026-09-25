<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import * as adminTransactionsApi from '@/api/adminTransactions'
import { extractErrorMessage } from '@/api/client'
import { formatDate, formatMoney, statusBadgeClass } from '@/lib/format'
import type { AdminDispute, AdminTransaction, DisputeStatus, TransactionStatus } from '@/types/api'

type Tab = 'transactions' | 'disputes'
const activeTab = ref<Tab>('transactions')

const inputClass =
  'rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none'
const outlineButtonClass =
  'rounded-lg border border-babyblue-200 px-2.5 py-1.5 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100 disabled:cursor-not-allowed disabled:opacity-50'

// --- Transactions ---
const search = ref('')
const statusFilter = ref<TransactionStatus | ''>('')
const page = ref(1)
const PAGE_SIZE = 10

const items = ref<AdminTransaction[]>([])
const total = ref(0)
const totalPages = ref(1)
const loading = ref(true)
const loadError = ref('')
const refundingId = ref<string | null>(null)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await adminTransactionsApi.list({
      page: page.value,
      pageSize: PAGE_SIZE,
      search: search.value || undefined,
      status: statusFilter.value || undefined,
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
watch(statusFilter, () => {
  page.value = 1
  load()
})

onMounted(load)

function canRefund(txn: AdminTransaction): boolean {
  return txn.status === 'SUCCESS' && (!txn.refund || txn.refund.status === 'FAILED')
}

async function handleRefund(txn: AdminTransaction) {
  if (!confirm(`Refund ${formatMoney(txn.amountSettled, txn.currency)} for "${txn.event.title}"? This cannot be undone.`)) {
    return
  }
  refundingId.value = txn.id
  try {
    await adminTransactionsApi.refund(txn.id)
    await load()
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    refundingId.value = null
  }
}

// --- Disputes ---
const disputeStatusFilter = ref<DisputeStatus | ''>('')
const disputePage = ref(1)
const disputes = ref<AdminDispute[]>([])
const disputeTotal = ref(0)
const disputeTotalPages = ref(1)
const disputesLoading = ref(false)
const disputesError = ref('')
const disputesLoadedOnce = ref(false)

const disputeStatusOptions: DisputeStatus[] = [
  'AWAITING_MERCHANT_FEEDBACK',
  'AWAITING_BANK_FEEDBACK',
  'PENDING',
  'RESOLVED',
]

async function loadDisputes() {
  disputesLoading.value = true
  disputesError.value = ''
  try {
    const result = await adminTransactionsApi.listDisputes({
      page: disputePage.value,
      pageSize: PAGE_SIZE,
      status: disputeStatusFilter.value || undefined,
    })
    disputes.value = result.data
    disputeTotal.value = result.total
    disputeTotalPages.value = result.totalPages
  } catch (err) {
    disputesError.value = extractErrorMessage(err)
  } finally {
    disputesLoading.value = false
  }
}

function goToDisputePage(next: number) {
  if (next < 1 || next > disputeTotalPages.value) return
  disputePage.value = next
  loadDisputes()
}

watch(disputeStatusFilter, () => {
  disputePage.value = 1
  loadDisputes()
})

function selectTab(tab: Tab) {
  activeTab.value = tab
  if (tab === 'disputes' && !disputesLoadedOnce.value) {
    disputesLoadedOnce.value = true
    loadDisputes()
  }
}

const overrideStatus = ref<Record<string, DisputeStatus>>({})
const overrideResolution = ref<Record<string, string>>({})
const savingDisputeId = ref<string | null>(null)

function statusFor(dispute: AdminDispute): DisputeStatus {
  return overrideStatus.value[dispute.id] ?? dispute.status
}

async function handleSaveDisputeStatus(dispute: AdminDispute) {
  const status = statusFor(dispute)
  const resolution = overrideResolution.value[dispute.id]
  if (!confirm(`Set this dispute's status to ${status}?`)) return
  savingDisputeId.value = dispute.id
  try {
    await adminTransactionsApi.updateDisputeStatus(dispute.id, {
      status,
      resolution: resolution || undefined,
    })
    await loadDisputes()
  } catch (err) {
    disputesError.value = extractErrorMessage(err)
  } finally {
    savingDisputeId.value = null
  }
}
</script>

<template>
  <AdminLayout>
    <h1 class="mb-4 text-2xl font-semibold text-slate-900">Transactions</h1>

    <div class="mb-4 flex gap-1 border-b border-babyblue-100">
      <button
        type="button"
        class="px-3 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'transactions' ? 'border-b-2 border-babyblue-600 text-babyblue-700' : 'text-slate-500 hover:text-slate-700'"
        @click="selectTab('transactions')"
      >
        Transactions
      </button>
      <button
        type="button"
        class="px-3 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'disputes' ? 'border-b-2 border-babyblue-600 text-babyblue-700' : 'text-slate-500 hover:text-slate-700'"
        @click="selectTab('disputes')"
      >
        Disputes
      </button>
    </div>

    <section v-if="activeTab === 'transactions'">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <input
          v-model="search"
          type="search"
          placeholder="Search reference, event, or organization…"
          :class="inputClass"
          class="w-full max-w-sm"
        />
        <select v-model="statusFilter" :class="inputClass">
          <option value="">Any status</option>
          <option value="PENDING">Pending</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      <div v-if="loading" class="text-sm text-slate-500">Loading…</div>
      <div v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>
      <div
        v-else-if="items.length === 0"
        class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
      >
        No transactions match.
      </div>
      <template v-else>
        <ul class="space-y-2">
          <li
            v-for="txn in items"
            :key="txn.id"
            class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
          >
            <div class="min-w-0">
              <p class="font-medium text-slate-900">
                {{ txn.event.title }}
                <span class="font-normal text-slate-500">· {{ txn.event.organization?.name ?? '—' }}</span>
              </p>
              <p class="text-xs text-slate-500">
                {{ txn.providerReference }} · {{ txn.gateway }} · {{ formatDate(txn.timestamp) }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <span class="text-sm font-semibold text-slate-900">{{ formatMoney(txn.amountSettled, txn.currency) }}</span>
              <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="statusBadgeClass(txn.status)">
                {{ txn.status }}
              </span>
              <button
                v-if="canRefund(txn)"
                type="button"
                :disabled="refundingId === txn.id"
                :class="outlineButtonClass"
                @click="handleRefund(txn)"
              >
                {{ refundingId === txn.id ? 'Refunding…' : 'Refund' }}
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
    </section>

    <section v-else>
      <div class="mb-4">
        <select v-model="disputeStatusFilter" :class="inputClass">
          <option value="">Any status</option>
          <option v-for="s in disputeStatusOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div v-if="disputesLoading" class="text-sm text-slate-500">Loading…</div>
      <div v-else-if="disputesError" class="text-sm text-red-600">{{ disputesError }}</div>
      <div
        v-else-if="disputes.length === 0"
        class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
      >
        No disputes match.
      </div>
      <template v-else>
        <ul class="space-y-2">
          <li
            v-for="dispute in disputes"
            :key="dispute.id"
            class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium text-slate-900">
                  {{ dispute.transaction?.event.title ?? 'Unknown event' }}
                  <span class="font-normal text-slate-500">
                    · {{ dispute.transaction?.event.organization?.name ?? '—' }}
                  </span>
                </p>
                <p class="text-xs text-slate-500">
                  {{ formatMoney(dispute.amount) }} · opened {{ formatDate(dispute.createdAt) }}
                  <span v-if="dispute.reason"> · {{ dispute.reason }}</span>
                </p>
              </div>
              <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="statusBadgeClass(dispute.status)">
                {{ dispute.status }}
              </span>
            </div>

            <div class="mt-3 flex flex-wrap items-end gap-2 border-t border-babyblue-100 pt-3">
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700">Override status</label>
                <select
                  :value="statusFor(dispute)"
                  :class="inputClass"
                  @change="overrideStatus[dispute.id] = ($event.target as HTMLSelectElement).value as DisputeStatus"
                >
                  <option v-for="s in disputeStatusOptions" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div class="min-w-48 flex-1">
                <label class="mb-1 block text-xs font-medium text-slate-700">Resolution note</label>
                <input
                  :value="overrideResolution[dispute.id] ?? dispute.resolution ?? ''"
                  type="text"
                  :class="inputClass"
                  class="w-full"
                  @input="overrideResolution[dispute.id] = ($event.target as HTMLInputElement).value"
                />
              </div>
              <button
                type="button"
                :disabled="savingDisputeId === dispute.id"
                :class="outlineButtonClass"
                @click="handleSaveDisputeStatus(dispute)"
              >
                {{ savingDisputeId === dispute.id ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </li>
        </ul>

        <PaginationControls
          v-if="disputeTotalPages > 1"
          class="mt-4 rounded-2xl border border-babyblue-100 bg-white"
          :page="disputePage"
          :total-pages="disputeTotalPages"
          :total="disputeTotal"
          @update:page="goToDisputePage"
        />
      </template>
    </section>
  </AdminLayout>
</template>
