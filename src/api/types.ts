import type { components, operations } from "@/api/generated";

type Schemas = components["schemas"];

export type AuthPrincipal = Schemas["AuthPrincipal"];
export type StaffProfile = Schemas["StaffProfile"];
export type SessionToken = Schemas["SessionToken"];
export type PasswordLogin = Schemas["PasswordLogin"];
export type StaffOtpVerify = Schemas["OtpVerify"];
export type CustomerPasswordLogin = Schemas["CustomerPasswordLogin"];
export type CustomerOtpRequest = Schemas["CustomerOtpRequest"];
export type CustomerOtpVerify = Schemas["CustomerOtpVerify"];
export type SubscriptionSummary = Schemas["SubscriptionSummary"];
export type SubscriptionDetail = Schemas["SubscriptionDetail"];
export type SubscriptionPage = Schemas["SubscriptionPage"];
export type CreateSubscription = Schemas["CreateSubscription"];
export type UpdateSubscription = Schemas["UpdateSubscription"];
export type RotateSubscriptionToken = Schemas["RotateSubscriptionToken"];
export type IssuedSubscriptionToken = Schemas["IssuedSubscriptionToken"];
export type CustomerSummary = Schemas["CustomerSummary"];
export type BrandMembershipSummary = Schemas["BrandMembershipSummary"];
export type CustomerDetail = Omit<Schemas["CustomerDetail"], "memberships"> & { memberships: BrandMembershipSummary[] };
export type SubscriptionTokenSummary = Schemas["SubscriptionTokenSummary"];
export type CustomerSubscriptionSummary = Schemas["CustomerSubscriptionSummary"];
export type CustomerHistoryEvent = Schemas["CustomerHistoryEvent"];
export type CustomerHistory = Schemas["CustomerHistory"];
export type UpdateCustomerContact = NonNullable<operations["updateAdminCustomerContact"]["requestBody"]>["content"]["application/json"];
export type CustomerPage = Schemas["CustomerPage"];
export type UpdateMembership = Schemas["UpdateMembership"];
export type PlanSummary = Schemas["PlanSummary"];
export type PlanPage = Schemas["PlanPage"];
export type AuditEventSummary = Schemas["AuditEventSummary"];
export type AuditEventPage = Schemas["AuditEventPage"];
export type InfrastructureSummary = Schemas["InfrastructureSummary"];
export type ControlPlaneSourceSummary = Schemas["ControlPlaneSourceSummary"];
export type CountryReferenceEntry = Schemas["CountryReferenceEntry"];
export type InfrastructureEndpointSummary = Schemas["InfrastructureEndpointSummary"];
export type InfrastructureEndpointPage = Schemas["InfrastructureEndpointPage"];
export type InfrastructureIncidentSummary = Schemas["InfrastructureIncidentSummary"];
export type InfrastructureIncidentPage = Schemas["InfrastructureIncidentPage"];
export type BrandDetail = Schemas["BrandDetail"];
export type EndpointGroupSummary = Schemas["EndpointGroupSummary"];
export type EndpointGroupListItem = Schemas["EndpointGroupListItem"];
export type EndpointGroupPage = Schemas["EndpointGroupPage"];
export type EndpointGroupDetail = Schemas["EndpointGroupDetail"];
export type CreateEndpointGroup = Schemas["CreateEndpointGroup"];
export type UpdateEndpointGroup = Schemas["UpdateEndpointGroup"];
export type ReplaceEndpointGroupMembers = Schemas["ReplaceEndpointGroupMembers"];
export type ReplaceEndpointGroupPlans = Schemas["ReplaceEndpointGroupPlans"];

