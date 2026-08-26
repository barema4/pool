<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import * as organizationsApi from '@/api/organizations'
import * as eventsApi from '@/api/events'
import { useOrganizationsStore } from '@/stores/organizations'
import { extractErrorMessage } from '@/api/client'
import type { Organization, OrganizationMember, EventRecord, OrgRole } from '@/types/api'

const route = useRoute()
const organizationId = route.params.organizationId as string
const orgsStore = useOrganizationsStore()

const organization = ref<Organization | null>(null)
const members = ref<OrganizationMember[]>([])
const events = ref<EventRecord[]>([])
const loading = ref(true)
const loadError = ref('')

const myRole = computed(() => orgsStore.organizations.find((o) => o.id === organizationId)?.role)
const canManage = computed(() => myRole.value === 'MAIN_ORGANIZER' || myRole.value === 'TREASURER')
const canInvite = computed(() => myRole.value === 'MAIN_ORGANIZER')

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
const inviting = ref(false)
const roles: OrgRole[] = ['MAIN_ORGANIZER', 'TREASURER', 'AUDITOR']

async function handleInvite() {
  inviteError.value = ''
  inviting.value = true
  try {
    await organizationsApi.inviteMember(organizationId, {
      email: inviteEmail.value,
      role: inviteRole.value,
    })
    inviteEmail.value = ''
    showInviteForm.value = false
    members.value = await organizationsApi.listMembers(organizationId)
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

async function handleCreateEvent() {
  eventError.value = ''
  creatingEvent.value = true
  try {
    await eventsApi.create({
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
      <h1 class="text-xl font-semibold text-slate-900">{{ organization.name }}</h1>
      <p class="mb-6 text-sm text-slate-500">{{ organization.type }}</p>

      <!-- Members -->
      <section class="mb-8">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-700">Members</h2>
          <button
            v-if="canInvite"
            type="button"
            class="text-xs font-medium text-slate-600 underline"
            @click="showInviteForm = !showInviteForm"
          >
            {{ showInviteForm ? 'Cancel' : 'Invite member' }}
          </button>
        </div>

        <form
          v-if="showInviteForm"
          class="mb-3 space-y-2 rounded-lg border border-slate-200 bg-white p-4"
          @submit.prevent="handleInvite"
        >
          <input
            v-model="inviteEmail"
            type="email"
            required
            placeholder="member@example.com"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            v-model="inviteRole"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
          </select>
          <p v-if="inviteError" class="text-sm text-red-600">{{ inviteError }}</p>
          <button
            type="submit"
            :disabled="inviting"
            class="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {{ inviting ? 'Inviting…' : 'Send invite' }}
          </button>
        </form>

        <ul class="space-y-1">
          <li
            v-for="m in members"
            :key="m.id"
            class="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <span
              >{{ m.user.name }} <span class="text-slate-400">({{ m.user.email }})</span></span
            >
            <span
              class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
              >{{ m.role }}</span
            >
          </li>
        </ul>
      </section>

      <!-- Events -->
      <section>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-700">Events</h2>
          <button
            v-if="canManage"
            type="button"
            class="text-xs font-medium text-slate-600 underline"
            @click="showEventForm = !showEventForm"
          >
            {{ showEventForm ? 'Cancel' : 'New event' }}
          </button>
        </div>

        <form
          v-if="showEventForm"
          class="mb-3 space-y-2 rounded-lg border border-slate-200 bg-white p-4"
          @submit.prevent="handleCreateEvent"
        >
          <input
            v-model="eventTitle"
            type="text"
            required
            placeholder="Event title"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            v-model="eventDescription"
            placeholder="Description (optional)"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            v-model.number="eventTargetGoal"
            type="number"
            step="0.01"
            placeholder="Target goal (optional)"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <label class="flex items-center gap-2 text-sm text-slate-700">
            <input v-model="eventIsPermanent" type="checkbox" />
            Permanent / rolling collection (no expiry, e.g. tithes)
          </label>
          <p v-if="eventError" class="text-sm text-red-600">{{ eventError }}</p>
          <button
            type="submit"
            :disabled="creatingEvent"
            class="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {{ creatingEvent ? 'Creating…' : 'Create event' }}
          </button>
        </form>

        <div v-if="events.length === 0" class="text-sm text-slate-500">No events yet.</div>
        <ul v-else class="space-y-2">
          <li v-for="evt in events" :key="evt.id">
            <RouterLink
              :to="{ name: 'event-detail', params: { eventId: evt.id } }"
              class="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
            >
              <div>
                <p class="font-medium text-slate-900">{{ evt.title }}</p>
                <p class="text-xs text-slate-500">
                  {{ evt.isPermanent ? 'Permanent' : 'Milestone' }}
                </p>
              </div>
              <span
                class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                >{{ evt.status }}</span
              >
            </RouterLink>
          </li>
        </ul>
      </section>
    </template>
  </DashboardLayout>
</template>
