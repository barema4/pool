<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import * as publicApi from '@/api/public'
import { extractErrorMessage } from '@/api/client'
import { copyToClipboard } from '@/lib/format'
import type { Invoice } from '@/types/api'

const route = useRoute()
const eventId = route.params.eventId as string

const contributorName = ref('')
const contributorPhone = ref('')
const amountPledged = ref<number | null>(null)
const categoryTag = ref('')

const error = ref('')
const submitting = ref(false)
const created = ref<Invoice | null>(null)
const copied = ref(false)

const payPath = computed(() => (created.value ? `/pay/${created.value.secureToken}` : ''))
const payLink = computed(() => (created.value ? `${window.location.origin}${payPath.value}` : ''))

async function handleSubmit() {
  error.value = ''
  submitting.value = true
  try {
    created.value = await publicApi.createPledge(eventId, {
      contributorName: contributorName.value,
      contributorPhone: contributorPhone.value,
      amountPledged: amountPledged.value!,
      categoryTag: categoryTag.value || undefined,
    })
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    submitting.value = false
  }
}

async function handleCopy() {
  copied.value = await copyToClipboard(payLink.value)
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <div class="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <template v-if="!created">
        <h1 class="text-lg font-semibold text-slate-900">Pledge a contribution</h1>
        <p class="mt-1 text-sm text-slate-500">
          Let the organizers know you're contributing — you can pay now or later using your personal
          link.
        </p>

        <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Your name</label>
            <input
              v-model="contributorName"
              type="text"
              required
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Phone number</label>
            <input
              v-model="contributorPhone"
              type="tel"
              required
              placeholder="+2547..."
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700"
              >Amount you're pledging</label
            >
            <input
              v-model.number="amountPledged"
              type="number"
              step="0.01"
              min="0.01"
              required
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Category (optional)</label>
            <input
              v-model="categoryTag"
              type="text"
              placeholder="e.g. tithe, catering"
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {{ submitting ? 'Submitting…' : 'Submit pledge' }}
          </button>
        </form>
      </template>

      <template v-else>
        <div class="mb-4 text-center">
          <div
            class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700"
          >
            ✓
          </div>
          <h1 class="text-lg font-semibold text-slate-900">
            Thank you, {{ created.contributorName }}!
          </h1>
          <p class="mt-1 text-sm text-slate-500">Your pledge has been recorded.</p>
        </div>

        <div class="rounded-md bg-slate-50 p-3 text-sm">
          <p class="mb-2 text-slate-600">Use this link any time you're ready to pay:</p>
          <div class="flex items-center gap-2">
            <input
              readonly
              :value="payLink"
              class="w-full truncate rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            />
            <button
              type="button"
              class="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100"
              @click="handleCopy"
            >
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>

        <RouterLink
          :to="payPath"
          class="mt-4 block w-full rounded-md bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
        >
          Pay now
        </RouterLink>
      </template>
    </div>
  </div>
</template>
