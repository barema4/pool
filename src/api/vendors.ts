import { apiClient } from './client'
import type { Vendor, VendorPayoutMethod, MobileMoneyProvider } from '@/types/api'

export function listForOrganization(organizationId: string) {
  return apiClient.get<Vendor[]>('/vendors', { params: { organizationId } }).then((r) => r.data)
}

export function create(payload: {
  organizationId: string
  name: string
  payoutMethod: VendorPayoutMethod
  bankCode?: string
  bankName?: string
  accountNumber?: string
  mobileProvider?: MobileMoneyProvider
  mobileNumber?: string
}) {
  return apiClient.post<Vendor>('/vendors', payload).then((r) => r.data)
}

export function remove(vendorId: string) {
  return apiClient.delete(`/vendors/${vendorId}`).then((r) => r.data)
}