export type AdminSubscriptionQuery = NonNullable<operations["listAdminSubscriptions"]["parameters"]["query"]>;
export type AdminCustomerQuery = NonNullable<operations["listAdminCustomers"]["parameters"]["query"]>;
export type AdminPlanQuery = NonNullable<operations["listAdminPlans"]["parameters"]["query"]>;
export type AdminAuditQuery = NonNullable<operations["listAdminAuditEvents"]["parameters"]["query"]>;
export type AdminInfrastructureEndpointQuery = NonNullable<operations["listInfrastructureEndpoints"]["parameters"]["query"]>;
export type AdminInfrastructureIncidentQuery = NonNullable<operations["listInfrastructureIncidents"]["parameters"]["query"]>;
export type AdminEndpointGroupQuery = NonNullable<operations["listEndpointGroups"]["parameters"]["query"]>;
export type UpdateBrand = NonNullable<operations["updateAdminBrand"]["requestBody"]>["content"]["application/json"];
// profileTitle accepts an explicit null too (to clear the override back to the brand-name default via the
// backend's jsonb merge) - the generated type only allows string because the OpenAPI schema doesn't document
// the null case. UpdateBrand itself is left matching the schema; callers that need to send null cast at the call site.
export type CreateBrand = NonNullable<operations["createAdminBrand"]["requestBody"]>["content"]["application/json"];
export type SetPlanPrice = NonNullable<operations["setPlanPrice"]["requestBody"]>["content"]["application/json"];
export type CreatePlan = NonNullable<operations["createAdminPlan"]["requestBody"]>["content"]["application/json"];
export type UpdatePlan = NonNullable<operations["updateAdminPlan"]["requestBody"]>["content"]["application/json"];
export type ExtendSubscription = Schemas["ExtendSubscription"];
export type CreateControlPlaneSource = operations["createControlPlaneSource"]["requestBody"]["content"]["application/json"];
export type SetControlPlaneSourceCredentials = operations["setControlPlaneSourceCredentials"]["requestBody"]["content"]["application/json"];
export type UpdateControlPlaneSource = operations["updateControlPlaneSource"]["requestBody"]["content"]["application/json"];
export type UpdateInfrastructureEndpoint = operations["updateInfrastructureEndpoint"]["requestBody"]["content"]["application/json"];
export type OrderSummary = Schemas["OrderSummary"];
export type OrderPage = Schemas["OrderPage"];
export type FinanceSummary = Schemas["FinanceSummary"];
export type AdminOrderQuery = NonNullable<operations["listAdminOrders"]["parameters"]["query"]>;
export type RetentionSummary = Schemas["RetentionSummary"];
export type DeviceSummary = Schemas["DeviceSummary"];
export type ReferralPartner = Schemas["ReferralPartner"];
export type PromoCode = Schemas["PromoCode"];
export type PromoCodePage = Schemas["PromoCodePage"];
export type UpsertPromoCode = Schemas["UpsertPromoCode"];
export type ReferralPartnerStats = Schemas["ReferralPartnerStats"];
export type AdminPromoCodeQuery = NonNullable<operations["listPromoCodes"]["parameters"]["query"]>;
export type AdminReferralPartnerQuery = NonNullable<operations["listReferralPartners"]["parameters"]["query"]>;
export type CreateReferralPartner = operations["createReferralPartner"]["requestBody"]["content"]["application/json"];
export type UpdateReferralPartner = operations["updateReferralPartner"]["requestBody"]["content"]["application/json"];
export type CurrencyAmount = Schemas["CurrencyAmount"];
export type DashboardOverview = Schemas["DashboardOverview"];
export type DashboardPopularity = Schemas["DashboardPopularity"];
export type AdminFinanceQuery = NonNullable<operations["getFinanceSummary"]["parameters"]["query"]>;
export type AdminRetentionQuery = NonNullable<operations["getRetentionSummary"]["parameters"]["query"]>;
export type AdminDashboardQuery = NonNullable<operations["getDashboardOverview"]["parameters"]["query"]>;
export type AdminPopularityQuery = NonNullable<operations["getDashboardPopularity"]["parameters"]["query"]>;
export type AcquisitionStatsRow = Schemas["AcquisitionStatsRow"];
export type AdminAcquisitionQuery = NonNullable<operations["getAcquisitionStats"]["parameters"]["query"]>;

