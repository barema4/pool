<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import PayoutSettingsCard from '@/components/PayoutSettingsCard.vue'
import * as personalInvoicesApi from '@/api/personalInvoices'
import * as usersApi from '@/api/users'
import { extractErrorMessage } from '@/api/client'
import { formatMoney, formatDate, statusBadgeClass, copyToClipboard } from '@/lib/format'
import type { PersonalInvoice, ShareLinks, UserProfile } from '@/types/api'

const invoices = ref<PersonalInvoice[]>([])
const loading = ref(true)
const loadError = ref('')

const profile = ref<UserProfile | null>(null)
const payoutError = ref('')

const showForm = ref(false)
const recipientName = ref('')
const recipientEmail = ref('')
const recipientPhone = ref('')
const description = ref('')
const amount = ref<number | null>(null)
const expiresInDays = ref<number | null>(null)
const createError = ref('')
const creating = ref(false)

const shareLinksByInvoice = ref<Record<string, ShareLinks>>({})
const shareLoadingId = ref<string | null>(null)
const copiedInvoiceId = ref<string | null>(null)
const emptyShareLinks: ShareLinks = {
  checkoutUrl: '',
  whatsapp: { available: false, url: null },
  email: { available: false, url: null },
}

// The template's expression parser doesn't support optional chaining on a
// computed member access, so nullability is resolved here instead.
function shareLinksFor(invoiceId: string): ShareLinks {
  return shareLinksByInvoice.value[invoiceId] ?? emptyShareLinks
}

