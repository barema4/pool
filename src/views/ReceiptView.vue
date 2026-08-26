<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as publicApi from '@/api/public'
import { extractErrorMessage } from '@/api/client'
import { formatMoney, formatDate } from '@/lib/format'
import type { Receipt } from '@/types/api'

const route = useRoute()
const reference = route.query.reference as string | undefined

const receipt = ref<Receipt | null>(null)
const error = ref('')
const loading = ref(true)

async function load() {
  if (!reference) {
    error.value = 'No payment reference was provided.'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    receipt.value = await publicApi.getReceipt(reference)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-babyblue-50 via-white to-babyblue-100 px-4"
  >
    <div class="w-full max-w-md rounded-2xl border border-babyblue-100 bg-white p-7 shadow-lg shadow-babyblue-100">
      <div v-if="loading" class="text-sm text-slate-500">Loading receipt…</div>

      <div v-else-if="error">
        <p class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{{ error }}</p>
        <p class="mt-2 text-xs text-slate-500">If you just paid, settlement can take a few seconds to arrive.</p>
        <button
          type="button"
          class="mt-4 w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
          @click="load"
        >
          Check again
        </button>
      </div>

      <template v-else-if="receipt">
        <div class="mb-5 text-center">
          <div
            class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700"
          >
            ✓
          </div>
          <h1 class="text-lg font-semibold text-slate-900">Payment received</h1>
          <p class="mt-1 text-sm text-slate-500">Thank you for your contribution!</p>
        </div>

        <dl class="space-y-2 rounded-xl bg-babyblue-50 p-4 text-sm">
          <div class="flex justify-between">
            <dt class="text-slate-500">Event</dt>
            <dd class="font-medium text-slate-900">{{ receipt.event.title }}</dd>
          </div>
          <div v-if="receipt.organization" class="flex justify-between">
            <dt class="text-slate-500">Organization</dt>
            <dd class="text-slate-900">{{ receipt.organization.name }}</dd>
          </div>
          <div v-if="receipt.payerName" class="flex justify-between">
            <dt class="text-slate-500">Paid by</dt>
            <dd class="text-slate-900">{{ receipt.payerName }}</dd>
          </div>
          <div v-if="receipt.categoryTag" class="flex justify-between">
            <dt class="text-slate-500">Category</dt>
            <dd class="text-slate-900">{{ receipt.categoryTag }}</dd>
          </div>
          <div class="flex justify-between border-t border-babyblue-200 pt-2">
            <dt class="text-slate-500">Amount paid</dt>
            <dd class="font-semibold text-babyblue-700">{{ formatMoney(receipt.amountPaid) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Payment method</dt>
            <dd class="text-slate-900">
              {{ receipt.paymentRail === 'MOBILE_MONEY' ? 'Mobile Money' : 'Card' }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Reference</dt>
            <dd class="font-mono text-xs text-slate-900">{{ receipt.receiptNumber }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Date</dt>
            <dd class="text-slate-900">{{ formatDate(receipt.paidAt) }}</dd>
          </div>
          <div
            v-if="receipt.invoiceRemainingBalance !== null && receipt.invoiceRemainingBalance > 0"
            class="flex justify-between text-amber-700"
          >
            <dt>Remaining balance</dt>
            <dd>{{ formatMoney(receipt.invoiceRemainingBalance) }}</dd>
          </div>
        </dl>
      </template>
    </div>
  </div>
</template>
