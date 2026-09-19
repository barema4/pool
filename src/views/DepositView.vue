<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { useEventStore } from '@/stores/event'
import * as depositsApi from '@/api/deposits'
import { extractErrorMessage } from '@/api/client'
import { currencyForCountry, formatMoney } from '@/lib/format'
import type { PaymentMethod, MobileMoneyProvider } from '@/types/api'

const route = useRoute()
const router = useRouter()
const eventId = route.params.eventId as string
const store = useEventStore()

const loadError = ref('')
const amount = ref<number | null>(null)
const phone = ref('')
const submitError = ref('')
const submitting = ref(false)
const selectedMethod = ref<PaymentMethod | MobileMoneyProvider>('card')
// Uganda/PawaPay has no redirect page — a prompt is pushed straight to the
// depositor's phone instead, so success looks like this screen, not a redirect.
const depositPending = ref(false)

const isUganda = computed(() => store.event?.organization?.country === 'UGANDA')
const currency = computed(() => currencyForCountry(store.event?.organization?.country))
function money(value: string | number | null | undefined): string {
  return formatMoney(value, currency.value)
}

onMounted(async () => {
  try {
    if (!store.event || store.event.id !== eventId) await store.load(eventId)
    if (isUganda.value) selectedMethod.value = 'MTN_MOMO_UGA'
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  }
})

async function handleDeposit() {
  if (!amount.value) return
  submitError.value = ''
  submitting.value = true
  try {
    const result = await depositsApi.initiate(eventId, {
      amount: amount.value,
      paymentMethod: selectedMethod.value,
      phoneNumber: isUganda.value ? phone.value : undefined,
    })
    if (result.status === 'pending') {
      depositPending.value = true
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
  <DashboardLayout>
  <div class="mx-auto max-w-md px-4 py-10">
    <button type="button" class="mb-4 text-sm text-babyblue-600 hover:underline" @click="router.back()">
      ← Back
    </button>

    <div class="rounded-2xl border border-babyblue-100 bg-white p-7 shadow-sm">
      <div v-if="loadError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ loadError }}</div>

      <div v-else-if="depositPending" class="text-center">
        <div
          class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-babyblue-100 text-2xl text-babyblue-700"
        >
          📱
        </div>
        <h1 class="text-lg font-semibold text-slate-900">Check your phone</h1>
        <p class="mt-1 text-sm text-slate-500">
          We sent a payment prompt to {{ phone }}. Enter your mobile money PIN there to complete the deposit — once
          it clears, it'll show up as received on this event.
        </p>
      </div>

      <template v-else-if="store.event">
        <h1 class="text-lg font-semibold text-slate-900">Deposit into {{ store.event.title }}</h1>
        <p class="mt-1 text-sm text-slate-500">
          Move your own money into this event's budget-allocatable pool — this is a real charge, not a manual
          record, so it's safe to allocate and pay vendors from once it's confirmed.
        </p>

        <form class="mt-5 space-y-4" @submit.prevent="handleDeposit">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Amount ({{ currency }})</label>
            <input
              v-model.number="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
            />
          </div>

          <div v-if="isUganda">
            <label class="mb-1 block text-sm font-medium text-slate-700">Phone number to deduct from</label>
            <input
              v-model="phone"
              type="tel"
              placeholder="256771234567"
              required
              class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
            />
          </div>

          <p v-if="submitError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ submitError }}</p>

          <div v-if="isUganda" class="grid grid-cols-2 gap-2">
            <button
              type="submit"
              :disabled="submitting"
              class="rounded-lg bg-babyblue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="selectedMethod = 'MTN_MOMO_UGA'"
            >
              {{ submitting && selectedMethod === 'MTN_MOMO_UGA' ? 'Sending prompt…' : '📱 MTN Mobile Money' }}
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="rounded-lg bg-babyblue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="selectedMethod = 'AIRTEL_OAPI_UGA'"
            >
              {{ submitting && selectedMethod === 'AIRTEL_OAPI_UGA' ? 'Sending prompt…' : '📱 Airtel Money' }}
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
          <p v-if="amount" class="text-center text-xs text-slate-500">
            No platform fee — the full {{ money(amount) }} lands on this event.
          </p>
        </form>
      </template>
    </div>
  </div>
  </DashboardLayout>
</template>
