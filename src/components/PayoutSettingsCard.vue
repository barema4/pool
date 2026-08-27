<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as payoutsApi from '@/api/payouts'
import { extractErrorMessage } from '@/api/client'
import type { Bank, PayoutDetails } from '@/types/api'

const props = withDefaults(
  defineProps<{
    current: PayoutDetails
    title?: string
    description?: string
    autoEditWhenEmpty?: boolean
  }>(),
  { autoEditWhenEmpty: true },
)

const emit = defineEmits<{
  submit: [payload: { bankCode: string; bankName: string; accountNumber: string }]
}>()

const editing = ref(false)
const banks = ref<Bank[]>([])
const banksLoading = ref(false)
const banksError = ref('')

const bankCode = ref('')
const accountNumber = ref('')
const resolvedName = ref('')
const resolving = ref(false)
const resolveError = ref('')
const saving = ref(false)

async function loadBanks() {
  if (banks.value.length > 0) return
  banksLoading.value = true
  banksError.value = ''
  try {
    banks.value = await payoutsApi.listBanks()
  } catch (err) {
    banksError.value = extractErrorMessage(err)
  } finally {
    banksLoading.value = false
  }
}

function startEditing() {
  editing.value = true
  resolvedName.value = ''
  resolveError.value = ''
  loadBanks()
}

function resetAccountEntry() {
  resolvedName.value = ''
  resolveError.value = ''
}

async function handleVerify() {
  resolveError.value = ''
  resolving.value = true
  try {
    const result = await payoutsApi.resolveAccount({
      bankCode: bankCode.value,
      accountNumber: accountNumber.value,
    })
    resolvedName.value = result.accountName
  } catch (err) {
    resolveError.value = extractErrorMessage(err)
  } finally {
    resolving.value = false
  }
}

function bankNameFor(code: string) {
  return banks.value.find((b) => b.code === code)?.name ?? ''
}

async function handleSave() {
  saving.value = true
  try {
    emit('submit', {
      bankCode: bankCode.value,
      bankName: bankNameFor(bankCode.value),
      accountNumber: accountNumber.value,
    })
  } finally {
    saving.value = false
    editing.value = false
    bankCode.value = ''
    accountNumber.value = ''
    resolvedName.value = ''
  }
}

onMounted(() => {
  if (props.autoEditWhenEmpty && !props.current.payoutBankName) startEditing()
})

const inputClass =
  'w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none'
</script>

<template>
  <section class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
    <h2 class="mb-1 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">
      {{ title ?? 'Payout bank account' }}
    </h2>
    <p class="mb-3 text-xs text-slate-500">
      {{ description ?? "This is where money you're paid lands — Paystack pays out directly to this bank account." }}
    </p>

    <template v-if="!editing">
      <div
        v-if="current.payoutBankName"
        class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-babyblue-50 p-3 text-sm"
      >
        <div class="min-w-0">
          <p class="truncate font-medium text-slate-900">{{ current.payoutBankName }}</p>
          <p class="text-xs text-slate-500">
            {{ current.payoutAccountName }} · •••{{ current.payoutAccountLast4 }}
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg border border-babyblue-200 px-2.5 py-1.5 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
          @click="startEditing"
        >
          Change
        </button>
      </div>
      <div v-else class="flex items-center justify-between gap-2 rounded-xl border border-dashed border-babyblue-200 p-3 text-sm">
        <span class="text-slate-500">Not set</span>
        <button
          type="button"
          class="shrink-0 rounded-lg border border-babyblue-200 px-2.5 py-1.5 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
          @click="startEditing"
        >
          + Add bank account
        </button>
      </div>
    </template>

    <template v-else>
      <div v-if="banksLoading" class="text-xs text-slate-400">Loading banks…</div>
      <p v-if="banksError" class="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{{ banksError }}</p>

      <div v-else class="space-y-2">
        <select
          v-model="bankCode"
          :class="inputClass"
          @change="resetAccountEntry"
        >
          <option value="" disabled>Select your bank…</option>
          <option v-for="b in banks" :key="b.code" :value="b.code">{{ b.name }}</option>
        </select>

        <input
          v-model="accountNumber"
          placeholder="Account number"
          :class="inputClass"
          @input="resetAccountEntry"
        />

        <div v-if="resolvedName" class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ Verified: {{ resolvedName }}
        </div>
        <p v-if="resolveError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ resolveError }}</p>

        <div class="flex gap-2">
          <button
            v-if="!resolvedName"
            type="button"
            :disabled="!bankCode || !accountNumber || resolving"
            class="rounded-lg bg-babyblue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleVerify"
          >
            {{ resolving ? 'Verifying…' : 'Verify account' }}
          </button>
          <button
            v-else
            type="button"
            :disabled="saving"
            class="rounded-lg bg-babyblue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleSave"
          >
            {{ saving ? 'Saving…' : 'Save payout details' }}
          </button>
          <button
            v-if="current.payoutBankName"
            type="button"
            class="rounded-lg border border-babyblue-200 px-3 py-2 text-sm font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
            @click="editing = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
