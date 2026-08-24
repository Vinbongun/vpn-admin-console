import { z } from "zod";

export const providerTypes = ["REMNAWAVE", "3X_UI", "HYSTERIA2", "WIREGUARD"] as const;
export const sourceStatuses = ["ACTIVE", "INACTIVE"] as const;

export const createSourceSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_]{2,64}$/, "2–64 символов: A-Z, 0-9, _"),
    providerType: z.enum(providerTypes, { error: "Выберите тип провайдера" }),
    status: z.enum(sourceStatuses),
    baseUrl: z.string().trim(),
    apiToken: z.string().trim(),
  })
  .check((ctx) => {
    const { baseUrl, apiToken } = ctx.value;
    if (Boolean(baseUrl) === Boolean(apiToken)) return;
    if (!baseUrl) ctx.issues.push({ code: "custom", message: "Укажите вместе с API-токеном", path: ["baseUrl"], input: baseUrl });
    if (!apiToken) ctx.issues.push({ code: "custom", message: "Укажите вместе с базовым URL", path: ["apiToken"], input: apiToken });
  });
export type CreateSourceValues = z.infer<typeof createSourceSchema>;

export const rotateCredentialsSchema = z.object({
  baseUrl: z.string().trim().min(1, "Укажите base URL"),
  apiToken: z.string().trim().min(1, "Укажите API-токен"),
});
export type RotateCredentialsValues = z.infer<typeof rotateCredentialsSchema>;

export const billingPeriods = ["MONTHLY", "YEARLY", "ONE_TIME", "OTHER"] as const;

export const updateSourceSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]{2,64}$/, "2–64 символов: A-Z, 0-9, _"),
  status: z.enum(sourceStatuses),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === "" || /^[A-Z]{2}$/.test(value), "2 буквы (ISO alpha-2) или пусто"),
  comment: z.string().trim().max(2000, "До 2000 символов"),
  purchasedFrom: z.string().trim().max(200, "До 200 символов"),
  costAmount: z
    .string()
    .trim()
    .refine((value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0), "Введите неотрицательное число"),
  costCurrency: z.string().trim().toUpperCase().max(8, "До 8 символов"),
  billingPeriod: z.enum(["", ...billingPeriods]),
  nextPaymentAt: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Формат ГГГГ-ММ-ДД"),
});
export type UpdateSourceValues = z.infer<typeof updateSourceSchema>;

export const healthStatuses = ["PROVISIONING", "HEALTHY", "DEGRADED", "UNHEALTHY", "DRAINING", "DISABLED", "RETIRED"] as const;

export const updateEndpointSchema = z.object({
  healthStatus: z.enum(healthStatuses, { error: "Выберите статус здоровья" }),
  comment: z.string().trim().max(2000, "До 2000 символов"),
});
export type UpdateEndpointValues = z.infer<typeof updateEndpointSchema>;
