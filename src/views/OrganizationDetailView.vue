<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import PayoutSettingsCard from '@/components/PayoutSettingsCard.vue'
import MobileMoneyPayoutCard from '@/components/MobileMoneyPayoutCard.vue'
import ShareLinkReady from '@/components/ShareLinkReady.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import * as organizationsApi from '@/api/organizations'
import * as eventsApi from '@/api/events'
import * as withdrawalsApi from '@/api/withdrawals'
import * as vendorsApi from '@/api/vendors'
import * as agencyClientsApi from '@/api/agencyClients'
import * as personalInvoicesApi from '@/api/personalInvoices'
import * as publicApi from '@/api/public'
import { useOrganizationsStore } from '@/stores/organizations'
import { extractErrorMessage } from '@/api/client'
import { statusBadgeClass, formatMoney, formatDate } from '@/lib/format'
import type {
  Organization,
  OrganizationMember,
  OrganizationType,
  EventRecord,
  OrgRole,
  AuditLogEntry,
  Withdrawal,
  Vendor,
  MobileMoneyProvider,
  ClientOrganization,
  AgencyClientAccessEntry,
  PersonalInvoice,
  SupportedCountry,
} from '@/types/api'

const route = useRoute()
const organizationId = route.params.organizationId as string
const orgsStore = useOrganizationsStore()

