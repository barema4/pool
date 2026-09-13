<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import * as reconciliationApi from '@/api/reconciliation'
import { extractErrorMessage } from '@/api/client'
import { formatMoney } from '@/lib/format'
import type { ReconciliationReport } from '@/types/api'

const report = ref<ReconciliationReport | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await reconciliationApi.check()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <AdminLayout>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-slate-900">Reconciliation</h1>
      <button
        type="button"
        class="rounded-lg border border-babyblue-200 px-3 py-1.5 text-sm font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
        @click="load"
      >
        Refresh
      </button>
    </div>

    <div v-if="loading" class="text-sm text-slate-500">Loading…</div>
    <div v-else-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
      {{ error }}
      <p class="mt-1 text-xs text-red-500">
        This usually means the Paystack/PawaPay API credentials aren't configured for live calls yet.
      </p>
    </div>

    <div v-else-if="report" class="grid gap-6 sm:grid-cols-2">
      <section class="rounded-2xl border border-babyblue-100 bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">🇰🇪 Kenya (Paystack)</h2>
        <dl class="space-y-2 text-sm">
          <div v-for="b in report.kenya.liveBalances" :key="b.currency" class="flex justify-between">
            <dt class="text-slate-500">Live balance ({{ b.currency }})</dt>
            <dd class="font-semibold text-slate-900">{{ formatMoney(b.balance, b.currency) }}</dd>
          </div>
          <div v-if="report.kenya.liveBalances.length === 0" class="text-slate-400">No balance data returned.</div>
          <div class="flex justify-between border-t border-babyblue-100 pt-2">
            <dt class="text-slate-500">Expected platform fees</dt>
            <dd class="text-slate-900">{{ formatMoney(report.kenya.expectedPlatformFees, 'KES') }}</dd>
          </div>
        </dl>
        <p class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{{ report.kenya.caveat }}</p>
      </section>

      <section class="rounded-2xl border border-babyblue-100 bg-white p-5 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">🇺🇬 Uganda (PawaPay)</h2>
        <dl class="space-y-2 text-sm">
          <div v-for="b in report.uganda.liveBalances" :key="b.currency" class="flex justify-between">
            <dt class="text-slate-500">Live balance ({{ b.currency }})</dt>
            <dd class="font-semibold text-slate-900">{{ formatMoney(b.balance, b.currency) }}</dd>
          </div>
          <div v-if="report.uganda.liveBalances.length === 0" class="text-slate-400">No balance data returned.</div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Owed to orgs</dt>
            <dd class="text-slate-900">{{ formatMoney(report.uganda.totalOwedToOrgs, 'UGX') }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Platform fees</dt>
            <dd class="text-slate-900">{{ formatMoney(report.uganda.totalPlatformFees, 'UGX') }}</dd>
          </div>
          <div class="flex justify-between border-t border-babyblue-100 pt-2 font-semibold">
            <dt class="text-slate-700">Expected total</dt>
            <dd class="text-slate-900">{{ formatMoney(report.uganda.expectedTotal, 'UGX') }}</dd>
          </div>
          <div
            class="flex justify-between font-semibold"
            :class="Math.abs(report.uganda.drift) < 0.01 ? 'text-green-700' : 'text-red-600'"
          >
            <dt>Drift</dt>
            <dd>{{ formatMoney(report.uganda.drift, 'UGX') }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </AdminLayout>
</template>
