<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as personalInvoicesApi from '@/api/personalInvoices'
import { extractErrorMessage } from '@/api/client'
import { formatMoney } from '@/lib/format'
import type { PublicPersonalInvoiceView, PaymentMethod, MobileMoneyProvider } from '@/types/api'

const route = useRoute()
const token = route.params.token as string

const invoice = ref<PublicPersonalInvoiceView | null>(null)
const loadError = ref('')
const loading = ref(true)

const payerEmail = ref('')
const payerName = ref('')
const payerPhone = ref('')
const submitError = ref('')
const submitting = ref(false)
const selectedMethod = ref<PaymentMethod | MobileMoneyProvider>('card')
// Uganda/PawaPay has no redirect page — a prompt is pushed straight to the
// payer's phone instead, so success looks like this screen, not a redirect.
const checkoutPending = ref(false)

const isClosed = computed(
  () => invoice.value?.status === 'PAID' || invoice.value?.status === 'EXPIRED' || invoice.value?.status === 'CANCELLED',
)
const isMobileMoneyPush = computed(() => invoice.value?.chargeShape === 'MOBILE_MONEY_PUSH')
const mobileMoneyOperators = computed(() => invoice.value?.mobileMoneyOperators ?? [])
const currency = computed(() => invoice.value?.currency)
function money(value: string | number | null | undefined): string {
  return formatMoney(value, currency.value)
}

async function load() {
  loading.value = true
  try {
    invoice.value = await personalInvoicesApi.getByToken(token)
    if (invoice.value.recipientEmail) payerEmail.value = invoice.value.recipientEmail
    if (invoice.value.recipientName) payerName.value = invoice.value.recipientName
    if (invoice.value.recipientPhone) payerPhone.value = invoice.value.recipientPhone
    const firstOperator = mobileMoneyOperators.value[0]
    if (firstOperator) selectedMethod.value = firstOperator.code
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function handleSubmit() {
  submitError.value = ''
  submitting.value = true
  try {
    const result = await personalInvoicesApi.initializeCheckout(token, {
      payerEmail: payerEmail.value,
      payerName: payerName.value || undefined,
      payerPhone: payerPhone.value || undefined,
      paymentMethod: selectedMethod.value,
      phoneNumber: isMobileMoneyPush.value ? payerPhone.value : undefined,
    })
    if (result.status === 'pending') {
      checkoutPending.value = true
      submitting.value = false
    } else if (result.authorizationUrl) {
      window.location.href = result.authorizationUrl
    }
  } catch (err) {
    submitError.value = extractErrorMessage(err)
    submitting.value = false
  }
}
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-babyblue-50 via-white to-babyblue-100 px-4"
  >
    <div class="w-full max-w-md rounded-2xl border border-babyblue-100 bg-white p-7 shadow-lg shadow-babyblue-100">
      <div v-if="loading" class="text-sm text-slate-500">Loading…</div>
      <div v-else-if="loadError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ loadError }}</div>

      <div v-else-if="checkoutPending" class="text-center">
        <div
          class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-babyblue-100 text-2xl text-babyblue-700"
        >
          📱
        </div>
        <h1 class="text-lg font-semibold text-slate-900">Check your phone</h1>
        <p class="mt-1 text-sm text-slate-500">
          We sent a payment prompt to {{ payerPhone }}. Enter your PIN there to complete the payment — this page
          won't update automatically, so you can safely close it once you've confirmed on your phone.
        </p>
      </div>

      <template v-else-if="invoice">
        <div class="mb-1 flex items-center gap-2">
          <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-babyblue-500 text-sm font-bold text-white">
            OP
          </span>
          <h1 class="text-lg font-semibold text-slate-900">Invoice from {{ invoice.issuer.name }}</h1>
        </div>
        <p v-if="invoice.description" class="ml-11 text-sm text-babyblue-600">{{ invoice.description }}</p>

        <div v-if="isClosed" class="mt-6 rounded-xl bg-babyblue-50 p-4 text-sm text-slate-700">
          <span v-if="invoice.status === 'PAID'">✅ This invoice has been paid. Thank you, {{ invoice.recipientName }}!</span>
          <span v-else-if="invoice.status === 'CANCELLED'">This invoice was cancelled by the issuer.</span>
          <span v-else>⏱️ This invoice has expired.</span>
        </div>

        <form v-else class="mt-6 space-y-4" @submit.prevent="handleSubmit">
          <div v-if="invoice.platformFeeAmount > 0" class="rounded-xl bg-babyblue-50 p-4 text-sm">
            <div class="flex justify-between text-slate-600">
              <span>Amount</span>
              <span>{{ money(invoice.amount) }}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>Platform fee ({{ invoice.platformFeePercent }}%)</span>
              <span>{{ money(invoice.platformFeeAmount) }}</span>
            </div>
            <div class="mt-1 flex justify-between border-t border-babyblue-100 pt-1 font-semibold text-babyblue-700">
              <span>Total to pay</span>
              <span>{{ money(invoice.totalChargeAmount) }}</span>
            </div>
          </div>
          <div v-else class="rounded-xl bg-babyblue-50 p-4 text-sm">
            <div class="flex justify-between font-semibold text-babyblue-700">
              <span>Amount due</span>
              <span>{{ money(invoice.amount) }}</span>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Your name</label>
            <input
              v-model="payerName"
              type="text"
              class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              v-model="payerEmail"
              type="email"
              required
              class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">
              {{ isMobileMoneyPush ? 'Phone number (for mobile money)' : 'Phone (optional)' }}
            </label>
            <input
              v-model="payerPhone"
              type="tel"
              :required="isMobileMoneyPush"
              :placeholder="isMobileMoneyPush ? 'Include country code' : ''"
              class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
            />
          </div>

          <p v-if="submitError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ submitError }}</p>

          <div v-if="isMobileMoneyPush" class="grid grid-cols-2 gap-2">
            <button
              v-for="operator in mobileMoneyOperators"
              :key="operator.code"
              type="submit"
              :disabled="submitting"
              class="rounded-lg bg-babyblue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="selectedMethod = operator.code"
            >
              {{ submitting && selectedMethod === operator.code ? 'Sending…' : `📱 ${operator.label}` }}
            </button>
          </div>
          <div v-else class="grid grid-cols-2 gap-2">
            <button
              type="submit"
              :disabled="submitting"
              class="rounded-lg bg-babyblue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="selectedMethod = 'card'"
            >
              {{ submitting && selectedMethod === 'card' ? 'Redirecting…' : '💳 Pay with Card' }}
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="rounded-lg bg-babyblue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="selectedMethod = 'mobile_money'"
            >
              {{ submitting && selectedMethod === 'mobile_money' ? 'Redirecting…' : '📱 Pay with M-Pesa' }}
            </button>
          </div>
        </form>
      </template>
    </div>
  </div>
</template>
