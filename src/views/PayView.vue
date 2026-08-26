<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as publicApi from '@/api/public'
import { extractErrorMessage } from '@/api/client'
import { formatMoney } from '@/lib/format'
import type { PublicInvoiceView } from '@/types/api'

const route = useRoute()
const token = route.params.token as string

const invoice = ref<PublicInvoiceView | null>(null)
const loadError = ref('')
const loading = ref(true)

const email = ref('')
const amount = ref<number | null>(null)
const submitError = ref('')
const submitting = ref(false)

const isSingleUse = computed(() => !!invoice.value?.expiresAt)
const remaining = computed(() => {
  if (!invoice.value?.amountRequested) return null
  return Math.max(Number(invoice.value.amountRequested) - Number(invoice.value.amountPaid), 0)
})
const isClosed = computed(
  () => invoice.value?.status === 'PAID' || invoice.value?.status === 'EXPIRED',
)

onMounted(async () => {
  try {
    invoice.value = await publicApi.getInvoiceByToken(token)
    if (remaining.value !== null) amount.value = remaining.value
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
})

async function handleSubmit() {
  submitError.value = ''
  submitting.value = true
  try {
    const result = await publicApi.initializeCheckout(token, {
      email: email.value,
      amount: amount.value ?? undefined,
    })
    window.location.href = result.authorizationUrl
  } catch (err) {
    submitError.value = extractErrorMessage(err)
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <div class="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div v-if="loading" class="text-sm text-slate-500">Loading…</div>
      <div v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>
      <template v-else-if="invoice">
        <h1 class="text-lg font-semibold text-slate-900">{{ invoice.event.title }}</h1>
        <p v-if="invoice.categoryTag" class="mt-1 text-sm text-slate-500">
          {{ invoice.categoryTag }}
        </p>

        <div v-if="isClosed" class="mt-6 rounded-md bg-slate-100 p-4 text-sm text-slate-700">
          <span v-if="invoice.status === 'PAID'"
            >This invoice has already been paid in full. Thank you!</span
          >
          <span v-else>This invoice has expired.</span>
        </div>

        <form v-else class="mt-6 space-y-4" @submit.prevent="handleSubmit">
          <div
            v-if="isSingleUse && invoice.amountRequested"
            class="rounded-md bg-slate-50 p-3 text-sm"
          >
            <div class="flex justify-between text-slate-600">
              <span>Requested</span>
              <span>{{ formatMoney(invoice.amountRequested) }}</span>
            </div>
            <div v-if="Number(invoice.amountPaid) > 0" class="flex justify-between text-slate-600">
              <span>Already paid</span>
              <span>{{ formatMoney(invoice.amountPaid) }}</span>
            </div>
            <div class="mt-1 flex justify-between font-medium text-slate-900">
              <span>Remaining</span>
              <span>{{ formatMoney(remaining) }}</span>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Amount to pay</label>
            <input
              v-model.number="amount"
              type="number"
              step="0.01"
              min="0.01"
              :max="remaining ?? undefined"
              required
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <p v-if="remaining !== null" class="mt-1 text-xs text-slate-500">
              You can pay this off in full or leave a smaller partial amount.
            </p>
          </div>

          <p v-if="submitError" class="text-sm text-red-600">{{ submitError }}</p>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {{ submitting ? 'Redirecting to payment…' : 'Pay with card or mobile money' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>
