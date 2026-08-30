import createClient from "openapi-fetch";
import type { paths } from "@/api/generated";
import { sessionTokens } from "@/api/session";
import type {
  AddVpsPaymentMethod,
  AdminAcquisitionQuery,
  AdminActiveUsersSeriesQuery,
  AdminArpuLtvQuery,
  AdminAuditQuery,
  AdminChurnSeriesQuery,
  AdminCohortRetentionQuery,
  AdminConversionSeriesQuery,
  AdminCustomerQuery,
  AdminDashboardQuery,
  AdminDomainQuery,
  AdminEndpointGroupQuery,
  AdminFinanceQuery,
  AdminInfraHealthSeriesQuery,
  AdminInfrastructureEndpointQuery,
  AdminInfrastructureIncidentQuery,
  AdminOrderQuery,
  AdminPaymentLogQuery,
  AdminPaymentQuery,
  AdminPaymentsSummaryQuery,
  AdminPlanQuery,
  AdminPopularityQuery,
  AdminPromoCodeQuery,
  AdminReferralFunnelSeriesQuery,
  AdminReferralPartnerQuery,
  AdminRetentionQuery,
  AdminRevenueSeriesQuery,
  AdminSubscriptionQuery,
  AdminVpsInstanceQuery,
  AdminZonePricingQuery,
  AssignDomain,
  ChangeVpsServerPassword,
  ConfigProfileSummary,
  ControlPlaneSourceDetail,
  CreateBrand,
  CreateControlPlaneSource,
  CreateEndpointGroup,
  CreatePaymentGateway,
  CreatePaymentMethod,
  CreatePlan,
  CreateReferralPartner,
  CreateSubscription,
  CreateVpsRegistrarAccount,
  CustomerDetail,
  CustomerHistory,
  Domain,
  ExtendSubscription,
  GenerateDomainCandidatesRequest,
  InstallRemnawaveNode,
  IssuedSubscriptionToken,
  PasswordLogin,
  PlatformSetting,
  PlatformSettingKey,
  PurchaseBatchKickoff,
  PurchaseBatchStatus,
  PurchaseDomainsRequest,
  PurchaseVpsRequest,
  RefundPayment,
  RegisterVpsInstance,
  RegistrarAccountSummary,
  RegistrarServerSummary,
  ReplaceBrandPaymentMethods,
  ReplaceEndpointGroupMembers,
  ReplaceEndpointGroupPlans,
  RotateSubscriptionToken,
  SessionToken,
  SetControlPlaneSourceCredentials,
  SetPaymentGatewayCredentials,
  SetPlanPrice,
  StaffOtpVerify,
  StaffProfile,
  SyncVpsTariffCatalog,
  UpdateBrand,
  UpdateControlPlaneSource,
  UpdateCustomerContact,
  UpdateDomainMetadata,
  UpdateEndpointGroup,
  UpdateInfrastructureEndpoint,
  UpdateMembership,
  UpdatePaymentGateway,
  UpdatePaymentMethod,
  UpdatePlan,
  UpdatePlatformSetting,
  UpdateReferralPartner,
  UpdateSubscription,
  UpdateVpsInstanceMetadata,
  UpdateVpsPaymentMethod,
  UpdateVpsRegistrarCredentials,
  UpdateZonePricing,
  UpsertPromoCode,
  VpsAutomationJobRef,
  VpsInstance,
  VpsInstanceDetail,
  VpsPaymentMethod,
  VpsPurchaseOperation,
  VpsRegistrarAccount,
  VpsHistoryEntry,
  VpsTariff,
  ZonePricing,
} from "@/api/types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const client = createClient<paths>({ baseUrl: API_URL, fetch: (input) => globalThis.fetch(input) });

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly details?: unknown) {
    super(`Admin API request failed (${status})`);
    this.name = "ApiError";
  }
}

type Result<T> = { data?: T; error?: unknown; response: Response };
async function unwrap<T>({ data, error, response }: Result<T>): Promise<T> {
  if (!response.ok) throw new ApiError(response.status, error);
  return data as T;
}

const bearer = (token: string | null) => token ? { Authorization: `Bearer ${token}` } : {};
const staffHeaders = () => bearer(sessionTokens.getStaff());

