<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Organization, MobileMoneyOperator, MobileMoneyProvider } from '@/types/api'

const props = withDefaults(
  defineProps<{
    current: Pick<Organization, 'payoutMobileProvider' | 'payoutMobileNumberLast4'>
    operators: MobileMoneyOperator[]
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
const provider = ref<MobileMoneyProvider>(props.operators[0]?.code ?? '')
const phoneNumber = ref('')

// The country's operator list can arrive after this component mounts (it's
// fetched from the public supported-countries endpoint) — keep the selected
// network in sync once it does, rather than leaving it stuck on ''.
watch(
  () => props.operators,
  (operators) => {
    if (!operators.some((op) => op.code === provider.value)) {
      provider.value = operators[0]?.code ?? ''
    }
  },
)

const operatorLabels = computed(
  () => Object.fromEntries(props.operators.map((op) => [op.code, op.label])) as Record<string, string>,
)

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
      Where withdrawals land — a PawaPay payout to this mobile money number, triggered when you withdraw.
    </p>

    <template v-if="!editing">
      <div
        v-if="current.payoutMobileProvider"
        class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-babyblue-50 p-3 text-sm"
      >
        <div class="min-w-0">
          <p class="truncate font-medium text-slate-900">
            {{ operatorLabels[current.payoutMobileProvider] ?? current.payoutMobileProvider }}
          </p>
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
            <option v-for="operator in operators" :key="operator.code" :value="operator.code">
              {{ operator.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-700">Phone number</label>
          <input
            v-model="phoneNumber"
            placeholder="Include country code"
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
