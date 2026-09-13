<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import PayoutSettingsCard from '@/components/PayoutSettingsCard.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useEventStore } from '@/stores/event'
import * as budgetCategoriesApi from '@/api/budgetCategories'
import * as invoicesApi from '@/api/invoices'
import * as transactionsApi from '@/api/transactions'
import { extractErrorMessage } from '@/api/client'
import { formatMoney, formatDate, copyToClipboard, statusBadgeClass, currencyForCountry } from '@/lib/format'
import type { EventStatus, ShareLinks, ContributorSummary } from '@/types/api'

const route = useRoute()
const eventId = route.params.eventId as string
const store = useEventStore()

type Tab = 'overview' | 'budget' | 'invoices' | 'transactions' | 'contributors'
const activeTab = ref<Tab>('overview')
const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📋' },
  { key: 'budget', label: 'Budget', icon: '💰' },
  { key: 'invoices', label: 'Links', icon: '🔗' },
  { key: 'transactions', label: 'Transactions', icon: '💳' },
  { key: 'contributors', label: 'Contributors', icon: '👥' },
]

const loadError = ref('')

// Both KES (Kenya) and UGX (Uganda) events exist now — always show which one
// an amount is in rather than a bare number.
const currency = computed(() => currencyForCountry(store.event?.organization?.country))
function money(value: string | number | null | undefined): string {
  return formatMoney(value, currency.value)
}

const totalReceived = computed(() =>
  store.transactions
    .filter((t) => t.status === 'SUCCESS')
    .reduce((sum, t) => sum + Number(t.amountSettled), 0),
)
const goalProgressPct = computed(() => {
  if (!store.event?.targetGoal) return null
  const goal = Number(store.event.targetGoal)
  if (goal <= 0) return null
  return Math.min(100, Math.round((totalReceived.value / goal) * 100))
})

// --- Budget pool (received / allocated / remaining) ---
const totalAllocated = computed(() =>
  store.budgetCategories.reduce((sum, c) => sum + Number(c.allocatedFunds), 0),
)
const remainingToAllocate = computed(() => totalReceived.value - totalAllocated.value)
const allocatedProgressPct = computed(() => {
  if (totalReceived.value <= 0) return 0
  return Math.min(100, Math.round((totalAllocated.value / totalReceived.value) * 100))
})

