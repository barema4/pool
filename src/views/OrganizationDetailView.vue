<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import PayoutSettingsCard from '@/components/PayoutSettingsCard.vue'
import MobileMoneyPayoutCard from '@/components/MobileMoneyPayoutCard.vue'
import ShareLinkReady from '@/components/ShareLinkReady.vue'
import * as organizationsApi from '@/api/organizations'
import * as eventsApi from '@/api/events'
import * as withdrawalsApi from '@/api/withdrawals'
import { useOrganizationsStore } from '@/stores/organizations'
import { extractErrorMessage } from '@/api/client'
import { statusBadgeClass, formatMoney, formatDate } from '@/lib/format'
import type {
  Organization,
  OrganizationMember,
  EventRecord,
  OrgRole,
  AuditLogEntry,
  Withdrawal,
} from '@/types/api'

const route = useRoute()
const organizationId = route.params.organizationId as string
const orgsStore = useOrganizationsStore()

const organization = ref<Organization | null>(null)
const members = ref<OrganizationMember[]>([])
const events = ref<EventRecord[]>([])
const auditLog = ref<AuditLogEntry[]>([])
const withdrawalBalance = ref(0)
const withdrawals = ref<Withdrawal[]>([])
const loading = ref(true)
const loadError = ref('')

const myRole = computed(() => orgsStore.organizations.find((o) => o.id === organizationId)?.role)
const canManage = computed(() => myRole.value === 'MAIN_ORGANIZER' || myRole.value === 'TREASURER')
const canInvite = computed(() => myRole.value === 'MAIN_ORGANIZER')

async function loadAll() {
  loading.value = true
  loadError.value = ''
  try {
    const [org, memberList, eventList, auditEntries] = await Promise.all([
      organizationsApi.getOne(organizationId),
      organizationsApi.listMembers(organizationId),
      eventsApi.listForOrganization(organizationId),
      organizationsApi.getAuditLog(organizationId),
    ])
    organization.value = org
    members.value = memberList
    events.value = eventList
    auditLog.value = auditEntries

    if (org.country === 'UGANDA') {
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

async function handleSetMobileMoneyPayout(payload: { provider: 'MTN_MOMO_UGA' | 'AIRTEL_OAPI_UGA'; phoneNumber: string }) {
  payoutError.value = ''
  try {
    organization.value = await organizationsApi.setMobileMoneyPayout(organizationId, payload)
  } catch (err) {
    payoutError.value = extractErrorMessage(err)
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
</script>

<template>
  <DashboardLayout>
    <div v-if="loading" class="text-sm text-slate-500">Loading…</div>
    <div v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</div>

    <template v-else-if="organization">
      <h1 class="text-2xl font-semibold text-slate-900">{{ organization.name }}</h1>
      <p class="mb-6 text-sm text-slate-500">{{ organization.type }}</p>

      <!-- Payout -->
      <div v-if="canManage" class="mb-8">
        <PayoutSettingsCard
          v-if="organization.country === 'KENYA'"
          :current="organization"
          title="Payout bank account"
          description="Where money from this organization's events lands, unless an event sets its own override."
          @submit="handleSetPayout"
        />
        <MobileMoneyPayoutCard
          v-else
          :current="organization"
          @submit="handleSetMobileMoneyPayout"
        />
        <p v-if="payoutError" class="mt-2 text-sm text-red-600">{{ payoutError }}</p>
      </div>

      <!-- Withdrawals (Uganda only — PawaPay collects into a shared platform
           balance, so getting money to the organization is this explicit
           step rather than automatic charge-time routing) -->
      <section v-if="organization.country === 'UGANDA' && canManage" class="mb-8">
        <h2 class="mb-3 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Withdrawals</h2>
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-babyblue-100 bg-white p-4 shadow-sm">
          <div>
            <p class="text-xs text-slate-500">Available to withdraw</p>
            <p class="text-lg font-semibold text-babyblue-700">{{ formatMoney(withdrawalBalance, 'UGX') }}</p>
          </div>
          <button
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

      <!-- Members -->
      <section class="mb-8">
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

      <!-- Events -->
      <section>
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

      <!-- Audit log -->
      <section class="mt-8">
        <h2 class="mb-3 text-sm font-semibold tracking-wide text-babyblue-700 uppercase">Audit log</h2>
        <div
          v-if="auditLog.length === 0"
          class="rounded-2xl border border-dashed border-babyblue-200 bg-white/60 p-8 text-center text-sm text-slate-500"
        >
          No activity recorded yet.
        </div>
        <ul v-else class="space-y-1.5">
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
      </section>
    </template>
  </DashboardLayout>
</template>
