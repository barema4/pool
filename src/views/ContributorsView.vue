<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as publicApi from '@/api/public'
import { extractErrorMessage } from '@/api/client'
import { formatMoney, copyToClipboard } from '@/lib/format'
import type { ContributorSummary } from '@/types/api'

const route = useRoute()
const eventId = route.params.eventId as string

const summary = ref<ContributorSummary | null>(null)
const error = ref('')
const loading = ref(true)
const copied = ref(false)

onMounted(async () => {
  try {
    summary.value = await publicApi.getPublicContributors(eventId)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
})

async function handleCopy() {
  if (!summary.value) return
  copied.value = await copyToClipboard(summary.value.text)
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-babyblue-50 via-white to-babyblue-100 px-4 py-10">
    <div class="mx-auto max-w-lg rounded-2xl border border-babyblue-100 bg-white p-7 shadow-lg shadow-babyblue-100">
      <div v-if="loading" class="text-sm text-slate-500">Loading…</div>
      <div v-else-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</div>

      <template v-else-if="summary">
        <div class="mb-4 flex items-center justify-between">
          <h1 class="text-lg font-semibold text-slate-900">👥 Contributors</h1>
          <button
            type="button"
            class="rounded-lg border border-babyblue-200 px-3 py-1.5 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
            @click="handleCopy"
          >
            {{ copied ? '✓ Copied!' : '📋 Copy summary' }}
          </button>
        </div>

        <div class="mb-6 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-babyblue-50 p-3 text-sm">
            <p class="text-slate-500">Total pledged</p>
            <p class="mt-0.5 text-lg font-semibold text-slate-900">{{ formatMoney(summary.totals.pledged) }}</p>
          </div>
          <div class="rounded-xl bg-babyblue-50 p-3 text-sm">
            <p class="text-slate-500">Total received</p>
            <p class="mt-0.5 text-lg font-semibold text-babyblue-700">{{ formatMoney(summary.totals.received) }}</p>
          </div>
        </div>

        <section v-if="summary.buckets.fullyPaid.length" class="mb-4">
          <h2 class="mb-2 text-sm font-semibold text-green-700">✅ Fully Paid</h2>
          <ul class="space-y-1 text-sm">
            <li v-for="c in summary.buckets.fullyPaid" :key="c.invoiceId" class="flex justify-between">
              <span>{{ c.contributorName ?? 'Anonymous' }}</span>
              <span>{{ formatMoney(c.amountPaid) }}</span>
            </li>
          </ul>
        </section>

        <section v-if="summary.buckets.partiallyPaid.length" class="mb-4">
          <h2 class="mb-2 text-sm font-semibold text-amber-700">🔶 Partially Paid</h2>
          <ul class="space-y-1 text-sm">
            <li v-for="c in summary.buckets.partiallyPaid" :key="c.invoiceId" class="flex justify-between">
              <span>{{ c.contributorName ?? 'Anonymous' }}</span>
              <span>{{ formatMoney(c.amountPaid) }} of {{ formatMoney(c.amountRequested) }}</span>
            </li>
          </ul>
        </section>

        <section v-if="summary.buckets.pledged.length">
          <h2 class="mb-2 text-sm font-semibold text-babyblue-700">🕓 Pledged, Not Yet Paid</h2>
          <ul class="space-y-1 text-sm">
            <li v-for="c in summary.buckets.pledged" :key="c.invoiceId" class="flex justify-between">
              <span>{{ c.contributorName ?? 'Anonymous' }}</span>
              <span>{{ formatMoney(c.amountRequested) }}</span>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </div>
</template>
