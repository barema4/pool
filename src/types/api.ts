// Shapes mirroring the openpoll backend. Decimal fields (amountRequested,
// amountPaid, estimatedCost, allocatedFunds, amountSettled) come back from
// Prisma as JSON strings, not numbers — always Number(...) them before math.

export type OrgRole = 'MAIN_ORGANIZER' | 'TREASURER' | 'AUDITOR'
export type OrganizationType = 'CHURCH' | 'CHAMA' | 'SACCO' | 'COLLECTIVE' | 'OTHER'
export type EventStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED'
export type InvoiceStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'EXPIRED'
export type InvoiceSource = 'ORGANIZER' | 'PUBLIC_PLEDGE'
export type PaymentRail = 'MOBILE_MONEY' | 'CARD'
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED'
export type PersonalInvoiceStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED'

export interface AuthUser {
  id: string
  email: string
  name: string
}

export interface Bank {
  name: string
  code: string
}

export interface PayoutDetails {
  payoutBankName: string | null
  payoutAccountName: string | null
  payoutAccountLast4: string | null
}

export interface UserProfile extends AuthUser, PayoutDetails {
  createdAt: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse extends TokenPair {
  user: AuthUser
}

export interface Organization extends PayoutDetails {
  id: string
  name: string
  type: OrganizationType
  createdAt: string
}

export interface OrganizationWithRole extends Organization {
  role: OrgRole
}

export interface OrganizationMember {
  id: string
  userId: string
  organizationId: string
  role: OrgRole
  createdAt: string
  user: { id: string; name: string; email: string }
}

// Returned by POST /organizations/:id/members — a raw OrganizationMember when
// the invited email already has an account, or this shape when it doesn't
// (an OrganizationInvitation was created and an accept-link emailed instead).
export type InviteMemberResult = OrganizationMember | { status: 'invited'; email: string; role: OrgRole }

export interface AuditLogEntry {
  id: string
  action: string
  timestamp: string
  payloadSnapshot: Record<string, unknown> | null
  user: { id: string; name: string; email: string } | null
  event: { id: string; title: string } | null
}

export interface EventRecord extends PayoutDetails {
  id: string
  organizationId: string | null
  title: string
  description: string | null
  coverImageUrl: string | null
  targetGoal: string | null
  isPermanent: boolean
  status: EventStatus
  // Off by default — a simple collection has no line items to fund. Turn on
  // for an event like a wedding that needs money allocated to categories.
  budgetingEnabled: boolean
  createdAt: string
  // Present only on the response right after creation — the secureToken of
  // the shareable link auto-generated alongside the event.
  defaultLinkToken?: string
}

export interface EventDetail extends EventRecord {
  budgetCategories: BudgetCategory[]
}

export interface BudgetCategory {
  id: string
  eventId: string
  name: string
  estimatedCost: string
  allocatedFunds: string
  createdAt: string
}

export interface Invoice {
  id: string
  eventId: string
  contributorName: string | null
  contributorEmail: string | null
  contributorPhone: string | null
  source: InvoiceSource
  secureToken: string
  amountRequested: string | null
  amountPaid: string
  status: InvoiceStatus
  expiresAt: string | null
  categoryTag: string | null
  createdAt: string
}

export interface PublicInvoiceView extends Invoice {
  event: { id: string; title: string; isPermanent: boolean }
}

export interface Transaction {
  id: string
  invoiceId: string | null
  eventId: string
  providerReference: string
  paymentRail: PaymentRail
  amountSettled: string
  categoryTag: string | null
  status: TransactionStatus
  timestamp: string
}

export interface ShareLinks {
  checkoutUrl: string
  whatsapp: { available: boolean; url: string | null }
  email: { available: boolean; url: string | null }
}

export interface ContributorEntry {
  invoiceId: string
  contributorName: string | null
  contributorPhone?: string | null
  amountRequested: number
  amountPaid: number
  remaining: number
  source: InvoiceSource
}

export interface ContributorSummary {
  buckets: {
    pledged: ContributorEntry[]
    partiallyPaid: ContributorEntry[]
    fullyPaid: ContributorEntry[]
    expired: ContributorEntry[]
  }
  totals: { pledged: number; received: number }
  text: string
}

export interface CheckoutResult {
  authorizationUrl: string
  accessCode: string
  reference: string
}

export interface Receipt {
  receiptNumber: string
  amountPaid: number
  paymentRail: PaymentRail
  paidAt: string
  payerName: string | null
  categoryTag: string | null
  event: { id: string; title: string }
  organization: { name: string } | null
  invoiceRemainingBalance: number | null
}

export interface PersonalInvoice {
  id: string
  issuerId: string
  recipientName: string
  recipientEmail: string | null
  recipientPhone: string | null
  description: string | null
  amount: string
  amountPaid: string
  secureToken: string
  status: PersonalInvoiceStatus
  expiresAt: string | null
  paidAt: string | null
  createdAt: string
}

export interface PublicPersonalInvoiceView extends PersonalInvoice {
  issuer: { id: string; name: string }
}

export interface ApiErrorBody {
  statusCode: number
  message: string | string[]
  error?: string
}
