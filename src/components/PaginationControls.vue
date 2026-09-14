<script setup lang="ts">
defineProps<{
  page: number
  totalPages: number
  total: number
}>()

const emit = defineEmits<{ (e: 'update:page', page: number): void }>()
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-2 border-t border-babyblue-100 px-4 py-3 text-xs text-slate-500"
  >
    <span>{{ total }} total · Page {{ page }} of {{ totalPages }}</span>
    <div class="flex gap-2">
      <button
        type="button"
        class="rounded-lg border border-babyblue-200 px-2.5 py-1.5 font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="page <= 1"
        @click="emit('update:page', page - 1)"
      >
        ← Prev
      </button>
      <button
        type="button"
        class="rounded-lg border border-babyblue-200 px-2.5 py-1.5 font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="page >= totalPages"
        @click="emit('update:page', page + 1)"
      >
        Next →
      </button>
    </div>
  </div>
</template>
