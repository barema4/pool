<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as publicApi from '@/api/public'
import { extractErrorMessage } from '@/api/client'
import { formatMoney, copyToClipboard, calculatePlatformFee } from '@/lib/format'
import type { PublicInvoiceView, Invoice, PaymentMethod, MobileMoneyProvider } from '@/types/api'

const route = useRoute()
const token = route.params.token as string

const invoice = ref<PublicInvoiceView | null>(null)
const loadError = ref('')
const loading = ref(true)

type Mode = 'pay' | 'pledge'
const mode = ref<Mode>('pay')

const name = ref('')
const email = ref('')
const phone = ref('')
const amount = ref<number | null>(null)
const submitError = ref('')
const submitting = ref(false)
const selectedMethod = ref<PaymentMethod | MobileMoneyProvider>('card')
const pledgeCreated = ref<Invoice | null>(null)
const copiedPledgeLink = ref(false)
// Uganda/PawaPay has no redirect page — a prompt is pushed straight to the
// payer's phone instead, so success looks like this screen, not a redirect.
const checkoutPending = ref(false)

const nameLocked = computed(() => !!invoice.value?.contributorName)
const emailLocked = computed(() => !!invoice.value?.contributorEmail)
const phoneLocked = computed(() => !!invoice.value?.contributorPhone)
const isMobileMoneyPush = computed(() => invoice.value?.chargeShape === 'MOBILE_MONEY_PUSH')
const mobileMoneyOperators = computed(() => invoice.value?.mobileMoneyOperators ?? [])
const currency = computed(() => invoice.value?.currency)
function money(value: string | number | null | undefined): string {
  return formatMoney(value, currency.value)
}

const isSingleUse = computed(() => !!invoice.value?.expiresAt)
const hasFixedAmount = computed(() => invoice.value?.amountRequested !== null)
const remaining = computed(() => {
  if (!invoice.value?.amountRequested) return null
  return Math.max(Number(invoice.value.amountRequested) - Number(invoice.value.amountPaid), 0)
})
const isClosed = computed(
  () => invoice.value?.status === 'PAID' || invoice.value?.status === 'EXPIRED',
)

// Live preview, reactive to whatever the payer currently has entered
// (partial payments are allowed even on a fixed-amount invoice, so a
// backend-precomputed fee off the full remaining balance would go stale the
// moment they edit the amount down). The actual charge is always computed
// authoritatively server-side regardless of what this shows.
const feeAmount = computed(() => {
  if (!invoice.value || !amount.value) return 0
  return calculatePlatformFee(amount.value, invoice.value.platformFeePercent)
})
const totalToPay = computed(() => (amount.value ?? 0) + feeAmount.value)

