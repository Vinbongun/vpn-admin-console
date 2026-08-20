import { sessionTokens } from "@/api/session";
import type {
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
  SubscriptionSummary,
} from "@/api/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) throw new ApiError(response.status, `Admin API request failed (${response.status})`);
  if (response.status === 204 || response.headers.get("content-length") === "0") return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const json = (value: unknown) => JSON.stringify(value);

export const adminApi = {
  passwordLogin: (input: PasswordLogin) => request<void>("/admin/v1/auth/password/login", { method: "POST", body: json(input) }),
  verifyOtp: (input: StaffOtpVerify) => request<SessionToken>("/admin/v1/auth/otp/verify", { method: "POST", body: json(input) }),
  getSession: () => request<AuthPrincipal>("/admin/v1/auth/me", {}, sessionTokens.getStaff()),
  logout: () => request<void>("/admin/v1/auth/logout", { method: "POST" }, sessionTokens.getStaff()),
  listSubscriptions: () => request<SubscriptionSummary[]>("/admin/v1/subscriptions", {}, sessionTokens.getStaff()),
  createSubscription: (input: CreateSubscription) => request<SubscriptionSummary>("/admin/v1/subscriptions", { method: "POST", body: json(input) }, sessionTokens.getStaff()),
  rotateSubscriptionToken: (subscriptionId: string, input: RotateSubscriptionToken = {}) => request<IssuedSubscriptionToken>(`/admin/v1/subscriptions/${encodeURIComponent(subscriptionId)}/tokens/rotate`, { method: "POST", body: json(input) }, sessionTokens.getStaff()),
};

export const customerApi = {
  passwordLogin: (input: CustomerPasswordLogin) => request<SessionToken>("/customer/v1/auth/password/login", { method: "POST", body: json(input) }),
  requestOtp: (input: CustomerOtpRequest) => request<void>("/customer/v1/auth/otp/request", { method: "POST", body: json(input) }),
  verifyOtp: (input: CustomerOtpVerify) => request<SessionToken>("/customer/v1/auth/otp/verify", { method: "POST", body: json(input) }),
  getSession: () => request<AuthPrincipal>("/customer/v1/auth/me", {}, sessionTokens.getCustomer()),
  logout: () => request<void>("/customer/v1/auth/logout", { method: "POST" }, sessionTokens.getCustomer()),
  setPassword: (password: string) => request<void>("/customer/v1/auth/password/set", { method: "POST", body: json({ password }) }, sessionTokens.getCustomer()),
  listSubscriptions: () => request<SubscriptionSummary[]>("/customer/v1/subscriptions", {}, sessionTokens.getCustomer()),
};
