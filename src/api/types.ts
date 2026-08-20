/** Types mirrored from vpn-platform-backend OpenAPI 0.3.0 (PR #3). */
export type ApiAudience = "customer" | "staff";

export type SessionToken = {
  accessToken: string;
  tokenType: "Bearer";
  audience: ApiAudience;
  expiresAt: string;
};

export type AuthPrincipal = {
  audience: ApiAudience;
  identityId: string;
  sessionId: string;
  email: string;
  permissions: string[];
};

export type SubscriptionStatus =
  | "PENDING"
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "EXPIRED"
  | "SUSPENDED"
  | "REVOKED";

export type SubscriptionSummary = {
  id: string;
  brandCode: string;
  planCode?: string | null;
  status: SubscriptionStatus;
  startsAt: string;
  expiresAt: string;
  revision: string;
  tokenPrefix?: string | null;
};

export type CreateSubscription = {
  brandMembershipId: string;
  planId?: string;
  status: "PENDING" | "TRIAL" | "ACTIVE";
  startsAt: string;
  expiresAt: string;
};

export type RotateSubscriptionToken = { expiresAt?: string };

export type IssuedSubscriptionToken = {
  token: string;
  tokenPrefix: string;
  expiresAt?: string | null;
};

export type PasswordLogin = { email: string; password: string };
export type StaffOtpVerify = { email: string; code: string };
export type CustomerPasswordLogin = PasswordLogin & { brandCode: string };
export type CustomerOtpRequest = { email: string; brandCode: string };
export type CustomerOtpVerify = StaffOtpVerify & { brandCode: string };
