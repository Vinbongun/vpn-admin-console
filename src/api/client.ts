import createClient from "openapi-fetch";
import type { paths } from "@/api/generated";
import { sessionTokens } from "@/api/session";
import type {
  AdminAcquisitionQuery,
  AdminAuditQuery,
  AdminCustomerQuery,
  AdminDashboardQuery,
  AdminEndpointGroupQuery,
  AdminFinanceQuery,
  AdminInfrastructureEndpointQuery,
  AdminInfrastructureIncidentQuery,
  AdminOrderQuery,
  AdminPaymentLogQuery,
  AdminPaymentQuery,
  AdminPaymentsSummaryQuery,
  AdminPlanQuery,
  AdminPopularityQuery,
  AdminPromoCodeQuery,
  AdminReferralPartnerQuery,
  AdminRetentionQuery,
  AdminSubscriptionQuery,
  CreateBrand,
  CreateControlPlaneSource,
  CreateEndpointGroup,
  CreatePaymentGateway,
  CreatePaymentMethod,
  CreatePlan,
  CreateReferralPartner,
  CreateSubscription,
  CustomerDetail,
  ExtendSubscription,
  IssuedSubscriptionToken,
  PasswordLogin,
  RefundPayment,
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
  SyncSourceInventory,
  UpdateBrand,
  UpdateControlPlaneSource,
  UpdateEndpointGroup,
  UpdateInfrastructureEndpoint,
  UpdateMembership,
  UpdatePaymentGateway,
  UpdatePaymentMethod,
  UpdatePlan,
  UpdateReferralPartner,
  UpdateSubscription,
  UpsertPromoCode,
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
  createControlPlaneSource: async (body: CreateControlPlaneSource) => unwrap(await client.POST("/admin/v1/infrastructure/sources", { body, headers: staffHeaders() })),
  updateControlPlaneSource: async (sourceId: string, body: UpdateControlPlaneSource) =>
    unwrap(await client.PATCH("/admin/v1/infrastructure/sources/{id}", { params: { path: { id: sourceId } }, body, headers: staffHeaders() })),
  setControlPlaneSourceCredentials: async (sourceId: string, body: SetControlPlaneSourceCredentials) =>
    unwrap(await client.PUT("/admin/v1/infrastructure/sources/{id}/credentials", { params: { path: { id: sourceId } }, body, headers: staffHeaders() })),
  syncSource: async (sourceId: string, body: SyncSourceInventory = {}) => unwrap(await client.POST("/admin/v1/infrastructure/sources/{id}/sync", { params: { path: { id: sourceId } }, body, headers: staffHeaders() })),
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
};