export const adminApi = {
  passwordLogin: async (body: PasswordLogin) => unwrap<void>(await client.POST("/admin/v1/auth/password/login", { body })),
  verifyOtp: async (body: StaffOtpVerify) => unwrap<SessionToken>(await client.POST("/admin/v1/auth/otp/verify", { body })),
  getSession: async () => unwrap<StaffProfile>(await client.GET("/admin/v1/auth/me", { headers: staffHeaders() })),
  logout: async () => unwrap<void>(await client.POST("/admin/v1/auth/logout", { headers: staffHeaders() })),
  listSubscriptions: async (query: AdminSubscriptionQuery = {}) => unwrap(await client.GET("/admin/v1/subscriptions", { params: { query }, headers: staffHeaders() })),
  createSubscription: async (body: CreateSubscription) => unwrap(await client.POST("/admin/v1/subscriptions", { body, headers: staffHeaders() })),
  getSubscription: async (subscriptionId: string) => unwrap(await client.GET("/admin/v1/subscriptions/{subscriptionId}", { params: { path: { subscriptionId } }, headers: staffHeaders() })),
  updateSubscription: async (subscriptionId: string, body: UpdateSubscription) => unwrap<void>(await client.PATCH("/admin/v1/subscriptions/{subscriptionId}", { params: { path: { subscriptionId } }, body, headers: staffHeaders() })),
  revokeSubscription: async (subscriptionId: string, reason: string) => unwrap<void>(await client.DELETE("/admin/v1/subscriptions/{subscriptionId}", { params: { path: { subscriptionId } }, body: { reason }, headers: staffHeaders() })),
  extendSubscription: async (subscriptionId: string, body: ExtendSubscription) => unwrap(await client.POST("/admin/v1/subscriptions/{subscriptionId}/extend", { params: { path: { subscriptionId } }, body, headers: staffHeaders() })),
  rotateSubscriptionToken: async (subscriptionId: string, body: RotateSubscriptionToken = {}) => unwrap<IssuedSubscriptionToken>(await client.POST("/admin/v1/subscriptions/{subscriptionId}/tokens/rotate", { params: { path: { subscriptionId } }, body, headers: staffHeaders() })),
  listCustomers: async (query: AdminCustomerQuery = {}) => unwrap(await client.GET("/admin/v1/customers", { params: { query }, headers: staffHeaders() })),
  getCustomer: async (customerId: string): Promise<CustomerDetail> => unwrap(await client.GET("/admin/v1/customers/{customerId}", { params: { path: { customerId } }, headers: staffHeaders() })),
  updateMembership: async (membershipId: string, body: UpdateMembership) => unwrap<void>(await client.PATCH("/admin/v1/brand-memberships/{membershipId}", { params: { path: { membershipId } }, body, headers: staffHeaders() })),
  updateCustomerStatus: async (customerId: string, body: UpdateMembership) => unwrap<void>(await client.PATCH("/admin/v1/customers/{customerId}/status", { params: { path: { customerId } }, body, headers: staffHeaders() })),
  getCustomerHistory: async (customerId: string): Promise<CustomerHistory> => unwrap(await client.GET("/admin/v1/customers/{customerId}/history", { params: { path: { customerId } }, headers: staffHeaders() })),
  updateCustomerContact: async (customerId: string, body: UpdateCustomerContact) => unwrap(await client.PATCH("/admin/v1/customers/{customerId}/contact", { params: { path: { customerId } }, body, headers: staffHeaders() })),
  listPlans: async (query: AdminPlanQuery = {}) => unwrap(await client.GET("/admin/v1/plans", { params: { query }, headers: staffHeaders() })),
  createPlan: async (body: CreatePlan) => unwrap(await client.POST("/admin/v1/plans", { body, headers: staffHeaders() })),
  updatePlan: async (planId: string, body: UpdatePlan) => unwrap(await client.PATCH("/admin/v1/plans/{id}", { params: { path: { id: planId } }, body, headers: staffHeaders() })),
  setPlanPrice: async (planId: string, body: SetPlanPrice) => unwrap(await client.POST("/admin/v1/plans/{id}/prices", { params: { path: { id: planId } }, body, headers: staffHeaders() })),
  listBrands: async () => unwrap(await client.GET("/admin/v1/brands", { headers: staffHeaders() })),
  createBrand: async (body: CreateBrand) => unwrap(await client.POST("/admin/v1/brands", { body, headers: staffHeaders() })),
  updateBrand: async (brandId: string, body: UpdateBrand) => unwrap(await client.PATCH("/admin/v1/brands/{id}", { params: { path: { id: brandId } }, body, headers: staffHeaders() })),
  listEndpointGroups: async (query: AdminEndpointGroupQuery = {}) =>
    unwrap(await client.GET("/admin/v1/infrastructure/endpoint-groups", { params: { query: { page: 1, pageSize: 100, ...query } }, headers: staffHeaders() })),
  getEndpointGroup: async (groupId: string) => unwrap(await client.GET("/admin/v1/infrastructure/endpoint-groups/{id}", { params: { path: { id: groupId } }, headers: staffHeaders() })),
  createEndpointGroup: async (body: CreateEndpointGroup) => unwrap(await client.POST("/admin/v1/infrastructure/endpoint-groups", { body, headers: staffHeaders() })),
  updateEndpointGroup: async (groupId: string, body: UpdateEndpointGroup) => unwrap(await client.PATCH("/admin/v1/infrastructure/endpoint-groups/{id}", { params: { path: { id: groupId } }, body, headers: staffHeaders() })),
  replaceEndpointGroupMembers: async (groupId: string, body: ReplaceEndpointGroupMembers) => unwrap(await client.PUT("/admin/v1/infrastructure/endpoint-groups/{id}/members", { params: { path: { id: groupId } }, body, headers: staffHeaders() })),
  replaceEndpointGroupPlans: async (groupId: string, body: ReplaceEndpointGroupPlans) => unwrap(await client.PUT("/admin/v1/infrastructure/endpoint-groups/{id}/plans", { params: { path: { id: groupId } }, body, headers: staffHeaders() })),
  listAuditEvents: async (query: AdminAuditQuery = {}) => unwrap(await client.GET("/admin/v1/audit-events", { params: { query }, headers: staffHeaders() })),
  getInfrastructureSummary: async () => unwrap(await client.GET("/admin/v1/infrastructure/summary", { headers: staffHeaders() })),
  listControlPlaneSources: async () => unwrap(await client.GET("/admin/v1/infrastructure/sources", { headers: staffHeaders() })),
  getControlPlaneSourceDetail: async (sourceId: string) =>
    unwrap<ControlPlaneSourceDetail>(await client.GET("/admin/v1/infrastructure/sources/{id}", { params: { path: { id: sourceId } }, headers: staffHeaders() })),
  createControlPlaneSource: async (body: CreateControlPlaneSource) => unwrap(await client.POST("/admin/v1/infrastructure/sources", { body, headers: staffHeaders() })),
  updateControlPlaneSource: async (sourceId: string, body: UpdateControlPlaneSource) =>
    unwrap(await client.PATCH("/admin/v1/infrastructure/sources/{id}", { params: { path: { id: sourceId } }, body, headers: staffHeaders() })),
  setControlPlaneSourceCredentials: async (sourceId: string, body: SetControlPlaneSourceCredentials) =>
    unwrap(await client.PUT("/admin/v1/infrastructure/sources/{id}/credentials", { params: { path: { id: sourceId } }, body, headers: staffHeaders() })),
  listControlPlaneSourceConfigProfiles: async (sourceId: string) =>
    unwrap<ConfigProfileSummary[]>(await client.GET("/admin/v1/infrastructure/sources/{id}/config-profiles", { params: { path: { id: sourceId } }, headers: staffHeaders() })),
  syncSource: async (sourceId: string) => unwrap(await client.POST("/admin/v1/infrastructure/sources/{id}/sync", { params: { path: { id: sourceId } }, headers: staffHeaders() })),
  // Manual counterpart to the remnawave-status-check cron - REMNAWAVE-only, checks live node connectivity and opens/resolves infrastructure_incidents accordingly.
  checkNodesNow: async (sourceId: string) =>
    unwrap<{ checked: number; changed: number }>(await client.POST("/admin/v1/infrastructure/sources/{id}/check-nodes-now", { params: { path: { id: sourceId } }, headers: staffHeaders() })),
  listInfrastructureEndpoints: async (query: AdminInfrastructureEndpointQuery = {}) => unwrap(await client.GET("/admin/v1/infrastructure/endpoints", { params: { query }, headers: staffHeaders() })),
  updateInfrastructureEndpoint: async (endpointId: string, body: UpdateInfrastructureEndpoint) =>
    unwrap(await client.PATCH("/admin/v1/infrastructure/endpoints/{id}", { params: { path: { id: endpointId } }, body, headers: staffHeaders() })),
  listInfrastructureIncidents: async (query: AdminInfrastructureIncidentQuery = {}) => unwrap(await client.GET("/admin/v1/infrastructure/incidents", { params: { query }, headers: staffHeaders() })),
  listOrders: async (query: AdminOrderQuery = {}) => unwrap(await client.GET("/admin/v1/orders", { params: { query }, headers: staffHeaders() })),
  getFinanceSummary: async (query: AdminFinanceQuery = {}) => unwrap(await client.GET("/admin/v1/finance/summary", { params: { query }, headers: staffHeaders() })),
  getRetentionSummary: async (query: AdminRetentionQuery = {}) => unwrap(await client.GET("/admin/v1/retention/summary", { params: { query }, headers: staffHeaders() })),
  getDashboardOverview: async (query: AdminDashboardQuery = {}) => unwrap(await client.GET("/admin/v1/dashboard/overview", { params: { query }, headers: staffHeaders() })),
  getDashboardPopularity: async (query: AdminPopularityQuery = {}) => unwrap(await client.GET("/admin/v1/dashboard/popularity", { params: { query }, headers: staffHeaders() })),
  getAcquisitionStats: async (query: AdminAcquisitionQuery = {}) => unwrap(await client.GET("/admin/v1/acquisitions/stats", { params: { query }, headers: staffHeaders() })),
  getDashboardRevenueSeries: async (query: AdminRevenueSeriesQuery = {}) => unwrap(await client.GET("/admin/v1/dashboard/revenue-series", { params: { query }, headers: staffHeaders() })),
  getDashboardCohortRetention: async (query: AdminCohortRetentionQuery = {}) => unwrap(await client.GET("/admin/v1/dashboard/cohort-retention", { params: { query }, headers: staffHeaders() })),
  getDashboardActiveUsersSeries: async (query: AdminActiveUsersSeriesQuery = {}) => unwrap(await client.GET("/admin/v1/dashboard/active-users-series", { params: { query }, headers: staffHeaders() })),
  getDashboardConversionSeries: async (query: AdminConversionSeriesQuery = {}) => unwrap(await client.GET("/admin/v1/dashboard/conversion-series", { params: { query }, headers: staffHeaders() })),
  getDashboardChurnSeries: async (query: AdminChurnSeriesQuery = {}) => unwrap(await client.GET("/admin/v1/dashboard/churn-series", { params: { query }, headers: staffHeaders() })),
  getDashboardArpuLtv: async (query: AdminArpuLtvQuery = {}) => unwrap(await client.GET("/admin/v1/dashboard/arpu-ltv", { params: { query }, headers: staffHeaders() })),
  getDashboardInfraHealthSeries: async (query: AdminInfraHealthSeriesQuery = {}) => unwrap(await client.GET("/admin/v1/dashboard/infra-health-series", { params: { query }, headers: staffHeaders() })),
  getDashboardReferralFunnelSeries: async (query: AdminReferralFunnelSeriesQuery = {}) => unwrap(await client.GET("/admin/v1/dashboard/referral-funnel-series", { params: { query }, headers: staffHeaders() })),
  listDevices: async (subscriptionId: string) => unwrap(await client.GET("/admin/v1/subscriptions/{subscriptionId}/devices", { params: { path: { subscriptionId } }, headers: staffHeaders() })),
  removeDevice: async (subscriptionId: string, deviceId: string) => unwrap<void>(await client.DELETE("/admin/v1/subscriptions/{subscriptionId}/devices/{deviceId}", { params: { path: { subscriptionId, deviceId } }, headers: staffHeaders() })),
  listReferralPartners: async (query: AdminReferralPartnerQuery = {}) => unwrap(await client.GET("/admin/v1/referral-partners", { params: { query }, headers: staffHeaders() })),
  createReferralPartner: async (body: CreateReferralPartner) => unwrap(await client.POST("/admin/v1/referral-partners", { body, headers: staffHeaders() })),
  updateReferralPartner: async (partnerId: string, body: UpdateReferralPartner) =>
    unwrap(await client.PATCH("/admin/v1/referral-partners/{id}", { params: { path: { id: partnerId } }, body, headers: staffHeaders() })),
  listPromoCodes: async (query: AdminPromoCodeQuery = {}) => unwrap(await client.GET("/admin/v1/promo-codes", { params: { query }, headers: staffHeaders() })),
  createPromoCode: async (body: UpsertPromoCode) => unwrap(await client.POST("/admin/v1/promo-codes", { body, headers: staffHeaders() })),
  updatePromoCode: async (promoCodeId: string, body: UpsertPromoCode) =>
    unwrap(await client.PATCH("/admin/v1/promo-codes/{id}", { params: { path: { id: promoCodeId } }, body, headers: staffHeaders() })),
  getReferralPartnerStats: async () => unwrap(await client.GET("/admin/v1/referrals/stats", { headers: staffHeaders() })),
  listPayments: async (query: AdminPaymentQuery = {}) => unwrap(await client.GET("/admin/v1/payments", { params: { query }, headers: staffHeaders() })),
  getPaymentsSummary: async (query: AdminPaymentsSummaryQuery = {}) => unwrap(await client.GET("/admin/v1/payments/summary", { params: { query }, headers: staffHeaders() })),
  getPayment: async (paymentId: string) => unwrap(await client.GET("/admin/v1/payments/{id}", { params: { path: { id: paymentId } }, headers: staffHeaders() })),
  refundPayment: async (paymentId: string, body: RefundPayment = {}) => unwrap(await client.POST("/admin/v1/payments/{id}/refund", { params: { path: { id: paymentId } }, body, headers: staffHeaders() })),
  listPaymentLogs: async (query: AdminPaymentLogQuery = {}) => unwrap(await client.GET("/admin/v1/payment-logs", { params: { query }, headers: staffHeaders() })),
  listPaymentGateways: async () => unwrap(await client.GET("/admin/v1/payment-gateways", { headers: staffHeaders() })),
  createPaymentGateway: async (body: CreatePaymentGateway) => unwrap(await client.POST("/admin/v1/payment-gateways", { body, headers: staffHeaders() })),
  updatePaymentGateway: async (gatewayId: string, body: UpdatePaymentGateway) =>
    unwrap(await client.PATCH("/admin/v1/payment-gateways/{id}", { params: { path: { id: gatewayId } }, body, headers: staffHeaders() })),
  setPaymentGatewayCredentials: async (gatewayId: string, body: SetPaymentGatewayCredentials) =>
    unwrap(await client.PUT("/admin/v1/payment-gateways/{id}/credentials", { params: { path: { id: gatewayId } }, body, headers: staffHeaders() })),
  createPaymentMethod: async (gatewayId: string, body: CreatePaymentMethod) =>
    unwrap(await client.POST("/admin/v1/payment-gateways/{id}/methods", { params: { path: { id: gatewayId } }, body, headers: staffHeaders() })),
  updatePaymentMethod: async (gatewayId: string, methodId: string, body: UpdatePaymentMethod) =>
    unwrap(await client.PATCH("/admin/v1/payment-gateways/{id}/methods/{methodId}", { params: { path: { id: gatewayId, methodId } }, body, headers: staffHeaders() })),
  listBrandPaymentMethods: async (brandId: string) => unwrap(await client.GET("/admin/v1/brands/{id}/payment-methods", { params: { path: { id: brandId } }, headers: staffHeaders() })),
  replaceBrandPaymentMethods: async (brandId: string, body: ReplaceBrandPaymentMethods) =>
    unwrap(await client.PUT("/admin/v1/brands/{id}/payment-methods", { params: { path: { id: brandId } }, body, headers: staffHeaders() })),
  listPlatformSettings: async () => (await unwrap(await client.GET("/admin/v1/platform-settings", { headers: staffHeaders() }))) as PlatformSetting[],
  updatePlatformSetting: async (key: PlatformSettingKey, body: UpdatePlatformSetting) =>
    (await unwrap(await client.PATCH("/admin/v1/platform-settings/{key}", { params: { path: { key } }, body, headers: staffHeaders() }))) as PlatformSetting,
  listDomains: async (query: AdminDomainQuery = {}) =>
    unwrap<{ domains: Domain[]; stats: Record<string, number> }>(await client.GET("/admin/v1/domains", { params: { query }, headers: staffHeaders() })),
  listDomainRegistrarAccounts: async () => unwrap<RegistrarAccountSummary[]>(await client.GET("/admin/v1/domains/registrar-accounts", { headers: staffHeaders() })),
  getDomain: async (domainId: string) => unwrap<Domain>(await client.GET("/admin/v1/domains/{id}", { params: { path: { id: domainId } }, headers: staffHeaders() })),
  listDomainDnsRecords: async (domainId: string) => unwrap<unknown[]>(await client.GET("/admin/v1/domains/{id}/dns-records", { params: { path: { id: domainId } }, headers: staffHeaders() })),
  // Kicks off an async batch (Porkbun rate-limits to ~1 registration/10s) - poll getDomainPurchaseBatchStatus for the real per-domain outcome.
  purchaseDomains: async (body: PurchaseDomainsRequest) => unwrap<PurchaseBatchKickoff>(await client.POST("/admin/v1/domains/purchase", { body, headers: staffHeaders() })),
  getDomainPurchaseBatchStatus: async (batchId: string) =>
    unwrap<PurchaseBatchStatus>(await client.GET("/admin/v1/domains/purchase-batches/{batchId}", { params: { path: { batchId } }, headers: staffHeaders() })),
  renewDomain: async (domainId: string) => unwrap(await client.POST("/admin/v1/domains/{id}/renew", { params: { path: { id: domainId } }, headers: staffHeaders() })),
  setDomainAutoRenew: async (domainId: string, enabled: boolean) =>
    unwrap<void>(await client.PATCH("/admin/v1/domains/{id}/auto-renew", { params: { path: { id: domainId } }, body: { enabled }, headers: staffHeaders() })),
  syncDomain: async (domainId: string) => unwrap<void>(await client.POST("/admin/v1/domains/{id}/sync", { params: { path: { id: domainId } }, headers: staffHeaders() })),
  assignDomain: async (domainId: string, body: AssignDomain) =>
    unwrap<Domain>(await client.POST("/admin/v1/domains/{id}/assign", { params: { path: { id: domainId } }, body, headers: staffHeaders() })),
  unlinkDomain: async (domainId: string) => unwrap<void>(await client.POST("/admin/v1/domains/{id}/unlink", { params: { path: { id: domainId } }, headers: staffHeaders() })),
  archiveDomain: async (domainId: string) => unwrap<void>(await client.POST("/admin/v1/domains/{id}/archive", { params: { path: { id: domainId } }, headers: staffHeaders() })),
  updateDomainMetadata: async (domainId: string, body: UpdateDomainMetadata) =>
    unwrap<Domain>(await client.PATCH("/admin/v1/domains/{id}", { params: { path: { id: domainId } }, body, headers: staffHeaders() })),
  generateDomainCandidates: async (body: GenerateDomainCandidatesRequest) =>
    unwrap<{ fqdns: string[] }>(await client.POST("/admin/v1/domains/generate-candidates", { body, headers: staffHeaders() })),
  checkDomainAvailability: async (registrarAccountId: string, fqdns: string[]) =>
    unwrap(await client.POST("/admin/v1/domains/check-availability", { body: { registrarAccountId, fqdns }, headers: staffHeaders() })),
  listZonePricing: async (query: AdminZonePricingQuery) => unwrap<ZonePricing[]>(await client.GET("/admin/v1/domains/zone-pricing", { params: { query }, headers: staffHeaders() })),
  syncZonePricing: async (registrarAccountId: string) =>
    unwrap<{ synced?: number }>(await client.POST("/admin/v1/domains/zone-pricing/sync", { body: { registrarAccountId }, headers: staffHeaders() })),
  updateZonePricing: async (tld: string, body: UpdateZonePricing) =>
    unwrap<ZonePricing>(await client.PATCH("/admin/v1/domains/zone-pricing/{tld}", { params: { path: { tld } }, body, headers: staffHeaders() })),
  checkZoneRequirements: async (tld: string, registrarAccountId: string) =>
    unwrap(await client.POST("/admin/v1/domains/zone-pricing/{tld}/check-requirements", { params: { path: { tld } }, body: { registrarAccountId }, headers: staffHeaders() })),

  listVpsInstances: async (query: AdminVpsInstanceQuery = {}) => unwrap<VpsInstance[]>(await client.GET("/admin/v1/vps-instances", { params: { query }, headers: staffHeaders() })),
  registerVpsInstance: async (body: RegisterVpsInstance) => unwrap<VpsInstance>(await client.POST("/admin/v1/vps-instances", { body, headers: staffHeaders() })),
  getVpsInstance: async (id: string) => unwrap<VpsInstanceDetail>(await client.GET("/admin/v1/vps-instances/{id}", { params: { path: { id } }, headers: staffHeaders() })),
  updateVpsInstanceMetadata: async (id: string, body: UpdateVpsInstanceMetadata) =>
    unwrap<VpsInstance>(await client.PATCH("/admin/v1/vps-instances/{id}", { params: { path: { id } }, body, headers: staffHeaders() })),
  bootstrapVpsInstance: async (id: string) => unwrap<VpsAutomationJobRef>(await client.POST("/admin/v1/vps-instances/{id}/bootstrap", { params: { path: { id } }, headers: staffHeaders() })),
  testVpsInstance: async (id: string) => unwrap<VpsAutomationJobRef>(await client.POST("/admin/v1/vps-instances/{id}/test", { params: { path: { id } }, headers: staffHeaders() })),
  healthCheckVpsInstance: async (id: string) => unwrap<VpsAutomationJobRef>(await client.POST("/admin/v1/vps-instances/{id}/health-check", { params: { path: { id } }, headers: staffHeaders() })),
  // Idempotent Ansible role - installs our automation SSH key on a server that so far only has the registrar's root password.
  installSshKeyOnVpsInstance: async (id: string) =>
    unwrap<VpsAutomationJobRef>(await client.POST("/admin/v1/vps-instances/{id}/install-ssh-key", { params: { path: { id } }, headers: staffHeaders() })),
  // POST .../update triggers an Ansible re-provision job - distinct from the PATCH above, which only edits purchase metadata.
  runVpsInstanceUpdate: async (id: string) => unwrap<VpsAutomationJobRef>(await client.POST("/admin/v1/vps-instances/{id}/update", { params: { path: { id } }, headers: staffHeaders() })),
  backupVpsInstance: async (id: string) => unwrap<VpsAutomationJobRef>(await client.POST("/admin/v1/vps-instances/{id}/backup", { params: { path: { id } }, headers: staffHeaders() })),
  installPanelOnVpsInstance: async (id: string) => unwrap<VpsAutomationJobRef>(await client.POST("/admin/v1/vps-instances/{id}/install-panel", { params: { path: { id } }, headers: staffHeaders() })),
  // Self-contained: creates a new control_plane_source with a freshly-minted API token, no manual registration step afterward (unlike install-panel/3x-ui).
  installRemnawavePanelOnVpsInstance: async (id: string) =>
    unwrap<VpsAutomationJobRef>(await client.POST("/admin/v1/vps-instances/{id}/install-remnawave-panel", { params: { path: { id } }, headers: staffHeaders() })),
  // Attaches to an EXISTING REMNAWAVE panel - backend calls that panel's own API (create node + mint SECRET_KEY) before enqueueing the SSH job.
  installRemnawaveNodeOnVpsInstance: async (id: string, body: InstallRemnawaveNode) =>
    unwrap<VpsAutomationJobRef>(await client.POST("/admin/v1/vps-instances/{id}/install-remnawave-node", { params: { path: { id } }, body, headers: staffHeaders() })),
  startVpsServices: async (id: string) => unwrap<VpsAutomationJobRef>(await client.POST("/admin/v1/vps-instances/{id}/start", { params: { path: { id } }, headers: staffHeaders() })),
  stopVpsServices: async (id: string) => unwrap<VpsAutomationJobRef>(await client.POST("/admin/v1/vps-instances/{id}/stop", { params: { path: { id } }, headers: staffHeaders() })),
  // No request body - the backend enqueues the job on the id alone; typed confirmation (host/IP) is a frontend-only safety gate.
  decommissionVpsInstance: async (id: string) => unwrap<VpsAutomationJobRef>(await client.POST("/admin/v1/vps-instances/{id}/decommission", { params: { path: { id } }, headers: staffHeaders() })),
  // Staff-facing equivalent of the internal-only scheduler cron - enqueues HEALTH_CHECK for every ACTIVE VPS in one request.
  healthCheckAllVpsInstances: async () => unwrap<{ enqueued: number }>(await client.POST("/admin/v1/vps-instances/health-check-all", { headers: staffHeaders() })),

  listVpsRegistrarAccounts: async () => unwrap<VpsRegistrarAccount[]>(await client.GET("/admin/v1/vps-registrar-accounts", { headers: staffHeaders() })),
  createVpsRegistrarAccount: async (body: CreateVpsRegistrarAccount) => unwrap<VpsRegistrarAccount>(await client.POST("/admin/v1/vps-registrar-accounts", { body, headers: staffHeaders() })),
  updateVpsRegistrarCredentials: async (id: string, body: UpdateVpsRegistrarCredentials) =>
    unwrap<{ ok?: boolean }>(await client.POST("/admin/v1/vps-registrar-accounts/{id}/credentials", { params: { path: { id } }, body, headers: staffHeaders() })),
  // Deactivates every other account of this providerType first - "1 активный аккаунт на регистратора" is DB-enforced.
  activateVpsRegistrarAccount: async (id: string) => unwrap<VpsRegistrarAccount>(await client.POST("/admin/v1/vps-registrar-accounts/{id}/activate", { params: { path: { id } }, headers: staffHeaders() })),
  syncVpsRegistrarBalance: async (id: string) => unwrap<VpsRegistrarAccount>(await client.POST("/admin/v1/vps-registrar-accounts/{id}/sync-balance", { params: { path: { id } }, headers: staffHeaders() })),
  // Servers bought on the registrar's side, including ones never registered into vps_instances (e.g. bought outside this pipeline) - sync only ever reconciles already-linked instances.
  listVpsRegistrarServers: async (id: string) =>
    unwrap<RegistrarServerSummary[]>(await client.GET("/admin/v1/vps-registrar-accounts/{id}/servers", { params: { path: { id } }, headers: staffHeaders() })),
  importVpsRegistrarServer: async (id: string, itemId: string) =>
    unwrap<{ vpsInstanceId: string }>(await client.POST("/admin/v1/vps-registrar-accounts/{id}/servers/{itemId}/import", { params: { path: { id, itemId } }, headers: staffHeaders() })),
  listVpsPaymentMethods: async (id: string) => unwrap<VpsPaymentMethod[]>(await client.GET("/admin/v1/vps-registrar-accounts/{id}/payment-methods", { params: { path: { id } }, headers: staffHeaders() })),
  addVpsPaymentMethod: async (id: string, body: AddVpsPaymentMethod) =>
    unwrap<VpsPaymentMethod>(await client.POST("/admin/v1/vps-registrar-accounts/{id}/payment-methods", { params: { path: { id } }, body, headers: staffHeaders() })),
  updateVpsPaymentMethod: async (id: string, methodId: string, body: UpdateVpsPaymentMethod) =>
    unwrap<VpsPaymentMethod>(await client.PATCH("/admin/v1/vps-registrar-accounts/{id}/payment-methods/{methodId}", { params: { path: { id, methodId } }, body, headers: staffHeaders() })),
  deleteVpsPaymentMethod: async (id: string, methodId: string) =>
    unwrap<{ ok?: boolean }>(await client.DELETE("/admin/v1/vps-registrar-accounts/{id}/payment-methods/{methodId}", { params: { path: { id, methodId } }, headers: staffHeaders() })),
  syncVpsTariffCatalog: async (id: string, body: SyncVpsTariffCatalog = {}) =>
    unwrap<{ synced?: number }>(await client.POST("/admin/v1/vps-registrar-accounts/{id}/sync-catalog", { params: { path: { id } }, body, headers: staffHeaders() })),
  listVpsTariffCatalog: async (id: string, datacenter?: string) =>
    unwrap<VpsTariff[]>(await client.GET("/admin/v1/vps-registrar-accounts/{id}/catalog", { params: { path: { id }, query: { datacenter } }, headers: staffHeaders() })),
  purchaseVps: async (id: string, body: PurchaseVpsRequest) =>
    unwrap<VpsPurchaseOperation>(await client.POST("/admin/v1/vps-registrar-accounts/{id}/purchase", { params: { path: { id } }, body, headers: staffHeaders() })),
  getVpsPurchaseOperation: async (id: string) => unwrap<VpsPurchaseOperation>(await client.GET("/admin/v1/vps-purchase-operations/{id}", { params: { path: { id } }, headers: staffHeaders() })),
  advanceVpsPurchaseOperation: async (id: string) =>
    unwrap<VpsPurchaseOperation>(await client.POST("/admin/v1/vps-purchase-operations/{id}/advance", { params: { path: { id } }, headers: staffHeaders() })),
  rebootVpsServer: async (id: string, itemId: string) =>
    unwrap<{ ok?: boolean }>(await client.POST("/admin/v1/vps-registrar-accounts/{id}/servers/{itemId}/reboot", { params: { path: { id, itemId } }, headers: staffHeaders() })),
  changeVpsServerPassword: async (id: string, itemId: string, body: ChangeVpsServerPassword) =>
    unwrap<{ ok?: boolean }>(await client.POST("/admin/v1/vps-registrar-accounts/{id}/servers/{itemId}/change-password", { params: { path: { id, itemId } }, body, headers: staffHeaders() })),
  getVpsServerHistory: async (id: string, itemId: string) =>
    unwrap<VpsHistoryEntry[]>(await client.GET("/admin/v1/vps-registrar-accounts/{id}/servers/{itemId}/history", { params: { path: { id, itemId } }, headers: staffHeaders() })),
};
