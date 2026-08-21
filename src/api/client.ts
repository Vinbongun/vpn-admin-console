import createClient from "openapi-fetch";
import type { paths } from "@/api/generated";
import { sessionTokens } from "@/api/session";
import type {
  AdminAuditQuery,
  AdminCustomerQuery,
  AdminInfrastructureEndpointQuery,
  AdminInfrastructureIncidentQuery,
  AdminPlanQuery,
  AdminSubscriptionQuery,
  AuthPrincipal,
  CreateSubscription,
  CustomerOtpRequest,
  CustomerOtpVerify,
  CustomerPasswordLogin,
  IssuedSubscriptionToken,
  PasswordLogin,
  RotateSubscriptionToken,
  SessionToken,
  StaffOtpVerify,
  StaffProfile,
  UpdateMembership,
  UpdateSubscription,
} from "@/api/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
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
const customerHeaders = () => bearer(sessionTokens.getCustomer());

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
  rotateSubscriptionToken: async (subscriptionId: string, body: RotateSubscriptionToken = {}) => unwrap<IssuedSubscriptionToken>(await client.POST("/admin/v1/subscriptions/{subscriptionId}/tokens/rotate", { params: { path: { subscriptionId } }, body, headers: staffHeaders() })),
  listCustomers: async (query: AdminCustomerQuery = {}) => unwrap(await client.GET("/admin/v1/customers", { params: { query }, headers: staffHeaders() })),
  getCustomer: async (customerId: string) => unwrap(await client.GET("/admin/v1/customers/{customerId}", { params: { path: { customerId } }, headers: staffHeaders() })),
  updateMembership: async (membershipId: string, body: UpdateMembership) => unwrap<void>(await client.PATCH("/admin/v1/brand-memberships/{membershipId}", { params: { path: { membershipId } }, body, headers: staffHeaders() })),
  listPlans: async (query: AdminPlanQuery = {}) => unwrap(await client.GET("/admin/v1/plans", { params: { query }, headers: staffHeaders() })),
  listAuditEvents: async (query: AdminAuditQuery = {}) => unwrap(await client.GET("/admin/v1/audit-events", { params: { query }, headers: staffHeaders() })),
  getInfrastructureSummary: async () => unwrap(await client.GET("/admin/v1/infrastructure/summary", { headers: staffHeaders() })),
  listControlPlaneSources: async () => unwrap(await client.GET("/admin/v1/infrastructure/sources", { headers: staffHeaders() })),
  listInfrastructureEndpoints: async (query: AdminInfrastructureEndpointQuery = {}) => unwrap(await client.GET("/admin/v1/infrastructure/endpoints", { params: { query }, headers: staffHeaders() })),
  listInfrastructureIncidents: async (query: AdminInfrastructureIncidentQuery = {}) => unwrap(await client.GET("/admin/v1/infrastructure/incidents", { params: { query }, headers: staffHeaders() })),
};

export const customerApi = {
  passwordLogin: async (body: CustomerPasswordLogin) => unwrap<SessionToken>(await client.POST("/customer/v1/auth/password/login", { body })),
  requestOtp: async (body: CustomerOtpRequest) => unwrap<void>(await client.POST("/customer/v1/auth/otp/request", { body })),
  verifyOtp: async (body: CustomerOtpVerify) => unwrap<SessionToken>(await client.POST("/customer/v1/auth/otp/verify", { body })),
  getSession: async () => unwrap<AuthPrincipal>(await client.GET("/customer/v1/auth/me", { headers: customerHeaders() })),
  logout: async () => unwrap<void>(await client.POST("/customer/v1/auth/logout", { headers: customerHeaders() })),
  setPassword: async (password: string) => unwrap<void>(await client.POST("/customer/v1/auth/password/set", { body: { password }, headers: customerHeaders() })),
  listSubscriptions: async () => unwrap(await client.GET("/customer/v1/subscriptions", { headers: customerHeaders() })),
};
