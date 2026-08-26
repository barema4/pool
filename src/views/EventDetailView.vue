<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { useEventStore } from '@/stores/event'
import * as budgetCategoriesApi from '@/api/budgetCategories'
import * as invoicesApi from '@/api/invoices'
import { extractErrorMessage } from '@/api/client'
import { formatMoney, formatDate, copyToClipboard } from '@/lib/format'
import type { EventStatus, ShareLinks, ContributorSummary } from '@/types/api'

const route = useRoute()
const eventId = route.params.eventId as string
const store = useEventStore()

type Tab = 'overview' | 'budget' | 'invoices' | 'transactions' | 'contributors'
const activeTab = ref<Tab>('overview')
const tabs: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'budget', label: 'Budget Categories' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'contributors', label: 'Contributors' },
]

const loadError = ref('')

onMounted(async () => {
  try {
    await store.load(eventId)
    title.value = store.event?.title ?? ''
    description.value = store.event?.description ?? ''
    coverImageUrl.value = store.event?.coverImageUrl ?? ''
    targetGoal.value = store.event?.targetGoal ? Number(store.event.targetGoal) : null
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  }
})

// --- Overview ---
const title = ref('')
const description = ref('')
const coverImageUrl = ref('')
const targetGoal = ref<number | null>(null)
const overviewError = ref('')
const savingOverview = ref(false)
const statuses: EventStatus[] = ['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED']

async function handleSaveOverview() {
  overviewError.value = ''
  savingOverview.value = true
  try {
    await store.updateEvent({
      title: title.value,
      description: description.value || undefined,
      // The backend's @IsOptional() only skips validation for a genuinely
      // missing field — an empty string still runs through @IsUrl() and
      // fails, so this must be omitted rather than sent blank.
      coverImageUrl: coverImageUrl.value || undefined,
      targetGoal: targetGoal.value ?? undefined,
    })
  } catch (err) {
    overviewError.value = extractErrorMessage(err)
  } finally {
    savingOverview.value = false
  }
}

async function handleStatusChange(status: EventStatus) {
  try {
    await store.updateStatus(status)
  } catch (err) {
    overviewError.value = extractErrorMessage(err)
  }
}

// --- Budget categories ---
const newCategoryName = ref('')
const newCategoryCost = ref<number | null>(null)
const categoryError = ref('')
const creatingCategory = ref(false)
const allocatingCategoryId = ref<string | null>(null)
const allocateTransactionId = ref('')
const allocateAmount = ref<number | null>(null)
const allocateError = ref('')

const successfulTransactions = computed(() =>
  store.transactions.filter((t) => t.status === 'SUCCESS'),
)

async function handleCreateCategory() {
  categoryError.value = ''
  creatingCategory.value = true
  try {
    await budgetCategoriesApi.create({
      eventId,
      name: newCategoryName.value,
      estimatedCost: newCategoryCost.value ?? undefined,
    })
    newCategoryName.value = ''
    newCategoryCost.value = null
    await store.refreshBudgetCategories()
  } catch (err) {
    categoryError.value = extractErrorMessage(err)
  } finally {
    creatingCategory.value = false
  }
}

function openAllocate(categoryId: string) {
  allocatingCategoryId.value = allocatingCategoryId.value === categoryId ? null : categoryId
  allocateTransactionId.value = ''
  allocateAmount.value = null
  allocateError.value = ''
}

async function handleAllocate(categoryId: string) {
  allocateError.value = ''
  try {
    await budgetCategoriesApi.allocate(categoryId, {
      transactionId: allocateTransactionId.value,
      amount: allocateAmount.value!,
    })
    allocatingCategoryId.value = null
    await store.refreshBudgetCategories()
  } catch (err) {
    allocateError.value = extractErrorMessage(err)
  }
}

// --- Invoices ---
const showInvoiceForm = ref(false)
const invContributorName = ref('')
const invContributorEmail = ref('')
const invContributorPhone = ref('')
const invAmountRequested = ref<number | null>(null)
const invCategoryTag = ref('')
const invIsPermanent = ref(false)
const invoiceError = ref('')
const creatingInvoice = ref(false)
const shareLinksByInvoice = ref<Record<string, ShareLinks>>({})
const shareLoadingId = ref<string | null>(null)
const copiedInvoiceId = ref<string | null>(null)
const emptyShareLinks: ShareLinks = {
  checkoutUrl: '',
  whatsapp: { available: false, url: null },
  email: { available: false, url: null },
}