onMounted(async () => {
  try {
    await store.load(eventId)
    title.value = store.event?.title ?? ''
    description.value = store.event?.description ?? ''
    coverImageUrl.value = store.event?.coverImageUrl ?? ''
    targetGoal.value = store.event?.targetGoal ? Number(store.event.targetGoal) : null
    if (primaryLink.value) await toggleShareLinks(primaryLink.value.id)
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

const payoutError = ref('')

async function handleSetPayout(payload: { bankCode: string; bankName: string; accountNumber: string }) {
  payoutError.value = ''
  try {
    await store.setPayout(payload)
  } catch (err) {
    payoutError.value = extractErrorMessage(err)
  }
}

// --- Budget: on/off toggle ---
const budgetingError = ref('')
const togglingBudgeting = ref(false)

async function handleToggleBudgeting() {
  if (!store.event) return
  budgetingError.value = ''
  togglingBudgeting.value = true
  try {
    await store.setBudgetingEnabled(!store.event.budgetingEnabled)
  } catch (err) {
    budgetingError.value = extractErrorMessage(err)
  } finally {
    togglingBudgeting.value = false
  }
}

// --- Budget: wedding template ---
// Standard wedding budget breakdown (venue/catering/photography/etc. — see
// 2026 wedding-budget-percentage research), applied as a % of the event's
// target goal. Only offered while the category list is empty, so it never
// collides with categories someone already created by hand.
const WEDDING_TEMPLATE: { name: string; pct: number }[] = [
  { name: 'Venue & Catering', pct: 0.45 },
  { name: 'Photography & Video', pct: 0.12 },
  { name: 'Attire', pct: 0.08 },
  { name: 'Decor & Flowers', pct: 0.1 },
  { name: 'Music & Entertainment', pct: 0.06 },
  { name: 'Stationery', pct: 0.03 },
  { name: 'Cake & Favors', pct: 0.03 },
  { name: 'Contingency', pct: 0.13 },
]
const applyingTemplate = ref(false)
const templateError = ref('')

async function applyWeddingTemplate() {
  templateError.value = ''
  applyingTemplate.value = true
  const goal = store.event?.targetGoal ? Number(store.event.targetGoal) : 0
  try {
    for (const item of WEDDING_TEMPLATE) {
      await budgetCategoriesApi.create({
        eventId,
        name: item.name,
        estimatedCost: goal > 0 ? Math.round(goal * item.pct) : undefined,
      })
    }
    await store.refreshBudgetCategories()
  } catch (err) {
    templateError.value = extractErrorMessage(err)
  } finally {
    applyingTemplate.value = false
  }
}

// --- Budget categories ---
const newCategoryName = ref('')
const newCategoryCost = ref<number | null>(null)
const categoryError = ref('')
const creatingCategory = ref(false)
const allocatingCategoryId = ref<string | null>(null)
const allocateAmount = ref<number | null>(null)
const allocateError = ref('')

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
  editingCategoryId.value = null
  allocatingCategoryId.value = allocatingCategoryId.value === categoryId ? null : categoryId
  allocateAmount.value = null
  allocateError.value = ''
}

// --- Budget category editing (name / estimated cost) ---
const editingCategoryId = ref<string | null>(null)
const editName = ref('')
const editCost = ref<number | null>(null)
const editError = ref('')
const savingEdit = ref(false)

function openEdit(category: { id: string; name: string; estimatedCost: string }) {
  allocatingCategoryId.value = null
  if (editingCategoryId.value === category.id) {
    editingCategoryId.value = null
    return
  }
  editingCategoryId.value = category.id
  editName.value = category.name
  editCost.value = Number(category.estimatedCost) || null
  editError.value = ''
}

async function handleSaveEdit(categoryId: string) {
  editError.value = ''
  savingEdit.value = true
  try {
    await budgetCategoriesApi.update(categoryId, {
      name: editName.value,
      estimatedCost: editCost.value ?? undefined,
    })
    editingCategoryId.value = null
    await store.refreshBudgetCategories()
  } catch (err) {
    editError.value = extractErrorMessage(err)
  } finally {
    savingEdit.value = false
  }
}

// Quick-fills the amount input with as much as can usefully go to this
// category right now: capped by both what's left in the event's pool and
// (if the category has an estimated cost) what it still needs.
function fillRemainingFor(category: { estimatedCost: string; allocatedFunds: string }) {
  const est = Number(category.estimatedCost)
  const stillNeeded = est > 0 ? Math.max(est - Number(category.allocatedFunds), 0) : Infinity
  allocateAmount.value = Math.max(Math.min(remainingToAllocate.value, stillNeeded), 0)
}

async function handleAllocate(categoryId: string) {
  allocateError.value = ''
  if (allocateAmount.value !== null && allocateAmount.value > remainingToAllocate.value) {
    allocateError.value = `Only ${money(remainingToAllocate.value)} is left unallocated for this event.`
    return
  }
  try {
    await budgetCategoriesApi.allocate(categoryId, { amount: allocateAmount.value! })
    allocatingCategoryId.value = null
    await store.refreshBudgetCategories()
  } catch (err) {
    allocateError.value = extractErrorMessage(err)
  }
}

const deletingCategoryId = ref<string | null>(null)
const deleteError = ref('')
// Separate from deletingCategoryId (a loading flag, cleared in `finally`
// before the error message would ever get a chance to render against it).
const deleteErrorCategoryId = ref<string | null>(null)
const categoryPendingDelete = ref<{ id: string; name: string } | null>(null)
const deleteConfirmMessage = computed(() =>
  categoryPendingDelete.value
    ? `Delete "${categoryPendingDelete.value.name}"? Any funds allocated to it return to the unallocated pool.`
    : '',
)

function handleDeleteCategory(category: { id: string; name: string }) {
  categoryPendingDelete.value = category
}

async function confirmDeleteCategory() {
  const category = categoryPendingDelete.value
  if (!category) return
  categoryPendingDelete.value = null
  deleteError.value = ''
  deleteErrorCategoryId.value = null
  deletingCategoryId.value = category.id
  try {
    await budgetCategoriesApi.remove(category.id)
    await store.refreshBudgetCategories()
  } catch (err) {
    deleteError.value = extractErrorMessage(err)
    deleteErrorCategoryId.value = category.id
  } finally {
    deletingCategoryId.value = null
  }
}

function categoryProgressPct(allocated: string, estimated: string): number {
  const est = Number(estimated)
  if (est <= 0) return 0
  return Math.min(100, Math.round((Number(allocated) / est) * 100))
}

// --- Invoices ---
// The event's own default link (auto-created alongside the event — see
// EventsService#create) is permanent and has no expiry; it's always the
// earliest such link. Surfacing it up front means a quick-collection
// organizer never has to hunt through "+ Generate link" for the one link
// they already have — they just copy it.
const primaryLink = computed(() => {
  const permanent = store.invoices
    .filter((inv) => inv.expiresAt === null)
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return permanent[0] ?? null
})
const otherInvoices = computed(() =>
  store.invoices.filter((inv) => inv.id !== primaryLink.value?.id),
)

const showInvoiceForm = ref(false)
const showLinkCustomize = ref(false)
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
    showLinkCustomize.value = false
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

// --- Manual contributions (cash, or money sent directly to the org's own
// mobile money number instead of through this app) ---
const showManualForm = ref(false)
const manualAmount = ref<number | null>(null)
const manualNote = ref('')
const manualError = ref('')
const recordingManual = ref(false)

function railLabel(rail: string): string {
  if (rail === 'MOBILE_MONEY') return 'Mobile Money'
  if (rail === 'MANUAL') return 'Manual'
  return 'Card'
}

async function handleRecordManual() {
  manualError.value = ''
  recordingManual.value = true
  try {
    await transactionsApi.recordManual({
      eventId,
      amount: manualAmount.value!,
      note: manualNote.value || undefined,
    })
    manualAmount.value = null
    manualNote.value = ''
    showManualForm.value = false
    await store.refreshTransactions()
  } catch (err) {
    manualError.value = extractErrorMessage(err)
  } finally {
    recordingManual.value = false
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

const inputClass =
  'w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none'
const primaryButtonClass =
  'rounded-lg bg-babyblue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50'
const outlineButtonClass =
  'rounded-lg border border-babyblue-200 px-3 py-1.5 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100'
</script>

<template>
  <DashboardLayout>
    <div v-if="store.loading" class="text-sm text-slate-500">Loading…</div>
    <div v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>

    <template v-else-if="store.event">
      <!-- Header card -->
      <div class="mb-6 rounded-2xl border border-babyblue-100 bg-white p-5 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">{{ store.event.title }}</h1>
            <p class="mt-1 text-sm text-slate-500">
              {{ store.event.isPermanent ? '🔁 Permanent collection' : '🎉 Milestone event' }}
            </p>
          </div>
          <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="statusBadgeClass(store.event.status)">
            {{ store.event.status }}
          </span>
        </div>

        <div v-if="goalProgressPct !== null" class="mt-4">
          <div class="mb-1 flex justify-between text-xs text-slate-500">
            <span>{{ money(totalReceived) }} raised of {{ money(store.event.targetGoal) }}</span>
            <span class="font-medium text-babyblue-700">{{ goalProgressPct }}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-babyblue-100">
            <div
              class="h-full rounded-full bg-babyblue-500 transition-all"
              :style="{ width: `${goalProgressPct}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Segmented tab bar -->
      <div class="mb-6 inline-flex flex-wrap gap-1 rounded-xl bg-babyblue-100/70 p-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
          :class="
            activeTab === tab.key
              ? 'bg-white text-babyblue-700 shadow-sm'
              : 'text-slate-500 hover:text-babyblue-700'
          "
          @click="selectTab(tab.key)"
        >
          <span aria-hidden="true">{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>

      <!-- OVERVIEW -->
      <section v-if="activeTab === 'overview'" class="max-w-lg space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input v-model="title" :class="inputClass" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea v-model="description" :class="inputClass" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Cover image URL</label>
          <input v-model="coverImageUrl" :class="inputClass" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Target goal</label>
          <input v-model.number="targetGoal" type="number" step="0.01" :class="inputClass" />
        </div>
        <p v-if="overviewError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ overviewError }}</p>
        <button type="button" :disabled="savingOverview" :class="primaryButtonClass" @click="handleSaveOverview">
          {{ savingOverview ? 'Saving…' : 'Save changes' }}
        </button>

        <div class="border-t border-babyblue-100 pt-4">
          <label class="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select
            :value="store.event.status"
            :class="inputClass"
            class="w-auto"
            @change="handleStatusChange(($event.target as HTMLSelectElement).value as EventStatus)"
          >
            <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <div v-if="store.event.organization?.country === 'UGANDA'" class="border-t border-babyblue-100 pt-4 text-sm text-slate-500">
          Payouts for Uganda events are managed on the organization page — see its mobile money number and
          Withdrawals section.
        </div>
        <div v-else class="border-t border-babyblue-100 pt-4">
          <PayoutSettingsCard
            :current="store.event"
            title="Payout override (optional)"
            description="Leave unset to use the organization's payout bank account for this event."
            :auto-edit-when-empty="false"
            @submit="handleSetPayout"
          />
          <p v-if="payoutError" class="mt-2 text-sm text-red-600">{{ payoutError }}</p>
        </div>
      </section>

      <!-- BUDGET -->
      <section v-else-if="activeTab === 'budget'">
        <!-- Toggle -->
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
          <div>
            <p class="font-medium text-slate-900">Budget allocation</p>
            <p class="text-xs text-slate-500">
              Turn this on for an event with specific items to fund — like a wedding. Leave off for a simple collection.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="store.event.budgetingEnabled"
            :disabled="togglingBudgeting"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
            :class="store.event.budgetingEnabled ? 'bg-babyblue-600' : 'bg-slate-200'"
            @click="handleToggleBudgeting"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="store.event.budgetingEnabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
        <p v-if="budgetingError" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ budgetingError }}</p>

        <template v-if="store.event.budgetingEnabled">
          <!-- Pool summary -->
          <div class="mb-4 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
            <div class="mb-1 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
              <span>{{ money(totalReceived) }} received</span>
              <span>{{ money(totalAllocated) }} allocated</span>
              <span class="font-semibold text-babyblue-700"
                >{{ money(remainingToAllocate) }} remaining</span
              >
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-babyblue-100">
              <div
                class="h-full rounded-full bg-babyblue-500 transition-all"
                :style="{ width: `${allocatedProgressPct}%` }"
              />
            </div>
          </div>

          <!-- Wedding template -->
          <div
            v-if="store.budgetCategories.length === 0"
            class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-babyblue-200 bg-babyblue-50/60 p-4"
          >
            <p class="text-sm text-slate-600">
              Planning a wedding? Start from a standard breakdown (venue, catering, photography, and more).
            </p>
            <button
              type="button"
              :disabled="applyingTemplate"
              :class="[outlineButtonClass, 'shrink-0']"
              @click="applyWeddingTemplate"
            >
              {{ applyingTemplate ? 'Adding…' : '🎊 Use wedding budget template' }}
            </button>
          </div>
          <p v-if="templateError" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ templateError }}</p>

          <form class="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm" @submit.prevent="handleCreateCategory">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700">Category name</label>
              <input v-model="newCategoryName" required :class="inputClass" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-700">Estimated cost</label>
              <input v-model.number="newCategoryCost" type="number" step="0.01" :class="inputClass" />
            </div>
            <button type="submit" :disabled="creatingCategory" :class="primaryButtonClass">
              {{ creatingCategory ? 'Adding…' : 'Add category' }}
            </button>
          </form>
          <p v-if="categoryError" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ categoryError }}</p>

          <div
            v-if="store.budgetCategories.length === 0"
            class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
          >
            No budget categories yet.
          </div>
          <ul v-else class="space-y-2">
            <li
              v-for="cat in store.budgetCategories"
              :key="cat.id"
              class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium text-slate-900">{{ cat.name }}</p>
                  <p class="text-xs text-slate-500">
                    {{ money(cat.allocatedFunds) }} allocated
                    <span v-if="Number(cat.estimatedCost) > 0"> of {{ money(cat.estimatedCost) }} estimated</span>
                  </p>
                  <div
                    v-if="Number(cat.estimatedCost) > 0"
                    class="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-babyblue-100"
                  >
                    <div
                      class="h-full rounded-full bg-babyblue-500"
                      :style="{ width: `${categoryProgressPct(cat.allocatedFunds, cat.estimatedCost)}%` }"
                    />
                  </div>
                </div>
                <div class="flex shrink-0 gap-2">
                  <button type="button" :class="outlineButtonClass" @click="openEdit(cat)">
                    {{ editingCategoryId === cat.id ? 'Cancel' : 'Edit' }}
                  </button>
                  <button type="button" :class="outlineButtonClass" @click="openAllocate(cat.id)">
                    {{ allocatingCategoryId === cat.id ? 'Cancel' : 'Allocate' }}
                  </button>
                  <button
                    type="button"
                    :disabled="deletingCategoryId === cat.id"
                    class="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    @click="handleDeleteCategory(cat)"
                  >
                    {{ deletingCategoryId === cat.id ? 'Deleting…' : 'Delete' }}
                  </button>
                </div>
              </div>

              <form
                v-if="editingCategoryId === cat.id"
                class="mt-3 flex flex-wrap items-end gap-2 border-t border-babyblue-100 pt-3"
                @submit.prevent="handleSaveEdit(cat.id)"
              >
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Category name</label>
                  <input v-model="editName" required :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Estimated cost</label>
                  <input v-model.number="editCost" type="number" step="0.01" min="0" :class="inputClass" />
                </div>
                <button type="submit" :disabled="savingEdit" :class="primaryButtonClass">
                  {{ savingEdit ? 'Saving…' : 'Save' }}
                </button>
              </form>
              <p v-if="editingCategoryId === cat.id && editError" class="mt-2 text-sm text-red-600">
                {{ editError }}
              </p>

              <div v-if="allocatingCategoryId === cat.id" class="mt-3 border-t border-babyblue-100 pt-3">
                <p v-if="remainingToAllocate <= 0" class="text-sm text-slate-500">
                  Nothing left to allocate — this event's remaining unallocated balance is
                  {{ money(remainingToAllocate) }}. Wait for more payments to come in, or free up funds by
                  lowering another category's allocation first.
                </p>
                <form v-else class="flex flex-wrap items-end gap-2" @submit.prevent="handleAllocate(cat.id)">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Amount</label>
                    <input
                      v-model.number="allocateAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      :max="remainingToAllocate"
                      required
                      :class="inputClass"
                    />
                  </div>
                  <button type="button" :class="outlineButtonClass" @click="fillRemainingFor(cat)">
                    Fill remaining
                  </button>
                  <button type="submit" :class="primaryButtonClass">Allocate</button>
                </form>
              </div>
              <p v-if="allocatingCategoryId === cat.id && allocateError" class="mt-2 text-sm text-red-600">
                {{ allocateError }}
              </p>
              <p v-if="deleteErrorCategoryId === cat.id" class="mt-2 text-sm text-red-600">
                {{ deleteError }}
              </p>
            </li>
          </ul>
        </template>
      </section>

      <!-- LINKS -->
      <section v-else-if="activeTab === 'invoices'">
        <!-- Primary link — the one auto-created with this event. Always
             visible and ready to copy; no need to generate another one for
             a simple collection. -->
        <div v-if="primaryLink" class="mb-4 rounded-2xl border border-babyblue-200 bg-babyblue-50/60 p-4">
          <p class="mb-2 text-xs font-semibold tracking-wide text-babyblue-700 uppercase">Your shareable link</p>
          <div class="flex flex-wrap items-center gap-2">
            <code class="min-w-0 flex-1 truncate rounded-lg border border-babyblue-100 bg-white px-3 py-2 text-xs text-slate-600">{{
              payLinkFor(primaryLink.secureToken)
            }}</code>
            <button
              type="button"
              :class="[primaryButtonClass, 'shrink-0']"
              @click="copyPayLink(primaryLink.id, primaryLink.secureToken)"
            >
              {{ copiedInvoiceId === primaryLink.id ? '✓ Copied!' : '🔗 Copy link' }}
            </button>
          </div>
          <div
            v-if="shareLinksFor(primaryLink.id).whatsapp.available || shareLinksFor(primaryLink.id).email.available"
            class="mt-2 flex flex-wrap gap-2 text-xs"
          >
            <a
              v-if="shareLinksFor(primaryLink.id).whatsapp.available"
              :href="shareLinksFor(primaryLink.id).whatsapp.url || undefined"
              target="_blank"
              rel="noopener"
              class="rounded-lg border border-babyblue-200 px-2.5 py-1.5 font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
            >
              💬 WhatsApp
            </a>
            <a
              v-if="shareLinksFor(primaryLink.id).email.available"
              :href="shareLinksFor(primaryLink.id).email.url || undefined"
              class="rounded-lg border border-babyblue-200 px-2.5 py-1.5 font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
            >
              ✉️ Email
            </a>
          </div>
        </div>

        <div class="mb-4 flex items-center justify-between gap-3">
          <p class="text-sm text-slate-500">
            Need a separate link — for one contributor, a fixed amount, or a one-time use? Generate another below.
          </p>
          <button type="button" :class="[primaryButtonClass, 'shrink-0']" @click="showInvoiceForm = !showInvoiceForm">
            {{ showInvoiceForm ? 'Cancel' : '+ Generate link' }}
          </button>
        </div>

        <form
          v-if="showInvoiceForm"
          class="mb-4 space-y-3 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
          @submit.prevent="handleCreateInvoice"
        >
          <label class="flex items-center gap-2 text-sm text-slate-700">
            <input v-model="invIsPermanent" type="checkbox" class="accent-babyblue-600" />
            Permanent (reusable, no expiry) — leave unchecked for a temporary, one-time link
          </label>

          <button
            type="button"
            class="block text-xs font-medium text-babyblue-700 hover:underline"
            @click="showLinkCustomize = !showLinkCustomize"
          >
            {{ showLinkCustomize ? '− Hide options' : '+ Customize (recipient, amount, category)' }}
          </button>

          <div v-if="showLinkCustomize" class="space-y-2 border-t border-babyblue-100 pt-3">
            <input v-model="invContributorName" placeholder="Recipient name (optional)" :class="inputClass" />
            <input
              v-model="invContributorEmail"
              type="email"
              placeholder="Recipient email (optional)"
              :class="inputClass"
            />
            <input v-model="invContributorPhone" placeholder="Recipient phone (optional)" :class="inputClass" />
            <input
              v-model.number="invAmountRequested"
              type="number"
              step="0.01"
              placeholder="Fixed amount (optional — leave blank to let the payer decide)"
              :class="inputClass"
            />
            <input v-model="invCategoryTag" placeholder="Category tag (optional)" :class="inputClass" />
          </div>

          <p v-if="invoiceError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ invoiceError }}</p>
          <button type="submit" :disabled="creatingInvoice" :class="primaryButtonClass">
            {{ creatingInvoice ? 'Generating…' : 'Generate link' }}
          </button>
        </form>

        <div
          v-if="otherInvoices.length === 0"
          class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
        >
          No additional links yet.
        </div>
        <ul v-else class="space-y-2">
          <li v-for="inv in otherInvoices" :key="inv.id" class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate font-medium text-slate-900">
                  {{ inv.contributorName ?? 'Open link' }}
                  <span class="ml-1 text-xs font-normal text-slate-400">({{ inv.source }})</span>
                </p>
                <p class="text-xs text-slate-500">
                  {{ money(inv.amountPaid) }}
                  <span v-if="inv.amountRequested"> of {{ money(inv.amountRequested) }}</span>
                </p>
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
      </section>

      <!-- TRANSACTIONS -->
      <section v-else-if="activeTab === 'transactions'">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-xs text-slate-500">
            Money received outside the app (cash, a direct mobile money transfer) counts toward this event's total
            but can never be withdrawn — only real payments collected through this app can be.
          </p>
          <button
            type="button"
            :class="[outlineButtonClass, 'shrink-0']"
            @click="showManualForm = !showManualForm"
          >
            {{ showManualForm ? 'Cancel' : '+ Record contribution' }}
          </button>
        </div>

        <form
          v-if="showManualForm"
          class="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
          @submit.prevent="handleRecordManual"
        >
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Amount received</label>
            <input v-model.number="manualAmount" type="number" step="0.01" min="0.01" required :class="inputClass" />
          </div>
          <div class="min-w-48 flex-1">
            <label class="mb-1 block text-xs font-medium text-slate-700">Note (optional)</label>
            <input v-model="manualNote" placeholder="e.g. Cash offering, Sunday service" :class="inputClass" />
          </div>
          <button type="submit" :disabled="recordingManual" :class="primaryButtonClass">
            {{ recordingManual ? 'Recording…' : 'Record' }}
          </button>
          <p v-if="manualError" class="w-full text-sm text-red-600">{{ manualError }}</p>
        </form>

        <div
          v-if="store.transactions.length === 0"
          class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
        >
          No transactions yet.
        </div>
        <div v-else class="overflow-hidden rounded-2xl border border-babyblue-100 bg-white shadow-sm">
          <table class="w-full text-left text-sm">
            <thead class="bg-babyblue-50 text-xs tracking-wide text-babyblue-700 uppercase">
              <tr>
                <th class="px-4 py-3">Reference</th>
                <th class="px-4 py-3">Rail</th>
                <th class="px-4 py-3">Amount</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-babyblue-50">
              <tr v-for="t in store.transactions" :key="t.id">
                <td class="px-4 py-3 font-mono text-xs">
                  <span v-if="t.paymentRail === 'MANUAL'">{{ t.note || 'Manual entry' }}</span>
                  <span v-else>{{ t.providerReference }}</span>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="t.paymentRail === 'MANUAL' ? 'bg-amber-100 text-amber-700' : 'bg-babyblue-100 text-babyblue-700'"
                  >
                    {{ railLabel(t.paymentRail) }}
                  </span>
                </td>
                <td class="px-4 py-3 font-medium">{{ money(t.amountSettled) }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="statusBadgeClass(t.status)">{{
                    t.status
                  }}</span>
                </td>
                <td class="px-4 py-3 text-xs text-slate-500">{{ formatDate(t.timestamp) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- CONTRIBUTORS -->
      <section v-else-if="activeTab === 'contributors'">
        <div v-if="contributorsLoading" class="text-sm text-slate-500">Loading…</div>
        <div v-else-if="contributorsError" class="text-sm text-red-600">{{ contributorsError }}</div>
        <template v-else-if="contributorSummary">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
            <div class="flex gap-6 text-sm">
              <span class="text-slate-500"
                >Pledged
                <strong class="block text-base text-slate-900">{{
                  money(contributorSummary.totals.pledged)
                }}</strong></span
              >
              <span class="text-slate-500"
                >Received
                <strong class="block text-base text-babyblue-700">{{
                  money(contributorSummary.totals.received)
                }}</strong></span
              >
            </div>
            <button type="button" :class="outlineButtonClass" @click="handleCopySummary">
              {{ copiedSummary ? '✓ Copied!' : '📋 Copy WhatsApp summary' }}
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
              <h3 class="mb-2 text-xs font-semibold text-green-700 uppercase">✅ Fully Paid</h3>
              <ul class="space-y-1 text-sm">
                <li v-for="c in contributorSummary.buckets.fullyPaid" :key="c.invoiceId">
                  {{ c.contributorName ?? 'Anonymous' }} — {{ money(c.amountPaid) }}
                  <span v-if="c.contributorPhone" class="text-xs text-slate-400">({{ c.contributorPhone }})</span>
                </li>
              </ul>
            </div>
            <div class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
              <h3 class="mb-2 text-xs font-semibold text-amber-700 uppercase">🔶 Partially Paid</h3>
              <ul class="space-y-1 text-sm">
                <li v-for="c in contributorSummary.buckets.partiallyPaid" :key="c.invoiceId">
                  {{ c.contributorName ?? 'Anonymous' }} — {{ money(c.amountPaid) }} of
                  {{ money(c.amountRequested) }}
                  <span v-if="c.contributorPhone" class="text-xs text-slate-400">({{ c.contributorPhone }})</span>
                </li>
              </ul>
            </div>
            <div class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
              <h3 class="mb-2 text-xs font-semibold text-babyblue-700 uppercase">🕓 Pledged</h3>
              <ul class="space-y-1 text-sm">
                <li v-for="c in contributorSummary.buckets.pledged" :key="c.invoiceId">
                  {{ c.contributorName ?? 'Anonymous' }} — {{ money(c.amountRequested) }}
                  <span v-if="c.contributorPhone" class="text-xs text-slate-400">({{ c.contributorPhone }})</span>
                </li>
              </ul>
            </div>
          </div>
        </template>
      </section>
    </template>

    <ConfirmDialog
      :open="!!categoryPendingDelete"
      title="Delete category?"
      :message="deleteConfirmMessage"
      confirm-label="Delete"
      danger
      @confirm="confirmDeleteCategory"
      @cancel="categoryPendingDelete = null"
    />
  </DashboardLayout>
</template>
