<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { copyToClipboard } from '@/lib/format'

const props = defineProps<{ token: string; eventId: string }>()

const copied = ref(false)
const link = computed(() => `${window.location.origin}/pay/${props.token}`)

async function handleCopy() {
  copied.value = await copyToClipboard(link.value)
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="rounded-2xl border border-green-200 bg-green-50 p-4">
    <p class="mb-2 text-sm font-semibold text-green-800">🎉 Your collection is live — share this link:</p>
    <div class="flex items-center gap-2">
      <input
        readonly
        :value="link"
        class="w-full truncate rounded-lg border border-green-200 bg-white px-2 py-1.5 text-xs"
      />
      <button
        type="button"
        class="shrink-0 rounded-lg bg-babyblue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700"
        @click="handleCopy"
      >
        {{ copied ? '✓ Copied!' : 'Copy' }}
      </button>
    </div>
    <RouterLink
      :to="{ name: 'event-detail', params: { eventId } }"
      class="mt-2 inline-block text-xs font-medium text-babyblue-700 hover:underline"
    >
      Go to event →
    </RouterLink>
  </div>
</template>