type Tab = 'members' | 'events' | 'vendors' | 'clients' | 'settings' | 'withdrawals' | 'audit'
const activeTab = ref<Tab>('members')
// Withdrawals only applies to Uganda orgs (PawaPay collects into a shared
// platform balance, so getting money to the organization is this explicit
// step rather than automatic charge-time routing like Kenya's bank payout).
// Clients is shown for every org, not gated by type — any org can act as an
// agency by linking client orgs to it, see AgencyClientLink.
const tabs = computed<{ key: Tab; label: string; icon: string }[]>(() => [
  { key: 'members', label: 'Members', icon: '👥' },
  { key: 'events', label: 'Events', icon: '🎉' },
  { key: 'vendors', label: 'Vendors', icon: '🧾' },
  { key: 'clients', label: 'Clients', icon: '🏢' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
  ...(organization.value?.country === 'UG'
    ? [{ key: 'withdrawals' as const, label: 'Withdrawals', icon: '💸' }]
    : []),
  { key: 'audit', label: 'Audit Log', icon: '📜' },
])

const organization = ref<Organization | null>(null)
const members = ref<OrganizationMember[]>([])
const events = ref<EventRecord[]>([])
const withdrawalBalance = ref(0)
const withdrawals = ref<Withdrawal[]>([])
const loading = ref(true)
const loadError = ref('')

const myRole = computed(() => orgsStore.organizations.find((o) => o.id === organizationId)?.role)
const canManage = computed(() => myRole.value === 'MAIN_ORGANIZER' || myRole.value === 'TREASURER')
const canInvite = computed(() => myRole.value === 'MAIN_ORGANIZER')
const isMainOrganizer = computed(() => myRole.value === 'MAIN_ORGANIZER')

async function loadAll() {
  loading.value = true
  loadError.value = ''
  try {
    const [org, memberList, eventList] = await Promise.all([
      organizationsApi.getOne(organizationId),
      organizationsApi.listMembers(organizationId),
      eventsApi.listForOrganization(organizationId),
    ])
    organization.value = org
    members.value = memberList
    events.value = eventList

    if (org.country === 'UG') {
      const summary = await withdrawalsApi.listForOrganization(organizationId)
      withdrawalBalance.value = summary.balance
      withdrawals.value = summary.withdrawals
    }
  } catch (err) {
    loadError.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (orgsStore.organizations.length === 0) orgsStore.fetchMine()
  loadAll()
})

// --- Agency plan (manual flag only platform staff can set — no self-serve
// billing exists). The free client is always usable, so an org can add
// exactly one client before this ever blocks anything — see
// AgencyClientsService.assertCanLinkAnotherClient on the backend.
const canAddAnotherClient = computed(() => {
  if (clients.value.length === 0) return true
  return !!organization.value?.hasAgencyPlan
})

// --- Audit log (paginated, lazy-loaded on first tab activation) ---
const auditLog = ref<AuditLogEntry[]>([])
const auditPage = ref(1)
const AUDIT_PAGE_SIZE = 10
const auditTotal = ref(0)
const auditTotalPages = ref(1)
const auditLoading = ref(false)
const auditError = ref('')
const auditLoadedOnce = ref(false)

async function loadAuditLog() {
  auditLoading.value = true
  auditError.value = ''
  try {
    const result = await organizationsApi.getAuditLog(organizationId, {
      page: auditPage.value,
      pageSize: AUDIT_PAGE_SIZE,
    })
    auditLog.value = result.data
    auditTotal.value = result.total
    auditTotalPages.value = result.totalPages
  } catch (err) {
    auditError.value = extractErrorMessage(err)
  } finally {
    auditLoading.value = false
  }
}

function goToAuditPage(page: number) {
  if (page < 1 || page > auditTotalPages.value) return
  auditPage.value = page
  loadAuditLog()
}

function selectTab(tab: Tab) {
  activeTab.value = tab
  if (tab === 'audit' && !auditLoadedOnce.value) {
    auditLoadedOnce.value = true
    loadAuditLog()
  }
  if (tab === 'vendors' && !vendorsLoadedOnce.value) {
    vendorsLoadedOnce.value = true
    loadVendors()
  }
  if (tab === 'clients' && !clientsLoadedOnce.value) {
    clientsLoadedOnce.value = true
    loadClients()
  }
}

// --- Vendors (org-wide directory, lazy-loaded on first tab activation) ---
const vendors = ref<Vendor[]>([])
const vendorsLoading = ref(false)
const vendorsError = ref('')
const vendorsLoadedOnce = ref(false)

async function loadVendors() {
  vendorsLoading.value = true
  vendorsError.value = ''
  try {
    vendors.value = await vendorsApi.listForOrganization(organizationId)
  } catch (err) {
    vendorsError.value = extractErrorMessage(err)
  } finally {
    vendorsLoading.value = false
  }
}

const showVendorForm = ref(false)
const vendorName = ref('')
const vendorMobileProvider = ref<MobileMoneyProvider>('')
const vendorMobileNumber = ref('')
const vendorError = ref('')
const creatingVendor = ref(false)
const deletingVendorId = ref<string | null>(null)
const vendorPendingDelete = ref<{ id: string; name: string } | null>(null)
const vendorDeleteConfirmMessage = computed(() =>
  vendorPendingDelete.value
    ? `Remove "${vendorPendingDelete.value.name}" from your vendor directory? Any past payments to them are kept for the record.`
    : '',
)

function toggleVendorForm() {
  showVendorForm.value = !showVendorForm.value
  vendorError.value = ''
}

async function handleCreateVendor() {
  vendorError.value = ''
  creatingVendor.value = true
  try {
    await vendorsApi.create({
      organizationId,
      name: vendorName.value,
      payoutMethod: 'MOBILE_MONEY',
      mobileProvider: vendorMobileProvider.value,
      mobileNumber: vendorMobileNumber.value,
    })
    vendorName.value = ''
    vendorMobileNumber.value = ''
    showVendorForm.value = false
    await loadVendors()
  } catch (err) {
    vendorError.value = extractErrorMessage(err)
  } finally {
    creatingVendor.value = false
  }
}

function handleDeleteVendor(vendor: { id: string; name: string }) {
  vendorPendingDelete.value = vendor
}

async function confirmDeleteVendor() {
  const vendor = vendorPendingDelete.value
  if (!vendor) return
  vendorPendingDelete.value = null
  deletingVendorId.value = vendor.id
  try {
    await vendorsApi.remove(vendor.id)
    await loadVendors()
  } catch (err) {
    vendorsError.value = extractErrorMessage(err)
  } finally {
    deletingVendorId.value = null
  }
}

// Invite member
const showInviteForm = ref(false)
const inviteEmail = ref('')
const inviteRole = ref<OrgRole>('TREASURER')
const inviteError = ref('')
const inviteSuccess = ref('')
const inviting = ref(false)
const roles: OrgRole[] = ['MAIN_ORGANIZER', 'TREASURER', 'AUDITOR']

const payoutError = ref('')

async function handleSetPayout(payload: { bankCode: string; bankName: string; accountNumber: string }) {
  payoutError.value = ''
  try {
    organization.value = await organizationsApi.setPayout(organizationId, payload)
  } catch (err) {
    payoutError.value = extractErrorMessage(err)
  }
}

async function handleSetMobileMoneyPayout(payload: { provider: MobileMoneyProvider; phoneNumber: string }) {
  payoutError.value = ''
  try {
    organization.value = await organizationsApi.setMobileMoneyPayout(organizationId, payload)
  } catch (err) {
    payoutError.value = extractErrorMessage(err)
  }
}

// Branding (shown instead of the platform's own badge on public checkout pages)
const logoUrlInput = ref('')
const savingBranding = ref(false)
const brandingError = ref('')

function startEditingBranding() {
  logoUrlInput.value = organization.value?.logoUrl ?? ''
  brandingError.value = ''
}

async function handleSaveBranding() {
  brandingError.value = ''
  savingBranding.value = true
  try {
    organization.value = await organizationsApi.setBranding(organizationId, {
      logoUrl: logoUrlInput.value || null,
    })
  } catch (err) {
    brandingError.value = extractErrorMessage(err)
  } finally {
    savingBranding.value = false
  }
}

// Archive — soft-archive only, never a real delete. Just excludes this
// organization from the default list on OrganizationsView; everything else
// (events, payouts, members) keeps working exactly as before.
const archiving = ref(false)
const archiveError = ref('')
const showArchiveConfirm = ref(false)

async function confirmSetArchived() {
  showArchiveConfirm.value = false
  archiveError.value = ''
  archiving.value = true
  try {
    const archived = !organization.value?.archivedAt
    organization.value = await organizationsApi.setArchived(organizationId, archived)
    await orgsStore.fetchMine()
  } catch (err) {
    archiveError.value = extractErrorMessage(err)
  } finally {
    archiving.value = false
  }
}

// Withdrawals (Uganda only)
const withdrawAmount = ref<number | null>(null)
const withdrawError = ref('')
const withdrawing = ref(false)
const showWithdrawForm = ref(false)

async function handleWithdraw() {
  withdrawError.value = ''
  withdrawing.value = true
  try {
    await withdrawalsApi.create(organizationId, { amount: withdrawAmount.value! })
    withdrawAmount.value = null
    showWithdrawForm.value = false
    const summary = await withdrawalsApi.listForOrganization(organizationId)
    withdrawalBalance.value = summary.balance
    withdrawals.value = summary.withdrawals
  } catch (err) {
    withdrawError.value = extractErrorMessage(err)
  } finally {
    withdrawing.value = false
  }
}

async function handleInvite() {
  inviteError.value = ''
  inviteSuccess.value = ''
  inviting.value = true
  try {
    const result = await organizationsApi.inviteMember(organizationId, {
      email: inviteEmail.value,
      role: inviteRole.value,
    })
    inviteEmail.value = ''
    showInviteForm.value = false
    if ('status' in result && result.status === 'invited') {
      // No account existed yet — an invitation email was sent instead of a
      // membership being created directly, so there's nothing new to refetch.
      inviteSuccess.value = `Invitation email sent to ${result.email}.`
    } else {
      members.value = await organizationsApi.listMembers(organizationId)
    }
  } catch (err) {
    inviteError.value = extractErrorMessage(err)
  } finally {
    inviting.value = false
  }
}

// Create event
const showEventForm = ref(false)
const eventTitle = ref('')
const eventDescription = ref('')
const eventTargetGoal = ref<number | null>(null)
const eventIsPermanent = ref(false)
const eventError = ref('')
const creatingEvent = ref(false)
const newEventLink = ref<EventRecord | null>(null)

function toggleEventForm() {
  showEventForm.value = !showEventForm.value
  newEventLink.value = null
}

async function handleCreateEvent() {
  eventError.value = ''
  creatingEvent.value = true
  try {
    newEventLink.value = await eventsApi.create({
      organizationId,
      title: eventTitle.value,
      description: eventDescription.value || undefined,
      targetGoal: eventTargetGoal.value ?? undefined,
      isPermanent: eventIsPermanent.value,
    })
    eventTitle.value = ''
    eventDescription.value = ''
    eventTargetGoal.value = null
    eventIsPermanent.value = false
    showEventForm.value = false
    events.value = await eventsApi.listForOrganization(organizationId)
  } catch (err) {
    eventError.value = extractErrorMessage(err)
  } finally {
    creatingEvent.value = false
  }
}

// --- Clients (this org acting as an agency, lazy-loaded on first tab
// activation) — createClient/grantAccess/revokeAccess are MAIN_ORGANIZER-
// only server-side, matching canInvite's condition; reused here rather than
// a duplicate computed. ---
const clientOrgTypes: OrganizationType[] = [
  'CHURCH',
  'CHAMA',
  'SACCO',
  'COLLECTIVE',
  'EVENT_COMPANY',
  'OTHER',
]
// Doubles as the Clients-tab country dropdown source and the Settings tab's
// provider lookup (see orgPaymentProvider below), so the frontend never
// duplicates the backend's country->provider mapping.
const supportedCountries = ref<SupportedCountry[]>([])
publicApi.listSupportedCountries().then((countries) => {
  supportedCountries.value = countries
})
const orgPaymentProvider = computed(
  () => supportedCountries.value.find((c) => c.code === organization.value?.country)?.provider,
)
const orgMobileMoneyOperators = computed(
  () => supportedCountries.value.find((c) => c.code === organization.value?.country)?.mobileMoneyOperators ?? [],
)
const orgOperatorLabels = computed(
  () => Object.fromEntries(orgMobileMoneyOperators.value.map((op) => [op.code, op.label])) as Record<string, string>,
)
watch(orgMobileMoneyOperators, (operators) => {
  if (!operators.some((op) => op.code === vendorMobileProvider.value)) {
    vendorMobileProvider.value = operators[0]?.code ?? ''
  }
})

const clients = ref<ClientOrganization[]>([])
const clientsLoading = ref(false)
const clientsError = ref('')
const clientsLoadedOnce = ref(false)

async function loadClients() {
  clientsLoading.value = true
  clientsError.value = ''
  try {
    clients.value = await agencyClientsApi.listClients(organizationId)
  } catch (err) {
    clientsError.value = extractErrorMessage(err)
  } finally {
    clientsLoading.value = false
  }
}

const showClientForm = ref(false)
const clientName = ref('')
const clientType = ref<OrganizationType>('OTHER')
const clientCountry = ref<string>('KE')
const clientFormError = ref('')
const creatingClient = ref(false)

async function handleCreateClient() {
  clientFormError.value = ''
  creatingClient.value = true
  try {
    await agencyClientsApi.createClient(organizationId, {
      name: clientName.value,
      type: clientType.value,
      country: clientCountry.value,
    })
    clientName.value = ''
    showClientForm.value = false
    await loadClients()
  } catch (err) {
    clientFormError.value = extractErrorMessage(err)
  } finally {
    creatingClient.value = false
  }
}

// Per-client access roster — expand one client at a time to manage which
// agency staff can access it, and at what role.
const expandedClientId = ref<string | null>(null)
const clientAccess = ref<AgencyClientAccessEntry[]>([])
const clientAccessLoading = ref(false)
const clientAccessError = ref('')

async function loadClientAccess(clientOrganizationId: string) {
  clientAccessError.value = ''
  clientAccessLoading.value = true
  try {
    clientAccess.value = await agencyClientsApi.listAccess(organizationId, clientOrganizationId)
  } catch (err) {
    clientAccessError.value = extractErrorMessage(err)
  } finally {
    clientAccessLoading.value = false
  }
}

function toggleClientAccess(clientOrganizationId: string) {
  if (expandedClientId.value === clientOrganizationId) {
    expandedClientId.value = null
    return
  }
  expandedClientId.value = clientOrganizationId
  grantUserId.value = ''
  loadClientAccess(clientOrganizationId)
  loadClientInvoices(clientOrganizationId)
}

const grantUserId = ref('')
const grantRole = ref<OrgRole>('AUDITOR')
const grantingAccess = ref(false)

async function handleGrantAccess() {
  if (!expandedClientId.value) return
  clientAccessError.value = ''
  grantingAccess.value = true
  try {
    await agencyClientsApi.grantAccess(organizationId, expandedClientId.value, {
      userId: grantUserId.value,
      role: grantRole.value,
    })
    grantUserId.value = ''
    await loadClientAccess(expandedClientId.value)
  } catch (err) {
    clientAccessError.value = extractErrorMessage(err)
  } finally {
    grantingAccess.value = false
  }
}

async function handleRevokeAccess(userId: string) {
  if (!expandedClientId.value) return
  clientAccessError.value = ''
  try {
    await agencyClientsApi.revokeAccess(organizationId, expandedClientId.value, userId)
    await loadClientAccess(expandedClientId.value)
  } catch (err) {
    clientAccessError.value = extractErrorMessage(err)
  }
}

// Planning invoices billed to this client — only the ones the current user
// personally issued (PersonalInvoice has no org scoping of its own), tagged
// via relatedOrganizationId. See PersonalInvoicesView.vue's "Bill this
// client" entry point below.
const clientInvoices = ref<PersonalInvoice[]>([])
const clientInvoicesLoading = ref(false)
const clientInvoicesError = ref('')

async function loadClientInvoices(clientOrganizationId: string) {
  clientInvoicesError.value = ''
  clientInvoicesLoading.value = true
  try {
    clientInvoices.value = await personalInvoicesApi.listMine(clientOrganizationId)
  } catch (err) {
    clientInvoicesError.value = extractErrorMessage(err)
  } finally {
    clientInvoicesLoading.value = false
  }
}

function billClientRoute(client: ClientOrganization) {
  return {
    name: 'personal-invoices',
    query: { relatedOrganizationId: client.id, relatedOrganizationName: client.name },
  }
}
</script>

<template>
  <DashboardLayout>
    <div v-if="loading" class="text-sm text-slate-500">Loading…</div>
    <div v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>

    <template v-else-if="organization">
      <h1 class="text-2xl font-semibold text-slate-900">{{ organization.name }}</h1>
      <p class="mb-6 text-sm text-slate-500">{{ organization.type }}</p>

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

      <!-- MEMBERS -->
      <section v-if="activeTab === 'members'">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Members</h2>
          <button
            v-if="canInvite"
            type="button"
            class="rounded-lg border border-babyblue-200 px-3 py-1 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
            @click="showInviteForm = !showInviteForm"
          >
            {{ showInviteForm ? 'Cancel' : '+ Invite member' }}
          </button>
        </div>

        <form
          v-if="showInviteForm"
          class="mb-3 space-y-2 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
          @submit.prevent="handleInvite"
        >
          <input
            v-model="inviteEmail"
            type="email"
            required
            placeholder="member@example.com"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          />
          <select
            v-model="inviteRole"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          >
            <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
          </select>
          <p v-if="inviteError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ inviteError }}</p>
          <button
            type="submit"
            :disabled="inviting"
            class="rounded-lg bg-babyblue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ inviting ? 'Inviting…' : 'Send invite' }}
          </button>
        </form>
        <p v-if="inviteSuccess" class="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {{ inviteSuccess }}
        </p>

        <ul class="space-y-1.5">
          <li
            v-for="m in members"
            :key="m.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-babyblue-100 bg-white px-4 py-2.5 text-sm shadow-sm"
          >
            <span class="min-w-0 break-words"
              >{{ m.user.name }} <span class="text-slate-400">({{ m.user.email }})</span></span
            >
            <span
              class="shrink-0 rounded-full bg-babyblue-100 px-2.5 py-1 text-xs font-medium text-babyblue-700"
              >{{ m.role }}</span
            >
          </li>
        </ul>
      </section>

      <!-- EVENTS -->
      <section v-else-if="activeTab === 'events'">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Events</h2>
          <button
            v-if="canManage"
            type="button"
            class="rounded-lg border border-babyblue-200 px-3 py-1 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
            @click="toggleEventForm"
          >
            {{ showEventForm ? 'Cancel' : '+ New event' }}
          </button>
        </div>

        <ShareLinkReady
          v-if="newEventLink && newEventLink.defaultLinkToken"
          class="mb-3"
          :token="newEventLink.defaultLinkToken"
          :event-id="newEventLink.id"
        />

        <form
          v-if="showEventForm"
          class="mb-3 space-y-2 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
          @submit.prevent="handleCreateEvent"
        >
          <input
            v-model="eventTitle"
            type="text"
            required
            placeholder="Event title"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          />
          <textarea
            v-model="eventDescription"
            placeholder="Description (optional)"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          />
          <input
            v-model.number="eventTargetGoal"
            type="number"
            step="0.01"
            placeholder="Target goal (optional)"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          />
          <label class="flex items-center gap-2 text-sm text-slate-700">
            <input v-model="eventIsPermanent" type="checkbox" class="accent-babyblue-600" />
            Permanent / rolling collection (no expiry, e.g. tithes)
          </label>
          <p v-if="eventError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ eventError }}</p>
          <button
            type="submit"
            :disabled="creatingEvent"
            class="rounded-lg bg-babyblue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ creatingEvent ? 'Creating…' : 'Create event' }}
          </button>
        </form>

        <div
          v-if="events.length === 0"
          class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
        >
          No events yet.
        </div>
        <ul v-else class="grid gap-3 sm:grid-cols-2">
          <li v-for="evt in events" :key="evt.id" class="min-w-0">
            <RouterLink
              :to="{ name: 'event-detail', params: { eventId: evt.id } }"
              class="flex items-center justify-between rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-babyblue-300 hover:shadow-md"
            >
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-babyblue-50 text-lg">
                  {{ evt.isPermanent ? '🔁' : '🎉' }}
                </span>
                <div class="min-w-0">
                  <p class="truncate font-medium text-slate-900">{{ evt.title }}</p>
                  <p class="text-xs text-slate-500">
                    {{ evt.isPermanent ? 'Permanent' : 'Milestone' }}
                  </p>
                </div>
              </div>
              <span
                class="ml-2 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                :class="statusBadgeClass(evt.status)"
                >{{ evt.status }}</span
              >
            </RouterLink>
          </li>
        </ul>
      </section>

      <!-- VENDORS -->
      <section v-else-if="activeTab === 'vendors'">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Vendors</h2>
          <button
            v-if="canManage"
            type="button"
            class="rounded-lg border border-babyblue-200 px-3 py-1 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
            @click="toggleVendorForm"
          >
            {{ showVendorForm ? 'Cancel' : '+ Add vendor' }}
          </button>
        </div>

        <form
          v-if="showVendorForm"
          class="mb-3 space-y-2 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
          @submit.prevent="handleCreateVendor"
        >
          <input
            v-model="vendorName"
            type="text"
            required
            placeholder="Vendor name (e.g. Acme Catering)"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          />

          <select
            v-model="vendorMobileProvider"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          >
            <option v-for="operator in orgMobileMoneyOperators" :key="operator.code" :value="operator.code">
              {{ operator.label }}
            </option>
          </select>
          <input
            v-model="vendorMobileNumber"
            required
            placeholder="Include country code"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          />
          <p class="text-xs text-slate-500">Digits only, with country code, no leading + or 0.</p>

          <p v-if="vendorError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ vendorError }}</p>
          <button
            type="submit"
            :disabled="creatingVendor"
            class="rounded-lg bg-babyblue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ creatingVendor ? 'Verifying and saving…' : 'Save vendor' }}
          </button>
        </form>

        <div v-if="vendorsLoading" class="rounded-2xl border border-babyblue-100 bg-white/60 p-8 text-center text-sm text-slate-500">
          Loading…
        </div>
        <p v-else-if="vendorsError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ vendorsError }}</p>
        <div
          v-else-if="vendors.length === 0"
          class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
        >
          No vendors yet.
        </div>
        <ul v-else class="space-y-1.5">
          <li
            v-for="v in vendors"
            :key="v.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-babyblue-100 bg-white px-4 py-2.5 text-sm shadow-sm"
          >
            <div class="min-w-0">
              <p class="truncate font-medium text-slate-900">{{ v.name }}</p>
              <p class="text-xs text-slate-500">
                <template v-if="v.payoutMethod === 'BANK_ACCOUNT'"
                  >{{ v.payoutBankName }} · {{ v.payoutAccountName }} · •••{{ v.payoutAccountLast4 }}</template
                >
                <template v-else
                  >{{
                    v.payoutMobileProvider ? (orgOperatorLabels[v.payoutMobileProvider] ?? v.payoutMobileProvider) : ''
                  }}
                  · •••{{ v.payoutMobileNumberLast4 }}</template
                >
              </p>
            </div>
            <button
              v-if="canManage"
              type="button"
              :disabled="deletingVendorId === v.id"
              class="shrink-0 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleDeleteVendor(v)"
            >
              {{ deletingVendorId === v.id ? 'Deleting…' : 'Delete' }}
            </button>
          </li>
        </ul>
      </section>

      <!-- CLIENTS (this org acting as an agency for other orgs it manages) -->
      <section v-else-if="activeTab === 'clients'">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Clients</h2>
          <button
            v-if="canInvite && canAddAnotherClient"
            type="button"
            class="rounded-lg border border-babyblue-200 px-3 py-1 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
            @click="showClientForm = !showClientForm"
          >
            {{ showClientForm ? 'Cancel' : '+ New client' }}
          </button>
        </div>
        <p class="mb-3 text-xs text-slate-500">
          Manage other organizations on their behalf. Creating a client here gives you MAIN_ORGANIZER access to it
          right away — from there, decide which of your own staff can access each client, and at what role.
        </p>

        <div
          v-if="canInvite && !canAddAnotherClient"
          class="mb-3 rounded-2xl border border-babyblue-200 bg-babyblue-50 p-4 text-sm text-babyblue-800"
        >
          You've used your free client. Contact us to upgrade to the Agency plan for more.
        </div>

        <form
          v-if="showClientForm"
          class="mb-3 space-y-2 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
          @submit.prevent="handleCreateClient"
        >
          <input
            v-model="clientName"
            type="text"
            required
            placeholder="Client organization name"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          />
          <select
            v-model="clientType"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          >
            <option v-for="t in clientOrgTypes" :key="t" :value="t">{{ t }}</option>
          </select>
          <select
            v-model="clientCountry"
            class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
          >
            <option v-for="opt in supportedCountries" :key="opt.code" :value="opt.code">{{ opt.label }}</option>
          </select>
          <p v-if="clientFormError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ clientFormError }}</p>
          <button
            type="submit"
            :disabled="creatingClient"
            class="rounded-lg bg-babyblue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ creatingClient ? 'Creating…' : 'Create client' }}
          </button>
        </form>

        <div v-if="clientsLoading" class="rounded-2xl border border-babyblue-100 bg-white/60 p-8 text-center text-sm text-slate-500">
          Loading…
        </div>
        <p v-else-if="clientsError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ clientsError }}</p>
        <div
          v-else-if="clients.length === 0"
          class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
        >
          No clients yet.
        </div>
        <ul v-else class="space-y-1.5">
          <li v-for="c in clients" :key="c.id" class="rounded-xl border border-babyblue-100 bg-white shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <RouterLink
                :to="{ name: 'organization-detail', params: { organizationId: c.id } }"
                class="min-w-0 truncate font-medium text-slate-900 hover:text-babyblue-700"
              >
                {{ c.name }}
              </RouterLink>
              <div class="flex shrink-0 items-center gap-2">
                <span class="text-xs text-slate-400">{{ c.type }}</span>
                <button
                  v-if="canInvite"
                  type="button"
                  class="rounded-lg border border-babyblue-200 px-2.5 py-1 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
                  @click="toggleClientAccess(c.id)"
                >
                  {{ expandedClientId === c.id ? 'Close' : 'Manage access' }}
                </button>
              </div>
            </div>

            <div v-if="expandedClientId === c.id" class="border-t border-babyblue-100 p-4">
              <div v-if="clientAccessLoading" class="text-sm text-slate-500">Loading…</div>
              <template v-else>
                <p v-if="clientAccess.length === 0" class="mb-3 text-xs text-slate-500">
                  No staff have been granted access to this client yet.
                </p>
                <ul v-else class="mb-3 space-y-1.5">
                  <li
                    v-for="grant in clientAccess"
                    :key="grant.id"
                    class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-babyblue-50 px-3 py-2 text-sm"
                  >
                    <span class="min-w-0 break-words"
                      >{{ grant.user.name }} <span class="text-slate-400">({{ grant.user.email }})</span></span
                    >
                    <span class="flex shrink-0 items-center gap-2">
                      <span class="rounded-full bg-babyblue-100 px-2.5 py-1 text-xs font-medium text-babyblue-700">{{
                        grant.role
                      }}</span>
                      <button
                        type="button"
                        class="text-xs font-medium text-red-600 hover:underline"
                        @click="handleRevokeAccess(grant.userId)"
                      >
                        Revoke
                      </button>
                    </span>
                  </li>
                </ul>

                <form class="flex flex-wrap items-end gap-2" @submit.prevent="handleGrantAccess">
                  <div class="min-w-40 flex-1">
                    <label class="mb-1 block text-xs font-medium text-slate-700">Staff member</label>
                    <select
                      v-model="grantUserId"
                      required
                      class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
                    >
                      <option value="" disabled>Select…</option>
                      <option v-for="m in members" :key="m.userId" :value="m.userId">{{ m.user.name }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Role</label>
                    <select
                      v-model="grantRole"
                      class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
                    >
                      <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    :disabled="grantingAccess"
                    class="rounded-lg bg-babyblue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {{ grantingAccess ? 'Granting…' : 'Grant access' }}
                  </button>
                </form>
                <p v-if="clientAccessError" class="mt-2 text-sm text-red-600">{{ clientAccessError }}</p>

                <div class="mt-4 border-t border-babyblue-100 pt-3">
                  <div class="mb-2 flex items-center justify-between">
                    <h3 class="text-xs font-semibold tracking-wide text-babyblue-700 uppercase">
                      Planning invoices
                    </h3>
                    <RouterLink
                      :to="billClientRoute(c)"
                      class="rounded-lg border border-babyblue-200 px-2.5 py-1 text-xs font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100"
                    >
                      + Bill this client
                    </RouterLink>
                  </div>
                  <p class="mb-2 text-xs text-slate-500">Only invoices you personally issued for this client.</p>
                  <div v-if="clientInvoicesLoading" class="text-xs text-slate-400">Loading…</div>
                  <p v-else-if="clientInvoicesError" class="text-xs text-red-600">{{ clientInvoicesError }}</p>
                  <p v-else-if="clientInvoices.length === 0" class="text-xs text-slate-400">
                    No invoices billed to this client yet.
                  </p>
                  <ul v-else class="space-y-1.5">
                    <li
                      v-for="inv in clientInvoices"
                      :key="inv.id"
                      class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-babyblue-50 px-3 py-2 text-xs"
                    >
                      <span class="min-w-0 truncate font-medium text-slate-800">{{ inv.recipientName }}</span>
                      <span class="flex shrink-0 items-center gap-2">
                        <span>{{ formatMoney(inv.amount) }}</span>
                        <span class="rounded-full px-2 py-0.5 font-medium" :class="statusBadgeClass(inv.status)">{{
                          inv.status
                        }}</span>
                      </span>
                    </li>
                  </ul>
                </div>
              </template>
            </div>
          </li>
        </ul>
      </section>

      <!-- SETTINGS -->
      <section v-else-if="activeTab === 'settings'">
        <!-- Payout -->
        <div v-if="canManage">
          <h2 class="mb-3 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Payout</h2>
          <PayoutSettingsCard
            v-if="orgPaymentProvider === 'PAYSTACK'"
            :current="organization"
            title="Payout bank account"
            description="Where money from this organization's events lands, unless an event sets its own override."
            @submit="handleSetPayout"
          />
          <MobileMoneyPayoutCard
            v-else-if="orgPaymentProvider === 'PAWAPAY'"
            :current="organization"
            :operators="orgMobileMoneyOperators"
            @submit="handleSetMobileMoneyPayout"
          />
          <p v-if="payoutError" class="mt-2 text-sm text-red-600">{{ payoutError }}</p>
        </div>

        <!-- Branding -->
        <div v-if="canManage" class="mt-6">
          <h2 class="mb-3 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Branding</h2>
          <div class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
            <p class="mb-3 text-xs text-slate-500">
              Shown instead of the OpenPool badge on your public checkout and pledge pages.
            </p>
            <div class="flex items-end gap-3">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-babyblue-50"
              >
                <img
                  v-if="logoUrlInput || organization.logoUrl"
                  :src="logoUrlInput || organization.logoUrl!"
                  alt=""
                  class="h-full w-full object-cover"
                />
                <span v-else class="text-xs font-bold text-babyblue-700">OP</span>
              </div>
              <div class="min-w-0 flex-1">
                <label class="mb-1 block text-xs font-medium text-slate-700">Logo URL</label>
                <input
                  v-model="logoUrlInput"
                  type="url"
                  placeholder="https://example.com/logo.png"
                  class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
                  @focus="startEditingBranding"
                />
              </div>
              <button
                type="button"
                :disabled="savingBranding"
                class="shrink-0 rounded-lg bg-babyblue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleSaveBranding"
              >
                {{ savingBranding ? 'Saving…' : 'Save' }}
              </button>
            </div>
            <p v-if="brandingError" class="mt-2 text-sm text-red-600">{{ brandingError }}</p>
          </div>
        </div>

        <!-- Agency plan (manual flag — no self-serve billing) -->
        <div v-if="canManage" class="mt-6">
          <h2 class="mb-3 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Agency plan</h2>
          <div class="rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
            <p class="mb-3 text-xs text-slate-500">
              The first client you manage is free. Contact us to upgrade to the Agency plan for more.
            </p>
            <p class="text-sm font-medium text-slate-900">
              {{ organization?.hasAgencyPlan ? 'Agency plan active' : `Free plan — ${clients.length} client${clients.length === 1 ? '' : 's'} managed` }}
            </p>
          </div>
        </div>

        <!-- Archive — soft-archive only, never a real delete -->
        <div v-if="isMainOrganizer" class="mt-6">
          <h2 class="mb-3 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Archive</h2>
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
            <div>
              <p class="text-sm font-medium text-slate-900">
                {{ organization?.archivedAt ? 'This organization is archived' : 'Archive this organization' }}
              </p>
              <p class="text-xs text-slate-500">
                {{
                  organization?.archivedAt
                    ? "Hidden from your organizations list by default. Nothing else is affected — unarchive any time."
                    : "Hides it from your organizations list. Events, payouts, and history are kept — this isn't a delete."
                }}
              </p>
            </div>
            <button
              type="button"
              :disabled="archiving"
              class="shrink-0 rounded-lg border border-babyblue-200 px-3 py-2 text-sm font-medium text-babyblue-700 transition-colors hover:bg-babyblue-100 disabled:cursor-not-allowed disabled:opacity-50"
              @click="showArchiveConfirm = true"
            >
              {{ archiving ? 'Saving…' : organization?.archivedAt ? 'Unarchive' : 'Archive' }}
            </button>
          </div>
          <p v-if="archiveError" class="mt-2 text-sm text-red-600">{{ archiveError }}</p>
        </div>
      </section>

      <!-- WITHDRAWALS (Uganda only — PawaPay collects into a shared platform
           balance, so getting money to the organization is this explicit
           step rather than automatic charge-time routing) -->
      <section v-else-if="activeTab === 'withdrawals'">
        <h2 class="mb-3 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Withdrawals</h2>
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
          <div>
            <p class="text-xs text-slate-500">Available to withdraw</p>
            <p class="text-lg font-semibold text-babyblue-700">{{ formatMoney(withdrawalBalance, 'UGX') }}</p>
          </div>
          <button
            v-if="canManage"
            type="button"
            :disabled="withdrawalBalance <= 0 && !showWithdrawForm"
            class="shrink-0 rounded-lg bg-babyblue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="showWithdrawForm = !showWithdrawForm"
          >
            {{ showWithdrawForm ? 'Cancel' : 'Withdraw' }}
          </button>
        </div>

        <form
          v-if="showWithdrawForm"
          class="mb-3 flex flex-wrap items-end gap-2 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm"
          @submit.prevent="handleWithdraw"
        >
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Amount</label>
            <input
              v-model.number="withdrawAmount"
              type="number"
              step="0.01"
              min="0.01"
              :max="withdrawalBalance"
              required
              class="w-full rounded-lg border border-babyblue-200 px-3 py-2 text-sm transition-colors focus:border-babyblue-400 focus:ring-2 focus:ring-babyblue-100 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            :disabled="withdrawing"
            class="rounded-lg bg-babyblue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-babyblue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ withdrawing ? 'Requesting…' : 'Confirm withdrawal' }}
          </button>
        </form>
        <p v-if="withdrawError" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ withdrawError }}</p>

        <div
          v-if="withdrawals.length === 0"
          class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-6 text-center text-sm text-slate-500"
        >
          No withdrawals yet.
        </div>
        <ul v-else class="space-y-1.5">
          <li
            v-for="w in withdrawals"
            :key="w.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-babyblue-100 bg-white px-4 py-2.5 text-sm shadow-sm"
          >
            <span class="text-slate-900">{{ formatMoney(w.amount) }}</span>
            <span class="flex items-center gap-2">
              <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="statusBadgeClass(w.status)">{{ w.status }}</span>
              <span class="text-xs text-slate-400">{{ formatDate(w.createdAt) }}</span>
            </span>
          </li>
        </ul>
      </section>

      <!-- AUDIT LOG -->
      <section v-else-if="activeTab === 'audit'">
        <h2 class="mb-3 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Audit log</h2>
        <p v-if="auditError" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ auditError }}</p>

        <div v-if="auditLoading" class="rounded-2xl border border-babyblue-100 bg-white/60 p-8 text-center text-sm text-slate-500">
          Loading…
        </div>
        <div
          v-else-if="auditLog.length === 0"
          class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
        >
          No activity recorded yet.
        </div>
        <template v-else>
          <ul class="space-y-1.5">
            <li
              v-for="entry in auditLog"
              :key="entry.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-babyblue-100 bg-white px-4 py-2.5 text-sm shadow-sm"
            >
              <span class="min-w-0 break-words">
                <span class="font-medium text-slate-900">{{ entry.action }}</span>
                <span class="text-slate-400"> by {{ entry.user?.name ?? 'system' }}</span>
                <span v-if="entry.event" class="text-slate-400"> on {{ entry.event.title }}</span>
              </span>
              <span class="shrink-0 text-xs text-slate-400">{{ formatDate(entry.timestamp) }}</span>
            </li>
          </ul>
          <PaginationControls
            v-if="auditTotal > 0"
            :page="auditPage"
            :total-pages="auditTotalPages"
            :total="auditTotal"
            class="mt-3 rounded-2xl border border-babyblue-100 bg-white"
            @update:page="goToAuditPage"
          />
        </template>
      </section>
    </template>

    <ConfirmDialog
      :open="!!vendorPendingDelete"
      title="Remove vendor?"
      :message="vendorDeleteConfirmMessage"
      confirm-label="Remove"
      danger
      @confirm="confirmDeleteVendor"
      @cancel="vendorPendingDelete = null"
    />

    <ConfirmDialog
      :open="showArchiveConfirm"
      :title="organization?.archivedAt ? 'Unarchive this organization?' : 'Archive this organization?'"
      :message="
        organization?.archivedAt
          ? 'It will reappear in your default organizations list.'
          : 'It will be hidden from your default organizations list. Events, payouts, and history are kept — this is not a delete.'
      "
      :confirm-label="organization?.archivedAt ? 'Unarchive' : 'Archive'"
      @confirm="confirmSetArchived"
      @cancel="showArchiveConfirm = false"
    />
  </DashboardLayout>
</template>