// The template's expression parser doesn't support optional chaining on a
// computed member access (e.g. `record[id]?.foo`), so nullability is
// resolved here instead — this always returns a safe, fully-shaped object.
function shareLinksFor(invoiceId: string): ShareLinks {
  return shareLinksByInvoice.value[invoiceId] ?? emptyShareLinks
}

async function handleCreateInvoice() {
  invoiceError.value = ''
  creatingInvoice.value = true
  try {
    await invoicesApi.create({
      eventId,
      contributorName: invContributorName.value || undefined,
      contributorEmail: invContributorEmail.value || undefined,
      contributorPhone: invContributorPhone.value || undefined,
      amountRequested: invAmountRequested.value ?? undefined,
      categoryTag: invCategoryTag.value || undefined,
      isPermanent: invIsPermanent.value,
    })
    invContributorName.value = ''
    invContributorEmail.value = ''
    invContributorPhone.value = ''
    invAmountRequested.value = null
    invCategoryTag.value = ''
    invIsPermanent.value = false
    showInvoiceForm.value = false
    await store.refreshInvoices()
  } catch (err) {
    invoiceError.value = extractErrorMessage(err)
  } finally {
    creatingInvoice.value = false
  }
}

function payLinkFor(secureToken: string) {
  return `${window.location.origin}/pay/${secureToken}`
}

async function toggleShareLinks(invoiceId: string) {
  if (shareLinksByInvoice.value[invoiceId]) {
    delete shareLinksByInvoice.value[invoiceId]
    return
  }
  shareLoadingId.value = invoiceId
  try {
    shareLinksByInvoice.value[invoiceId] = await invoicesApi.getShareLinks(invoiceId)
  } catch (err) {
    invoiceError.value = extractErrorMessage(err)
  } finally {
    shareLoadingId.value = null
  }
}

async function copyPayLink(invoiceId: string, secureToken: string) {
  const ok = await copyToClipboard(payLinkFor(secureToken))
  if (ok) {
    copiedInvoiceId.value = invoiceId
    setTimeout(() => (copiedInvoiceId.value = null), 2000)
  }
}

// --- Contributors ---
const contributorSummary = ref<ContributorSummary | null>(null)
const contributorsError = ref('')
const contributorsLoading = ref(false)
const copiedSummary = ref(false)

async function loadContributors() {
  contributorsLoading.value = true
  contributorsError.value = ''
  try {
    contributorSummary.value = await invoicesApi.getContributors(eventId)
  } catch (err) {
    contributorsError.value = extractErrorMessage(err)
  } finally {
    contributorsLoading.value = false
  }
}

function selectTab(tab: Tab) {
  activeTab.value = tab
  if (tab === 'contributors' && !contributorSummary.value) loadContributors()
}

async function handleCopySummary() {
  if (!contributorSummary.value) return
  copiedSummary.value = await copyToClipboard(contributorSummary.value.text)
  setTimeout(() => (copiedSummary.value = false), 2000)
}
</script>

