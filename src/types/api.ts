// Shapes mirroring the openpoll backend. Decimal fields (amountRequested,
// amountPaid, estimatedCost, allocatedFunds, amountSettled) come back from
// Prisma as JSON strings, not numbers — always Number(...) them before math.

export type OrgRole = 'MAIN_ORGANIZER' | 'TREASURER' | 'AUDITOR'
export type OrganizationType = 'CHURCH' | 'CHAMA' | 'SACCO' | 'COLLECTIVE' | 'EVENT_COMPANY' | 'OTHER'
export type EventStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED'
export type InvoiceStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'EXPIRED'
export type InvoiceSource = 'ORGANIZER' | 'PUBLIC_PLEDGE'
export type PaymentRail = 'MOBILE_MONEY' | 'CARD' | 'MANUAL'
// What the payer picks on our own pay page for a Kenya/Paystack event —
// passed through so Paystack's hosted checkout skips straight to that
// channel instead of showing its own picker.
export type PaymentMethod = 'card' | 'mobile_money'
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
export type PersonalInvoiceStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED'

// Determines which payment provider/currency an organization's events use.
export type OrganizationCountry = 'KENYA' | 'UGANDA'
// Uganda mobile money networks, via PawaPay. For a Uganda event this is what
// the payer picks instead of PaymentMethod (there is no card option).
export type MobileMoneyProvider = 'MTN_MOMO_UGA' | 'AIRTEL_OAPI_UGA'
export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
// Platform-operator access (reconciliation, staff management) — distinct
// from OrgRole, which is scoped per-organization. Null = regular user.
export type PlatformRole = 'OWNER' | 'STAFF'

export interface AuthUser {
  id: string
  email: string
  name: string
  platformRole: PlatformRole | null
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
  country: OrganizationCountry
  payoutMobileProvider: MobileMoneyProvider | null
  payoutMobileNumberLast4: string | null
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
  country: OrganizationCountry
  // Uganda/PawaPay payout destination — the number itself is never sent to
  // the client, only the last 4 digits (mirrors payoutAccountLast4).
  payoutMobileProvider: MobileMoneyProvider | null
  payoutMobileNumberLast4: string | null
  createdAt: string
  // Shown instead of the platform's own badge on public checkout pages.
  logoUrl: string | null
}

export interface OrganizationWithRole extends Organization {
  role: OrgRole
  // Present when this org isn't directly owned by the caller, but access
  // was granted by the named agency via AgencyClientAccess — see
  // OrganizationsView.vue, which groups these separately.
  managedViaAgency?: { id: string; name: string }
}

// A client org managed by an agency — returned by GET
// /organizations/:agencyOrgId/clients.
export type ClientOrganization = Organization

// One staff member's granted role for a specific client org — returned by
// GET /organizations/:agencyOrgId/clients/:clientOrgId/access.
export interface AgencyClientAccessEntry {
  id: string
  userId: string
  role: OrgRole
  createdAt: string
  user: { id: string; name: string; email: string }
}