async function loadAll() {
  loading.value = true
  loadError.value = ''
  try {
    const [invoiceList, me] = await Promise.all([personalInvoicesApi.listMine(), usersApi.getMe()])
    invoices.value = invoiceList
    profile.value = me
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

async function handleSetPayout(payload: { bankCode: string; bankName: string; accountNumber: string }) {
  payoutError.value = ''
  try {
    profile.value = await usersApi.setPayout(payload)
  } catch (err) {
    payoutError.value = extractErrorMessage(err)
  }
}

async function handleCreate() {
  createError.value = ''
  creating.value = true
  try {
    await personalInvoicesApi.create({
      recipientName: recipientName.value,
      recipientEmail: recipientEmail.value || undefined,
      recipientPhone: recipientPhone.value || undefined,
      description: description.value || undefined,
      amount: amount.value!,
      expiresInDays: expiresInDays.value ?? undefined,
    })
    recipientName.value = ''
    recipientEmail.value = ''
    recipientPhone.value = ''
    description.value = ''
    amount.value = null
    expiresInDays.value = null
    showForm.value = false
    invoices.value = await personalInvoicesApi.listMine()
  } catch (err) {
    createError.value = extractErrorMessage(err)
  } finally {
    creating.value = false
  }
}

async function toggleShareLinks(invoiceId: string) {
  if (shareLinksByInvoice.value[invoiceId]) {
    delete shareLinksByInvoice.value[invoiceId]
    return
  }
  shareLoadingId.value = invoiceId
  try {
    shareLinksByInvoice.value[invoiceId] = await personalInvoicesApi.getShareLinks(invoiceId)
  } catch (err) {
    createError.value = extractErrorMessage(err)
  } finally {
    shareLoadingId.value = null
  }
}

function payLinkFor(secureToken: string) {
  return `${window.location.origin}/i/${secureToken}`
}

async function copyPayLink(invoiceId: string, secureToken: string) {
  const ok = await copyToClipboard(payLinkFor(secureToken))
  if (ok) {
    copiedInvoiceId.value = invoiceId
    setTimeout(() => (copiedInvoiceId.value = null), 2000)
  }
}

const inputClass =
  'w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none'
const primaryButtonClass =
  'rounded-lg bg-babyblue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50'
const outlineButtonClass =
  'rounded-lg border border-babyblue-200 px-2.5 py-1.5 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100'
</script>

<template>
  <DashboardLayout>
    <h1 class="text-2xl font-semibold text-slate-900">Invoices</h1>
    <p class="mb-6 text-sm text-slate-500">
      Bill someone a specific amount and send them a one-time payment link — no organization required.
    </p>

    <div v-if="loading" class="text-sm text-slate-500">Loading…</div>
    <div v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>

    <template v-else>
      <!-- Payout bank account -->
      <div class="mb-8">
        <PayoutSettingsCard
          v-if="profile"
          :current="profile"
          title="Payout bank account"
          description="This is where money from your invoices lands."
          @submit="handleSetPayout"
        />
        <p v-if="payoutError" class="mt-2 text-sm text-red-600">{{ payoutError }}</p>
        <p v-if="profile && !profile.payoutBankName" class="mt-2 text-xs text-amber-600">
          Set this before sending an invoice, or payments will have nowhere to settle.
        </p>
      </div>

      <!-- Invoices -->
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Your invoices</h2>
        <button
          type="button"
          class="rounded-lg border border-babyblue-200 px-3 py-1 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
          @click="showForm = !showForm"
        >
          {{ showForm ? 'Cancel' : '+ New invoice' }}
        </button>
      </div>

      <form
        v-if="showForm"
        class="mb-4 space-y-2 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
        @submit.prevent="handleCreate"
      >
        <input v-model="recipientName" required placeholder="Recipient name" :class="inputClass" />
        <input
          v-model="recipientEmail"
          type="email"
          placeholder="Recipient email (optional)"
          :class="inputClass"
        />
        <input v-model="recipientPhone" placeholder="Recipient phone (optional)" :class="inputClass" />
        <input v-model="description" placeholder="What's this for? (optional)" :class="inputClass" />
        <input
          v-model.number="amount"
          type="number"
          step="0.01"
          required
          placeholder="Amount"
          :class="inputClass"
        />
        <input
          v-model.number="expiresInDays"
          type="number"
          placeholder="Expires in days (optional, default 30)"
          :class="inputClass"
        />
        <p v-if="createError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ createError }}</p>
        <button type="submit" :disabled="creating" :class="primaryButtonClass">
          {{ creating ? 'Creating…' : 'Create invoice' }}
        </button>
      </form>

      <div
        v-if="invoices.length === 0"
        class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
      >
        No invoices yet.
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="inv in invoices"
          :key="inv.id"
          class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate font-medium text-slate-900">{{ inv.recipientName }}</p>
              <p class="text-xs text-slate-500">
                {{ inv.description ?? 'No description' }} · {{ formatMoney(inv.amount) }}
              </p>
              <p class="text-xs text-slate-400">Created {{ formatDate(inv.createdAt) }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="statusBadgeClass(inv.status)">{{
                inv.status
              }}</span>
              <button type="button" :class="outlineButtonClass" @click="toggleShareLinks(inv.id)">
                {{ shareLinksByInvoice[inv.id] ? 'Hide' : 'Share' }}
              </button>
            </div>
          </div>

          <div v-if="shareLoadingId === inv.id" class="mt-2 text-xs text-slate-400">Loading links…</div>
          <div
            v-else-if="shareLinksByInvoice[inv.id]"
            class="mt-3 flex flex-wrap items-center gap-2 border-t border-babyblue-100 pt-3 text-xs"
          >
            <a
              v-if="shareLinksFor(inv.id).whatsapp.available"
              :href="shareLinksFor(inv.id).whatsapp.url || undefined"
              target="_blank"
              rel="noopener"
              class="rounded-lg border border-babyblue-200 px-2.5 py-1.5 font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
            >
              💬 WhatsApp
            </a>
            <a
              v-if="shareLinksFor(inv.id).email.available"
              :href="shareLinksFor(inv.id).email.url || undefined"
              class="rounded-lg border border-babyblue-200 px-2.5 py-1.5 font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
            >
              ✉️ Email
            </a>
            <button
              type="button"
              class="rounded-lg border border-babyblue-200 px-2.5 py-1.5 font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
              @click="copyPayLink(inv.id, inv.secureToken)"
            >
              {{ copiedInvoiceId === inv.id ? '✓ Copied!' : '🔗 Copy pay link' }}
            </button>
          </div>
        </li>
      </ul>
    </template>
  </DashboardLayout>
</template>
