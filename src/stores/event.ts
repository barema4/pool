import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as eventsApi from '@/api/events'
import * as budgetCategoriesApi from '@/api/budgetCategories'
import * as invoicesApi from '@/api/invoices'
import * as transactionsApi from '@/api/transactions'
import type { EventDetail, BudgetCategory, Invoice, Transaction, EventStatus } from '@/types/api'

// Single source of truth for "the event currently being managed" — the
// tabbed EventDetailView's sections (budget categories, invoices,
// transactions) all read/refresh this shared context rather than each
// holding their own copy, so e.g. creating an invoice is visible everywhere
// on the page immediately.
export const useEventStore = defineStore('event', () => {
  const event = ref<EventDetail | null>(null)
  const budgetCategories = ref<BudgetCategory[]>([])
  const invoices = ref<Invoice[]>([])
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)

  async function load(eventId: string) {
    loading.value = true
    try {
      const [eventData, categories, invoiceList, transactionList] = await Promise.all([
        eventsApi.getOne(eventId),
        budgetCategoriesApi.listForEvent(eventId),
        invoicesApi.listForEvent(eventId),
        transactionsApi.listForEvent(eventId),
      ])
      event.value = eventData
      budgetCategories.value = categories
      invoices.value = invoiceList
      transactions.value = transactionList
    } finally {
      loading.value = false
    }
  }

  async function refreshBudgetCategories() {
    if (!event.value) return
    budgetCategories.value = await budgetCategoriesApi.listForEvent(event.value.id)
  }

  async function refreshInvoices() {
    if (!event.value) return
    invoices.value = await invoicesApi.listForEvent(event.value.id)
  }

  async function refreshTransactions() {
    if (!event.value) return
    transactions.value = await transactionsApi.listForEvent(event.value.id)
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
    invoices.value = []
    transactions.value = []
  }

  return {
    event,
    budgetCategories,
    invoices,
    transactions,
    loading,
    load,
    refreshBudgetCategories,
    refreshInvoices,
    refreshTransactions,
    updateEvent,
    updateStatus,
    setPayout,
    setBudgetingEnabled,
    reset,
  }
})