// Agency plan billing status — returned by GET /organizations/:id/billing.
// The first linked client is always free; agencyPlanExpiresAt gates linking
// a 2nd+ (see AgencyClientsService.assertCanLinkAnotherClient on the backend).
export interface BillingStatus {
  agencyPlanExpiresAt: string | null
  hasActivePlan: boolean
  clientCount: number
  freeClientAvailable: boolean
  hasBillingAccount: boolean
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
  organization: { country: OrganizationCountry } | null
  // Computed server-side, since the transactions and budget category lists
  // are both paginated and can no longer be summed client-side.
  totalReceived: string
  // Real, gateway-settled money only (excludes MANUAL/off-app entries) —
  // what the Budget tab shows/caps allocation against, since only this can
  // later be disbursed for real to a vendor. totalReceived above stays
  // all-inclusive for the goal-progress bar.
  totalAllocatable: string
  totalAllocated: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface BudgetCategory {
  id: string
  eventId: string
  name: string
  estimatedCost: string
  allocatedFunds: string
  createdAt: string
  // Which vendor gets paid for this line item — set via the Budget tab's
  // vendor picker once the event's budget is FUNDED.
  vendorId: string | null
}

export type BudgetApprovalStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'DECLINED' | 'FUNDED'

export interface BudgetApproval {
  id: string
  eventId: string
  status: BudgetApprovalStatus
  submittedByUserId: string | null
  submittedAt: string | null
  decidedByUserId: string | null
  decidedAt: string | null
  declineReason: string | null
  fundedByUserId: string | null
  fundedAt: string | null
}

export type VendorPayoutMethod = 'BANK_ACCOUNT' | 'MOBILE_MONEY'

export interface Vendor {
  id: string
  organizationId: string
  name: string
  payoutMethod: VendorPayoutMethod
  payoutBankName: string | null
  payoutAccountName: string | null
  payoutAccountLast4: string | null
  payoutMobileProvider: MobileMoneyProvider | null
  payoutMobileNumberLast4: string | null
  createdAt: string
  // The vendor's actual owning org — matches whichever organizationId you
  // asked listForOrganization() for when directly owned, or the managing
  // agency's when this vendor was inherited via an AgencyClientLink.
  organization: { id: string; name: string }
}

export interface BudgetTemplateItem {
  id: string
  name: string
  // Exactly one is set — percentage-of-goal (as a 0-1 fraction) or a fixed
  // amount, mirroring BudgetCategory's own estimatedCost computation.
  percentage: string | null
  fixedAmount: string | null
  sortOrder: number
}

export interface BudgetTemplate {
  id: string
  organizationId: string
  name: string
  createdAt: string
  items: BudgetTemplateItem[]
}

export type DisbursementTransferType = 'VENDOR_PAYOUT' | 'ORGANIZER_WITHDRAWAL'
export type DisbursementStatus = 'PENDING' | 'QUEUED' | 'SUCCESS' | 'FAILED'

export interface Disbursement {
  id: string
  eventId: string
  budgetCategoryId: string | null
  vendorId: string | null
  transferType: DisbursementTransferType
  recipientName: string
  status: DisbursementStatus
  failureReason: string | null
  amount: string
  initiatedBy: string
  approvedBy: string | null
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
  event: {
    id: string
    title: string
    isPermanent: boolean
    organization: { country: OrganizationCountry; logoUrl: string | null } | null
  }
  platformFeePercent: number
  // Only set for a fixed-amount invoice (amountRequested !== null) — an
  // open/permanent link has no amount to precompute a fee against yet, so
  // the payer page computes a live preview itself off platformFeePercent.
  platformFeeAmount?: number
  totalChargeAmount?: number
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
  // Set only for paymentRail: 'MANUAL' — money recorded as received outside
  // the app. Excluded from Uganda withdrawal balances; still counts toward
  // an event's collected total and budget-allocation pool.
  note: string | null
  // Kenya/Paystack only — a chargeback against this transaction. An open
  // dispute doesn't affect amountSettled/status; only a resolution of
  // 'merchant-accepted' (lost) flips the transaction to REFUNDED separately.
  disputes: { status: string; resolution: string | null }[]
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
  // 'redirect': send the browser to authorizationUrl (Paystack). 'pending':
  // no redirect — a payment prompt was pushed straight to the payer's phone
  // (PawaPay); show a "check your phone" state instead.
  status: 'redirect' | 'pending'
  authorizationUrl?: string
  accessCode?: string
  reference: string
}

export interface Receipt {
  receiptNumber: string
  amountPaid: number
  platformFeeAmount: number
  totalCharged: number
  paymentRail: PaymentRail
  paidAt: string
  payerName: string | null
  categoryTag: string | null
  event: { id: string; title: string }
  organization: { name: string; logoUrl: string | null } | null
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
  relatedOrganizationId: string | null
}

export interface PublicPersonalInvoiceView extends PersonalInvoice {
  issuer: { id: string; name: string; country: OrganizationCountry }
  platformFeePercent: number
  platformFeeAmount: number
  totalChargeAmount: number
}

export interface Withdrawal {
  id: string
  organizationId: string
  amount: string
  status: WithdrawalStatus
  providerReference: string | null
  requestedByUserId: string
  failureReason: string | null
  createdAt: string
  completedAt: string | null
}

export interface WithdrawalSummary {
  balance: number
  withdrawals: Withdrawal[]
}

export interface ApiErrorBody {
  statusCode: number
  message: string | string[]
  error?: string
}

export interface ProviderBalance {
  currency: string
  balance: number
}

export interface ReconciliationReport {
  kenya: {
    liveBalances: ProviderBalance[]
    expectedPlatformFees: number
    caveat: string
  }
  uganda: {
    liveBalances: (ProviderBalance & { country: string })[]
    totalOwedToOrgs: number
    totalPlatformFees: number
    expectedTotal: number
    drift: number
  }
}

export interface PlatformStaffMember {
  id: string
  name: string
  email: string
  platformRole: PlatformRole
  createdAt: string
}
