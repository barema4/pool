<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import MobileMoneyPayoutCard from '@/components/MobileMoneyPayoutCard.vue'
import * as adminPlatformPayoutsApi from '@/api/adminPlatformPayouts'
import * as publicApi from '@/api/public'
import { extractErrorMessage } from '@/api/client'
import { formatDate, formatMoney, statusBadgeClass } from '@/lib/format'
import type {
  PlatformPayoutBalance,
  PlatformWithdrawal,
  SupportedCountry,
  MobileMoneyProvider,
} from '@/types/api'

const balances = ref<PlatformPayoutBalance[]>([])
const withdrawals = ref<PlatformWithdrawal[]>([])
const supportedCountries = ref<SupportedCountry[]>([])
const loading = ref(true)
const loadError = ref('')

const operatorsByCountry = computed(() =>
  Object.fromEntries(supportedCountries.value.map((c) => [c.code, c.mobileMoneyOperators])),
)
const labelByCountry = computed(
  () => Object.fromEntries(supportedCountries.value.map((c) => [c.code, c.label])) as Record<string, string>,
)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [b, w, countries] = await Promise.all([
      adminPlatformPayoutsApi.listBalances(),
      adminPlatformPayoutsApi.listWithdrawals(),
      publicApi.listSupportedCountries(),
    ])
    balances.value = b
    withdrawals.value = w
    supportedCountries.value = countries
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function currentFor(balance: PlatformPayoutBalance) {
  return {
    payoutMobileProvider: balance.destination?.payoutMobileProvider ?? null,
    payoutMobileNumberLast4: balance.destination?.payoutMobileNumberLast4 ?? null,
  }
}

const destinationErrors = ref<Record<string, string>>({})

async function handleSetDestination(
  countryCode: string,
  payload: { provider: MobileMoneyProvider; phoneNumber: string },
) {
  destinationErrors.value[countryCode] = ''
  try {
    await adminPlatformPayoutsApi.setDestination(countryCode, payload)
    await load()
  } catch (err) {
    destinationErrors.value[countryCode] = extractErrorMessage(err)
  }
}

const withdrawAmounts = ref<Record<string, number | null>>({})
const withdrawErrors = ref<Record<string, string>>({})
const withdrawingCountry = ref<string | null>(null)

async function handleWithdraw(countryCode: string) {
  const amount = withdrawAmounts.value[countryCode]
  if (!amount) return
  withdrawErrors.value[countryCode] = ''
  withdrawingCountry.value = countryCode
  try {
    await adminPlatformPayoutsApi.requestWithdrawal(countryCode, amount)
    withdrawAmounts.value[countryCode] = null
    await load()
  } catch (err) {
    withdrawErrors.value[countryCode] = extractErrorMessage(err)
  } finally {
    withdrawingCountry.value = null
  }
}
</script>

<template>
  <AdminLayout>
    <h1 class="mb-1 text-2xl font-semibold text-slate-900">Platform payouts</h1>
    <p class="mb-6 text-sm text-slate-500">
      The platform's own accumulated fee revenue, per PawaPay country — separate from any organization's money.
    </p>

    <div v-if="loading" class="text-sm text-slate-500">Loading…</div>
    <div v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>
    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2">
        <section
          v-for="balance in balances"
          :key="balance.countryCode"
          class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
        >
          <div class="mb-3 flex items-baseline justify-between">
            <h2 class="font-medium text-slate-900">{{ balance.label }}</h2>
            <span class="text-lg font-semibold text-babyblue-700">
              {{ formatMoney(balance.balance, balance.currency) }}
            </span>
          </div>

          <MobileMoneyPayoutCard
            :current="currentFor(balance)"
            :operators="operatorsByCountry[balance.countryCode] ?? []"
            :auto-edit-when-empty="false"
            @submit="(payload) => handleSetDestination(balance.countryCode, payload)"
          />
          <p v-if="destinationErrors[balance.countryCode]" class="mt-2 text-sm text-red-600">
            {{ destinationErrors[balance.countryCode] }}
          </p>

          <form
            class="mt-3 flex items-end gap-2 border-t border-babyblue-100 pt-3"
            @submit.prevent="handleWithdraw(balance.countryCode)"
          >
            <div class="flex-1">
              <label class="mb-1 block text-xs font-medium text-slate-700">Withdraw amount</label>
              <input
                v-model.number="withdrawAmounts[balance.countryCode]"
                type="number"
                min="0"
                step="0.01"
                :disabled="!balance.destination || balance.balance <= 0"
                class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none disabled:bg-slate-50"
              />
            </div>
            <button
              type="submit"
              :disabled="!balance.destination || balance.balance <= 0 || withdrawingCountry === balance.countryCode"
              class="shrink-0 rounded-lg bg-babyblue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ withdrawingCountry === balance.countryCode ? 'Withdrawing…' : 'Withdraw' }}
            </button>
          </form>
          <p v-if="withdrawErrors[balance.countryCode]" class="mt-2 text-sm text-red-600">
            {{ withdrawErrors[balance.countryCode] }}
          </p>
        </section>
      </div>

      <h2 class="mt-8 mb-3 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Withdrawal history</h2>
      <div
        v-if="withdrawals.length === 0"
        class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
      >
        No platform withdrawals yet.
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="w in withdrawals"
          :key="w.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
        >
          <div>
            <p class="font-medium text-slate-900">
              {{ labelByCountry[w.countryCode] ?? w.countryCode }} · {{ formatMoney(w.amount) }}
            </p>
            <p class="text-xs text-slate-500">
              {{ formatDate(w.createdAt) }}
              <span v-if="w.failureReason"> · {{ w.failureReason }}</span>
            </p>
          </div>
          <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="statusBadgeClass(w.status)">
            {{ w.status }}
          </span>
        </li>
      </ul>
    </template>
  </AdminLayout>
</template>