export type RevenueSeriesPoint = Schemas["RevenueSeriesPoint"];
export type CohortRetentionRow = Schemas["CohortRetentionRow"];
export type ActiveUsersSeriesPoint = Schemas["ActiveUsersSeriesPoint"];
export type ConversionSeriesPoint = Schemas["ConversionSeriesPoint"];
export type ChurnSeriesPoint = Schemas["ChurnSeriesPoint"];
export type ArpuLtvPoint = Schemas["ArpuLtvPoint"];
export type InfraHealthSeriesPoint = Schemas["InfraHealthSeriesPoint"];
export type ReferralFunnelSeriesPoint = Schemas["ReferralFunnelSeriesPoint"];
export type AdminRevenueSeriesQuery = NonNullable<operations["getDashboardRevenueSeries"]["parameters"]["query"]>;
export type AdminCohortRetentionQuery = NonNullable<operations["getDashboardCohortRetention"]["parameters"]["query"]>;
export type AdminActiveUsersSeriesQuery = NonNullable<operations["getDashboardActiveUsersSeries"]["parameters"]["query"]>;
export type AdminConversionSeriesQuery = NonNullable<operations["getDashboardConversionSeries"]["parameters"]["query"]>;
export type AdminChurnSeriesQuery = NonNullable<operations["getDashboardChurnSeries"]["parameters"]["query"]>;
export type AdminArpuLtvQuery = NonNullable<operations["getDashboardArpuLtv"]["parameters"]["query"]>;
export type AdminInfraHealthSeriesQuery = NonNullable<operations["getDashboardInfraHealthSeries"]["parameters"]["query"]>;
export type AdminReferralFunnelSeriesQuery = NonNullable<operations["getDashboardReferralFunnelSeries"]["parameters"]["query"]>;

export type PaymentSummary = Schemas["PaymentSummary"];
export type PaymentPage = Schemas["PaymentPage"];
export type PaymentDetail = Schemas["PaymentDetail"];
export type PaymentGatewayLog = Schemas["PaymentGatewayLog"];
export type PaymentLogPage = Schemas["PaymentLogPage"];
export type PaymentsSummary = Schemas["PaymentsSummary"];
export type PaymentGateway = Schemas["PaymentGateway"];
export type PaymentMethod = Schemas["PaymentMethod"];
export type BrandPaymentMethod = Schemas["BrandPaymentMethod"];
export type AdminPaymentQuery = NonNullable<operations["listPayments"]["parameters"]["query"]>;
export type AdminPaymentsSummaryQuery = NonNullable<operations["getPaymentsSummary"]["parameters"]["query"]>;
export type AdminPaymentLogQuery = NonNullable<operations["listPaymentLogs"]["parameters"]["query"]>;
export type RefundPayment = NonNullable<operations["refundPayment"]["requestBody"]>["content"]["application/json"];
export type RefundPaymentResult = operations["refundPayment"]["responses"]["201"]["content"]["application/json"];
export type CreatePaymentGateway = operations["createPaymentGateway"]["requestBody"]["content"]["application/json"];
export type UpdatePaymentGateway = operations["updatePaymentGateway"]["requestBody"]["content"]["application/json"];
export type SetPaymentGatewayCredentials = operations["setPaymentGatewayCredentials"]["requestBody"]["content"]["application/json"];
export type CreatePaymentMethod = operations["createPaymentMethod"]["requestBody"]["content"]["application/json"];
export type UpdatePaymentMethod = operations["updatePaymentMethod"]["requestBody"]["content"]["application/json"];
export type ReplaceBrandPaymentMethods = operations["replaceBrandPaymentMethods"]["requestBody"]["content"]["application/json"];

export type PlatformSettingKey =
  | "rate_limit.login"
  | "rate_limit.otp_request"
  | "rate_limit.promo_code"
  | "otp.expiry_seconds"
  | "otp.max_attempts"
  | "session.customer_lifetime_days"
  | "session.staff_lifetime_hours"
  | "device.active_window_seconds"
  | "vps_automation.ssh_public_key";
export type RateLimitValue = { limit: number; windowSeconds: number };
// The generated PlatformSetting.value is `unknown` (the schema documents the shape only in
// prose) - narrow it here per-key: rate_limit.* is { limit, windowSeconds }, most others are a
// bare integer, vps_automation.ssh_public_key is a bare string (read-only, never edited via UI).
export type PlatformSetting = Omit<Schemas["PlatformSetting"], "key" | "value"> & {
  key: PlatformSettingKey;
  value: RateLimitValue | number | string;
};
export type UpdatePlatformSetting = { value: RateLimitValue | number };

