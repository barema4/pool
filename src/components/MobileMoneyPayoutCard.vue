<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Organization, MobileMoneyProvider } from '@/types/api'

const props = withDefaults(
  defineProps<{
    current: Pick<Organization, 'payoutMobileProvider' | 'payoutMobileNumberLast4'>
    autoEditWhenEmpty?: boolean
  }>(),
  { autoEditWhenEmpty: true },
)

// No resolve/verify step exists for PawaPay mobile money (unlike Paystack
// bank accounts) — the parent handles the actual save + any error from it,
// this just collects and hands off the input.
const emit = defineEmits<{
  submit: [payload: { provider: MobileMoneyProvider; phoneNumber: string }]
}>()

const editing = ref(false)
const provider = ref<MobileMoneyProvider>('MTN_MOMO_UGA')
const phoneNumber = ref('')

const providerLabels: Record<MobileMoneyProvider, string> = {
  MTN_MOMO_UGA: 'MTN Mobile Money',
  AIRTEL_OAPI_UGA: 'Airtel Money',
}

function startEditing() {
  editing.value = true
}

function handleSave() {
  emit('submit', { provider: provider.value, phoneNumber: phoneNumber.value })
  editing.value = false
  phoneNumber.value = ''
}

onMounted(() => {
  if (props.autoEditWhenEmpty && !props.current.payoutMobileProvider) startEditing()
})

const inputClass =
  'w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none'
</script>

<template>
  <section class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
    <h2 class="mb-1 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Payout mobile money number</h2>
    <p class="mb-3 text-xs text-slate-500">
      Where withdrawals land — a PawaPay payout to this MTN or Airtel number, triggered when you withdraw.
    </p>

    <template v-if="!editing">
      <div
        v-if="current.payoutMobileProvider"
        class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-babyblue-50 p-3 text-sm"
      >
        <div class="min-w-0">
          <p class="truncate font-medium text-slate-900">{{ providerLabels[current.payoutMobileProvider] }}</p>
          <p class="text-xs text-slate-500">•••{{ current.payoutMobileNumberLast4 }}</p>
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
          + Add mobile money number
        </button>
      </div>
    </template>

    <template v-else>
      <div class="space-y-2">
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-700">Network</label>
          <select v-model="provider" :class="inputClass">
            <option value="MTN_MOMO_UGA">MTN Mobile Money</option>
            <option value="AIRTEL_OAPI_UGA">Airtel Money</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-700">Phone number</label>
          <input
            v-model="phoneNumber"
            placeholder="256771234567"
            :class="inputClass"
          />
          <p class="mt-1 text-xs text-slate-500">Digits only, with country code, no leading + or 0.</p>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            :disabled="!phoneNumber"
            class="rounded-lg bg-babyblue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleSave"
          >
            Save mobile money number
          </button>
          <button
            v-if="current.payoutMobileProvider"
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
