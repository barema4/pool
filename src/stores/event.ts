import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as eventsApi from '@/api/events'
import * as budgetCategoriesApi from '@/api/budgetCategories'
import type { EventDetail, BudgetCategory, EventStatus } from '@/types/api'

// Single source of truth for "the event currently being managed" — the
// tabbed EventDetailView's Overview/Budget sections read/refresh this
// shared context. Transactions and invoices are paginated, filtered, and
// tab-local (only EventDetailView reads them), so they live as local
// component state there instead of here — see EventDetailView.vue.
export const useEventStore = defineStore('event', () => {
  const event = ref<EventDetail | null>(null)
  const budgetCategories = ref<BudgetCategory[]>([])
  const loading = ref(false)

  async function load(eventId: string) {
    loading.value = true
    try {
      const [eventData, categories] = await Promise.all([
        eventsApi.getOne(eventId),
        budgetCategoriesApi.listForEvent(eventId),
      ])
      event.value = eventData
      budgetCategories.value = categories
    } finally {
      loading.value = false
    }
  }

  // Re-fetches the event (including its server-computed totalReceived) —
  // called after a manual contribution or refund so the header progress
  // bar and budget-pool numbers stay live without needing the full,
  // paginated transaction list.
  async function refreshEvent() {
    if (!event.value) return
    event.value = await eventsApi.getOne(event.value.id)
  }

  async function refreshBudgetCategories() {
    if (!event.value) return
    budgetCategories.value = await budgetCategoriesApi.listForEvent(event.value.id)
  }

  async function updateEvent(payload: Parameters<typeof eventsApi.update>[1]) {
    if (!event.value) return
    const updated = await eventsApi.update(event.value.id, payload)
    event.value = { ...event.value, ...updated }
  }

  async function updateStatus(status: EventStatus) {
    if (!event.value) return
    const updated = await eventsApi.updateStatus(event.value.id, status)
    event.value = { ...event.value, ...updated }
  }

  async function setPayout(payload: Parameters<typeof eventsApi.setPayout>[1]) {
    if (!event.value) return
    const updated = await eventsApi.setPayout(event.value.id, payload)
    event.value = { ...event.value, ...updated }
  }

  async function setBudgetingEnabled(enabled: boolean) {
    if (!event.value) return
    const updated = await eventsApi.setBudgeting(event.value.id, enabled)
    event.value = { ...event.value, ...updated }
  }

  function reset() {
    event.value = null
    budgetCategories.value = []
  }

  return {
    event,
    budgetCategories,
    loading,
    load,
    refreshEvent,
    refreshBudgetCategories,
    updateEvent,
    updateStatus,
    setPayout,
    setBudgetingEnabled,
    reset,
  }
})