export type Domain = Schemas["Domain"];
export type AssignDomain = Schemas["AssignDomain"];
export type RegistrarAccountSummary = Schemas["RegistrarAccountSummary"];
export type PurchaseDomainItem = Schemas["PurchaseDomainItem"];
export type PurchaseDomainsRequest = Schemas["PurchaseDomainsRequest"];
export type PurchaseBatchItemResult = Schemas["PurchaseBatchItemResult"];
export type PurchaseBatchKickoff = Schemas["PurchaseBatchKickoff"];
export type PurchaseBatchStatusItem = Schemas["PurchaseBatchStatusItem"];
export type PurchaseBatchStatus = Schemas["PurchaseBatchStatus"];
export type DomainStatus = Domain["status"];
export type AdminDomainQuery = NonNullable<operations["listDomains"]["parameters"]["query"]>;
export type UpdateDomainMetadata = NonNullable<operations["updateDomainMetadata"]["requestBody"]>["content"]["application/json"];

export type ZonePricing = Schemas["ZonePricing"];
export type AdminZonePricingQuery = operations["listZonePricing"]["parameters"]["query"];
export type UpdateZonePricing = NonNullable<operations["updateZonePricing"]["requestBody"]>["content"]["application/json"];
export type CheckZoneRequirementsResult = operations["checkZoneRequirements"]["responses"]["201"]["content"]["application/json"];
export type GenerateDomainCandidatesRequest = NonNullable<operations["generateDomainCandidates"]["requestBody"]>["content"]["application/json"];
export type CheckDomainAvailabilityResult = operations["checkDomainAvailability"]["responses"]["201"]["content"]["application/json"][number];

export type VpsInstance = Schemas["VpsInstance"];
export type VpsInstanceDetail = Schemas["VpsInstanceDetail"];
export type VpsDeployedProtocol = Schemas["VpsDeployedProtocol"];
export type VpsAutomationReportSummary = Schemas["VpsAutomationReportSummary"];
export type VpsAutomationJobRef = Schemas["VpsAutomationJobRef"];
export type RegisterVpsInstance = Schemas["RegisterVpsInstance"];
export type UpdateVpsInstanceMetadata = Schemas["UpdateVpsInstanceMetadata"];
export type AdminVpsInstanceQuery = NonNullable<operations["listVpsInstances"]["parameters"]["query"]>;
export type VpsRegistrarAccount = Schemas["VpsRegistrarAccount"];
export type VpsPaymentMethod = Schemas["VpsPaymentMethod"];
export type VpsTariff = Schemas["VpsTariff"];
export type VpsPurchaseOperation = Schemas["VpsPurchaseOperation"];
export type VpsHistoryEntry = Schemas["VpsHistoryEntry"];
export type CreateVpsRegistrarAccount = NonNullable<operations["createVpsRegistrarAccount"]["requestBody"]>["content"]["application/json"];
export type UpdateVpsRegistrarCredentials = NonNullable<operations["updateVpsRegistrarCredentials"]["requestBody"]>["content"]["application/json"];
export type AddVpsPaymentMethod = NonNullable<operations["addVpsPaymentMethod"]["requestBody"]>["content"]["application/json"];
export type SyncVpsTariffCatalog = NonNullable<operations["syncVpsTariffCatalog"]["requestBody"]>["content"]["application/json"];
export type PurchaseVpsRequest = NonNullable<operations["purchaseVps"]["requestBody"]>["content"]["application/json"];
export type ChangeVpsServerPassword = NonNullable<operations["changeVpsServerPassword"]["requestBody"]>["content"]["application/json"];
export type UpdateVpsPaymentMethod = NonNullable<operations["updateVpsPaymentMethod"]["requestBody"]>["content"]["application/json"];
export type RegistrarServerSummary = Schemas["RegistrarServerSummary"];
export type InstallRemnawaveNode = Schemas["InstallRemnawaveNode"];
export type InstallReverseProxy = Schemas["InstallReverseProxy"];
export type ControlPlaneSourceDetail = Schemas["ControlPlaneSourceDetail"];
export type RemnawaveNodeSummary = Schemas["RemnawaveNodeSummary"];
export type ConfigProfileSummary = Schemas["ConfigProfileSummary"];