onMounted(async () => {
  try {
    invoice.value = await publicApi.getInvoiceByToken(token)
    if (invoice.value.contributorName) name.value = invoice.value.contributorName
    if (invoice.value.contributorEmail) email.value = invoice.value.contributorEmail
    if (invoice.value.contributorPhone) phone.value = invoice.value.contributorPhone
    if (remaining.value !== null) amount.value = remaining.value
    const firstOperator = mobileMoneyOperators.value[0]
    if (firstOperator) selectedMethod.value = firstOperator.code
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
})

async function handlePay() {
  submitError.value = ''
  submitting.value = true
  try {
    const result = await publicApi.initializeCheckout(token, {
      email: email.value,
      amount: amount.value ?? undefined,
      contributorName: name.value || undefined,
      contributorPhone: phone.value || undefined,
      paymentMethod: selectedMethod.value,
      phoneNumber: isMobileMoneyPush.value ? phone.value : undefined,
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

async function handlePledge() {
  if (!invoice.value) return
  submitError.value = ''
  submitting.value = true
  try {
    pledgeCreated.value = await publicApi.createPledge(invoice.value.event.id, {
      contributorName: name.value,
      contributorPhone: phone.value,
      categoryTag: invoice.value.categoryTag ?? undefined,
    })
  } catch (err) {
    submitError.value = extractErrorMessage(err)
  } finally {
    submitting.value = false
  }
}

function handleSubmit() {
  if (mode.value === 'pay') return handlePay()
  return handlePledge()
}

const pledgePayLink = computed(() =>
  pledgeCreated.value ? `${window.location.origin}/pay/${pledgeCreated.value.secureToken}` : '',
)

async function copyPledgeLink() {
  copiedPledgeLink.value = await copyToClipboard(pledgePayLink.value)
  setTimeout(() => (copiedPledgeLink.value = false), 2000)
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
          We sent a payment prompt to {{ phone }}. Enter your PIN there to complete the payment — this page won't
          update automatically, so you can safely close it once you've confirmed on your phone.
        </p>
      </div>

      <template v-else-if="pledgeCreated">
        <div class="mb-5 text-center">
          <div
            class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700"
          >
            ✓
          </div>
          <h1 class="text-lg font-semibold text-slate-900">Thank you, {{ pledgeCreated.contributorName }}!</h1>
          <p class="mt-1 text-sm text-slate-500">Your pledge has been recorded.</p>
        </div>

        <div class="rounded-xl bg-babyblue-50 p-4 text-sm">
          <p class="mb-2 text-slate-600">Use this link any time you're ready to pay:</p>
          <div class="flex items-center gap-2">
            <input
              readonly
              :value="pledgePayLink"
              class="w-full truncate rounded-lg border border-babyblue-200 bg-white px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              class="shrink-0 rounded-lg border border-babyblue-200 px-2.5 py-1.5 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
              @click="copyPledgeLink"
            >
              {{ copiedPledgeLink ? '✓ Copied!' : 'Copy' }}
            </button>
          </div>
        </div>
      </template>

      <template v-else-if="invoice">
        <div class="mb-1 flex items-center gap-2">
          <img
            v-if="invoice.event.organization?.logoUrl"
            :src="invoice.event.organization.logoUrl"
            alt=""
            class="h-9 w-9 shrink-0 rounded-lg object-cover"
          />
          <span
            v-else
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-babyblue-500 text-sm font-bold text-white"
          >
            OP
          </span>
          <h1 class="text-lg font-semibold text-slate-900">{{ invoice.event.title }}</h1>
        </div>
        <p v-if="invoice.categoryTag" class="ml-11 text-sm text-babyblue-600">{{ invoice.categoryTag }}</p>

        <div v-if="isClosed" class="mt-6 rounded-xl bg-babyblue-50 p-4 text-sm text-slate-700">
          <span v-if="invoice.status === 'PAID'">✅ This invoice has already been paid in full. Thank you!</span>
          <span v-else>⏱️ This invoice has expired.</span>
        </div>

        <template v-else>
          <!-- Pay now / Pledge selector -->
          <div class="mt-6 inline-flex w-full gap-1 rounded-xl bg-babyblue-100/70 p-1">
            <button
              type="button"
              class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="mode === 'pay' ? 'bg-white text-babyblue-700 shadow-sm' : 'text-slate-500 hover:text-babyblue-700'"
              @click="mode = 'pay'"
            >
              💳 Pay now
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="
                mode === 'pledge' ? 'bg-white text-babyblue-700 shadow-sm' : 'text-slate-500 hover:text-babyblue-700'
              "
              @click="mode = 'pledge'"
            >
              🕓 Pledge
            </button>
          </div>

          <form class="mt-4 space-y-4" @submit.prevent="handleSubmit">
            <div v-if="mode === 'pay' && isSingleUse && hasFixedAmount" class="rounded-xl bg-babyblue-50 p-4 text-sm">
              <div class="flex justify-between text-slate-600">
                <span>Requested</span>
                <span>{{ money(invoice.amountRequested) }}</span>
              </div>
              <div v-if="Number(invoice.amountPaid) > 0" class="flex justify-between text-slate-600">
                <span>Already paid</span>
                <span>{{ money(invoice.amountPaid) }}</span>
              </div>
              <div class="mt-1 flex justify-between border-t border-babyblue-100 pt-1 font-semibold text-babyblue-700">
                <span>Remaining</span>
                <span>{{ money(remaining) }}</span>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Your name</label>
              <input
                v-model="name"
                type="text"
                :required="mode === 'pledge'"
                :readonly="nameLocked"
                :class="[
                  'w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none',
                  nameLocked ? 'bg-babyblue-50 text-slate-500' : '',
                ]"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                v-model="email"
                type="email"
                :required="mode === 'pay'"
                :readonly="emailLocked"
                :class="[
                  'w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none',
                  emailLocked ? 'bg-babyblue-50 text-slate-500' : '',
                ]"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700"
                >Phone{{ mode === 'pay' && !isMobileMoneyPush ? ' (optional)' : '' }}</label
              >
              <input
                v-model="phone"
                type="tel"
                :placeholder="isMobileMoneyPush && mode === 'pay' ? 'Include country code' : undefined"
                :required="mode === 'pledge' || (mode === 'pay' && isMobileMoneyPush)"
                :readonly="phoneLocked"
                :class="[
                  'w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none',
                  phoneLocked ? 'bg-babyblue-50 text-slate-500' : '',
                ]"
              />
            </div>

            <div v-if="mode === 'pay'">
              <label class="mb-1 block text-sm font-medium text-slate-700">Amount to pay ({{ currency }})</label>
              <input
                v-model.number="amount"
                type="number"
                step="0.01"
                min="0.01"
                :max="remaining ?? undefined"
                :readonly="isSingleUse && hasFixedAmount && remaining === Number(invoice.amountRequested)"
                required
                class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
              />
              <p v-if="remaining !== null" class="mt-1 text-xs text-slate-500">
                You can pay this off in full or leave a smaller partial amount.
              </p>
              <div
                v-if="feeAmount > 0"
                class="mt-2 space-y-1 rounded-lg bg-babyblue-50 px-3 py-2 text-xs text-slate-600"
              >
                <div class="flex justify-between">
                  <span>Platform fee ({{ invoice.platformFeePercent }}%)</span>
                  <span>{{ money(feeAmount) }}</span>
                </div>
                <div class="flex justify-between font-semibold text-babyblue-700">
                  <span>Total to pay</span>
                  <span>{{ money(totalToPay) }}</span>
                </div>
              </div>
            </div>
            <p v-else class="text-xs text-slate-500">
              No amount needed — this just lets the organizer know you're contributing. You'll get a personal link
              to pay whenever you're ready.
            </p>

            <p v-if="submitError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ submitError }}</p>

            <div v-if="mode === 'pay' && isMobileMoneyPush" class="grid grid-cols-2 gap-2">
              <button
                v-for="operator in mobileMoneyOperators"
                :key="operator.code"
                type="submit"
                :disabled="submitting"
                class="rounded-lg bg-babyblue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="selectedMethod = operator.code"
              >
                {{ submitting && selectedMethod === operator.code ? 'Sending prompt…' : `📱 ${operator.label}` }}
              </button>
            </div>
            <div v-else-if="mode === 'pay'" class="grid grid-cols-2 gap-2">
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
            <button
              v-else
              type="submit"
              :disabled="submitting"
              class="w-full rounded-lg bg-babyblue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ submitting ? 'Submitting…' : 'Submit pledge' }}
            </button>
          </form>
        </template>
      </template>
    </div>
  </div>
</template>
