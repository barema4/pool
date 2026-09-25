import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as organizationsApi from '@/api/organizations'
import type { OrganizationWithRole } from '@/types/api'

export const useOrganizationsStore = defineStore('organizations', () => {
  const organizations = ref<OrganizationWithRole[]>([])
  const loading = ref(false)

  // Feeds role lookups elsewhere in the app (OrganizationDetailView,
  // EventDetailView both do `organizations.find(o => o.id === ...)?.role`),
  // so this always fetches the caller's full set — including archived orgs,
  // uncapped by the search/pagination the Organizations list page applies to
  // its own separate fetch. pageSize is the backend's hard max; a user
  // belonging to more organizations than that is an edge case out of scope.
  async function fetchMine() {
    loading.value = true
    try {
      const result = await organizationsApi.listMine({ pageSize: 100, includeArchived: true })
      organizations.value = result.data
    } finally {
      loading.value = false
    }
  }

  async function createOrganization(
    payload: Parameters<typeof organizationsApi.create>[0],
  ) {
    const org = await organizationsApi.create(payload)
    // Creating an organization always makes the caller its MAIN_ORGANIZER
    // (enforced server-side) — the create response itself doesn't carry a
    // flat `role` field the way listMine() does, so it's added here.
    const withRole: OrganizationWithRole = { ...org, role: 'MAIN_ORGANIZER' }
    organizations.value.push(withRole)
    return withRole
  }

  return { organizations, loading, fetchMine, createOrganization }
})
