<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
  }>(),
  {
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    danger: false,
  },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
    @click.self="emit('cancel')"
  >
    <div class="w-full max-w-sm rounded-2xl border border-babyblue-100 bg-white p-6 shadow-lg shadow-babyblue-100/50">
      <h2 class="text-base font-semibold text-slate-900">{{ title }}</h2>
      <p class="mt-2 text-sm text-slate-500">{{ message }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-babyblue-200 px-3 py-2 text-sm font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          :class="[
            'rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors',
            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-babyblue-600 hover:bg-babyblue-700',
          ]"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
