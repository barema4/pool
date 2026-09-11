import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as organizationsApi from '@/api/organizations'
import type { OrganizationWithRole } from '@/types/api'

export const useOrganizationsStore = defineStore('organizations', () => {
  const organizations = ref<OrganizationWithRole[]>([])
  const loading = ref(false)

  async function fetchMine() {
    loading.value = true
    try {
      organizations.value = await organizationsApi.listMine()
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
