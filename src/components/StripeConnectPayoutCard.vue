<script setup lang="ts">
defineProps<{
  current: { stripeConnectAccountId: string | null; stripeConnectPayoutsEnabled: boolean }
  connecting?: boolean
}>()

// No form data to collect — Stripe Connect's Express onboarding is a single
// hosted redirect, so this just tells the parent to fetch the link and
// navigate there (mirrors PayoutSettingsCard/MobileMoneyPayoutCard's
// emit-and-let-the-parent-call-the-API shape, just with no payload).
defineEmits<{ onboard: [] }>()
</script>

<template>
  <section class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
    <h2 class="mb-1 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Stripe payout account</h2>
    <p class="mb-3 text-xs text-slate-500">Where money you're paid lands — Stripe pays out directly to this connected account.</p>

    <div
      v-if="current.stripeConnectPayoutsEnabled"
      class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-babyblue-50 p-3 text-sm"
    >
      <span class="font-medium text-slate-900">✓ Connected and ready for payouts</span>
      <button
        type="button"
        :disabled="connecting"
        class="shrink-0 rounded-lg border border-babyblue-200 px-2.5 py-1.5 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100 disabled:cursor-not-allowed disabled:opacity-50"
        @click="$emit('onboard')"
      >
        {{ connecting ? 'Opening…' : 'Manage on Stripe' }}
      </button>
    </div>
    <div
      v-else-if="current.stripeConnectAccountId"
      class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-babyblue-200 p-3 text-sm"
    >
      <span class="text-slate-500">Onboarding started but not finished yet</span>
      <button
        type="button"
        :disabled="connecting"
        class="shrink-0 rounded-lg bg-babyblue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="$emit('onboard')"
      >
        {{ connecting ? 'Opening…' : 'Continue onboarding' }}
      </button>
    </div>
    <div v-else class="flex items-center justify-between gap-2 rounded-xl border border-dashed border-babyblue-200 p-3 text-sm">
      <span class="text-slate-500">Not connected</span>
      <button
        type="button"
        :disabled="connecting"
        class="shrink-0 rounded-lg bg-babyblue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="$emit('onboard')"
      >
        {{ connecting ? 'Opening…' : 'Connect with Stripe' }}
      </button>
    </div>
  </section>
</template>