<template>
  <DashboardLayout>
    <div v-if="store.loading" class="text-sm text-slate-500">Loading…</div>
    <div v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>

    <template v-else-if="store.event">
      <h1 class="mb-1 text-xl font-semibold text-slate-900">{{ store.event.title }}</h1>
      <p class="mb-6 text-sm text-slate-500">
        {{ store.event.isPermanent ? 'Permanent collection' : 'Milestone event' }} ·
        {{ store.event.status }}
      </p>

      <div class="mb-6 flex gap-1 border-b border-slate-200">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="border-b-2 px-3 py-2 text-sm font-medium"
          :class="
            activeTab === tab.key
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          "
          @click="selectTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- OVERVIEW -->
      <section v-if="activeTab === 'overview'" class="max-w-lg space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input
            v-model="title"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            v-model="description"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Cover image URL</label>
          <input
            v-model="coverImageUrl"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Target goal</label>
          <input
            v-model.number="targetGoal"
            type="number"
            step="0.01"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <p v-if="overviewError" class="text-sm text-red-600">{{ overviewError }}</p>
        <button
          type="button"
          :disabled="savingOverview"
          class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          @click="handleSaveOverview"
        >
          {{ savingOverview ? 'Saving…' : 'Save changes' }}
        </button>

        <div class="pt-4">
          <label class="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select
            :value="store.event.status"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm"
            @change="handleStatusChange(($event.target as HTMLSelectElement).value as EventStatus)"
          >
            <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </section>

      <!-- BUDGET CATEGORIES -->
      <section v-else-if="activeTab === 'budget'">
        <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="handleCreateCategory">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Category name</label>
            <input
              v-model="newCategoryName"
              required
              class="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Estimated cost</label>
            <input
              v-model.number="newCategoryCost"
              type="number"
              step="0.01"
              class="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            :disabled="creatingCategory"
            class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {{ creatingCategory ? 'Adding…' : 'Add category' }}
          </button>
        </form>
        <p v-if="categoryError" class="mb-3 text-sm text-red-600">{{ categoryError }}</p>

        <div v-if="store.budgetCategories.length === 0" class="text-sm text-slate-500">
          No budget categories yet.
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="cat in store.budgetCategories"
            :key="cat.id"
            class="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">{{ cat.name }}</p>
                <p class="text-xs text-slate-500">
                  {{ formatMoney(cat.allocatedFunds) }} allocated of
                  {{ formatMoney(cat.estimatedCost) }} estimated
                </p>
              </div>
              <button
                type="button"
                class="text-xs font-medium text-slate-600 underline"
                @click="openAllocate(cat.id)"
              >
                {{ allocatingCategoryId === cat.id ? 'Cancel' : 'Allocate a transaction' }}
              </button>
            </div>

            <form
              v-if="allocatingCategoryId === cat.id"
              class="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"
              @submit.prevent="handleAllocate(cat.id)"
            >
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700"
                  >Settled transaction</label
                >
                <select
                  v-model="allocateTransactionId"
                  required
                  class="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="" disabled>Select…</option>
                  <option v-for="t in successfulTransactions" :key="t.id" :value="t.id">
                    {{ t.providerReference }} — {{ formatMoney(t.amountSettled) }}
                  </option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700">Amount</label>
                <input
                  v-model.number="allocateAmount"
                  type="number"
                  step="0.01"
                  required
                  class="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Allocate
              </button>
            </form>
            <p
              v-if="allocatingCategoryId === cat.id && allocateError"
              class="mt-2 text-sm text-red-600"
            >
              {{ allocateError }}
            </p>
          </li>
        </ul>
      </section>

      <!-- INVOICES -->
      <section v-else-if="activeTab === 'invoices'">
        <div class="mb-4 flex justify-end">
          <button
            type="button"
            class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            @click="showInvoiceForm = !showInvoiceForm"
          >
            {{ showInvoiceForm ? 'Cancel' : 'New invoice' }}
          </button>
        </div>

        <form
          v-if="showInvoiceForm"
          class="mb-4 space-y-2 rounded-lg border border-slate-200 bg-white p-4"
          @submit.prevent="handleCreateInvoice"
        >
          <input
            v-model="invContributorName"
            placeholder="Contributor name (optional)"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            v-model="invContributorEmail"
            type="email"
            placeholder="Contributor email (optional)"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            v-model="invContributorPhone"
            placeholder="Contributor phone (optional)"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            v-model.number="invAmountRequested"
            type="number"
            step="0.01"
            :placeholder="
              invIsPermanent ? 'Amount (optional for permanent links)' : 'Amount requested'
            "
            :required="!invIsPermanent"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            v-model="invCategoryTag"
            placeholder="Category tag (optional)"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <label class="flex items-center gap-2 text-sm text-slate-700">
            <input v-model="invIsPermanent" type="checkbox" />
            Permanent link (reusable, no expiry)
          </label>
          <p v-if="invoiceError" class="text-sm text-red-600">{{ invoiceError }}</p>
          <button
            type="submit"
            :disabled="creatingInvoice"
            class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {{ creatingInvoice ? 'Creating…' : 'Create invoice' }}
          </button>
        </form>

        <div v-if="store.invoices.length === 0" class="text-sm text-slate-500">
          No invoices yet.
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="inv in store.invoices"
            :key="inv.id"
            class="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">
                  {{ inv.contributorName ?? 'Open link' }}
                  <span class="ml-1 text-xs font-normal text-slate-400">({{ inv.source }})</span>
                </p>
                <p class="text-xs text-slate-500">
                  {{ formatMoney(inv.amountPaid) }}
                  <span v-if="inv.amountRequested"> of {{ formatMoney(inv.amountRequested) }}</span>
                </p>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                  >{{ inv.status }}</span
                >
                <button
                  type="button"
                  class="text-xs font-medium text-slate-600 underline"
                  @click="toggleShareLinks(inv.id)"
                >
                  {{ shareLinksByInvoice[inv.id] ? 'Hide' : 'Share' }}
                </button>
              </div>
            </div>

            <div v-if="shareLoadingId === inv.id" class="mt-2 text-xs text-slate-400">
              Loading links…
            </div>
            <div
              v-else-if="shareLinksByInvoice[inv.id]"
              class="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs"
            >
              <a
                v-if="shareLinksFor(inv.id).whatsapp.available"
                :href="shareLinksFor(inv.id).whatsapp.url || undefined"
                target="_blank"
                rel="noopener"
                class="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100"
              >
                WhatsApp
              </a>
              <a
                v-if="shareLinksFor(inv.id).email.available"
                :href="shareLinksFor(inv.id).email.url || undefined"
                class="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100"
              >
                Email
              </a>
              <button
                type="button"
                class="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100"
                @click="copyPayLink(inv.id, inv.secureToken)"
              >
                {{ copiedInvoiceId === inv.id ? 'Copied!' : 'Copy pay link' }}
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- TRANSACTIONS -->
      <section v-else-if="activeTab === 'transactions'">
        <div v-if="store.transactions.length === 0" class="text-sm text-slate-500">
          No transactions yet.
        </div>
        <table v-else class="w-full text-left text-sm">
          <thead class="text-xs uppercase text-slate-500">
            <tr>
              <th class="pb-2">Reference</th>
              <th class="pb-2">Rail</th>
              <th class="pb-2">Amount</th>
              <th class="pb-2">Status</th>
              <th class="pb-2">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="t in store.transactions" :key="t.id">
              <td class="py-2 font-mono text-xs">{{ t.providerReference }}</td>
              <td class="py-2">{{ t.paymentRail === 'MOBILE_MONEY' ? 'Mobile Money' : 'Card' }}</td>
              <td class="py-2">{{ formatMoney(t.amountSettled) }}</td>
              <td class="py-2">{{ t.status }}</td>
              <td class="py-2 text-xs text-slate-500">{{ formatDate(t.timestamp) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- CONTRIBUTORS -->
      <section v-else-if="activeTab === 'contributors'">
        <div v-if="contributorsLoading" class="text-sm text-slate-500">Loading…</div>
        <div v-else-if="contributorsError" class="text-sm text-red-600">
          {{ contributorsError }}
        </div>
        <template v-else-if="contributorSummary">
          <div class="mb-4 flex items-center justify-between">
            <div class="flex gap-4 text-sm">
              <span class="text-slate-600"
                >Pledged:
                <strong>{{ formatMoney(contributorSummary.totals.pledged) }}</strong></span
              >
              <span class="text-slate-600"
                >Received:
                <strong>{{ formatMoney(contributorSummary.totals.received) }}</strong></span
              >
            </div>
            <button
              type="button"
              class="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
              @click="handleCopySummary"
            >
              {{ copiedSummary ? 'Copied!' : 'Copy WhatsApp summary' }}
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <h3 class="mb-2 text-xs font-semibold uppercase text-green-700">Fully Paid</h3>
              <ul class="space-y-1 text-sm">
                <li v-for="c in contributorSummary.buckets.fullyPaid" :key="c.invoiceId">
                  {{ c.contributorName ?? 'Anonymous' }} — {{ formatMoney(c.amountPaid) }}
                  <span v-if="c.contributorPhone" class="text-xs text-slate-400"
                    >({{ c.contributorPhone }})</span
                  >
                </li>
              </ul>
            </div>
            <div>
              <h3 class="mb-2 text-xs font-semibold uppercase text-amber-700">Partially Paid</h3>
              <ul class="space-y-1 text-sm">
                <li v-for="c in contributorSummary.buckets.partiallyPaid" :key="c.invoiceId">
                  {{ c.contributorName ?? 'Anonymous' }} — {{ formatMoney(c.amountPaid) }} of
                  {{ formatMoney(c.amountRequested) }}
                  <span v-if="c.contributorPhone" class="text-xs text-slate-400"
                    >({{ c.contributorPhone }})</span
                  >
                </li>
              </ul>
            </div>
            <div>
              <h3 class="mb-2 text-xs font-semibold uppercase text-slate-700">Pledged</h3>
              <ul class="space-y-1 text-sm">
                <li v-for="c in contributorSummary.buckets.pledged" :key="c.invoiceId">
                  {{ c.contributorName ?? 'Anonymous' }} — {{ formatMoney(c.amountRequested) }}
                  <span v-if="c.contributorPhone" class="text-xs text-slate-400"
                    >({{ c.contributorPhone }})</span
                  >
                </li>
              </ul>
            </div>
          </div>
        </template>
      </section>
    </template>
  </DashboardLayout>
</template>
