import { apiClient, publicApiClient } from './client'
import type {
  PersonalInvoice,
  PublicPersonalInvoiceView,
  ShareLinks,
  CheckoutResult,
  PaymentMethod,
} from '@/types/api'

export function listMine() {
  return apiClient.get<PersonalInvoice[]>('/personal-invoices').then((r) => r.data)
}

export function create(payload: {
  recipientName: string
  recipientEmail?: string
  recipientPhone?: string
  description?: string
  amount: number
  expiresInDays?: number
}) {
  return apiClient.post<PersonalInvoice>('/personal-invoices', payload).then((r) => r.data)
}

export function getShareLinks(id: string) {
  return apiClient.get<ShareLinks>(`/personal-invoices/${id}/share`).then((r) => r.data)
}

export function getByToken(token: string) {
  return publicApiClient
    .get<PublicPersonalInvoiceView>(`/public/personal-invoices/${token}`)
    .then((r) => r.data)
}

export function initializeCheckout(
  token: string,
  payload: {
    payerEmail: string
    payerName?: string
    payerPhone?: string
    paymentMethod?: PaymentMethod
  },
) {
  return publicApiClient
    .post<CheckoutResult>(`/public/personal-invoices/${token}/checkout`, payload)
    .then((r) => r.data)
}
