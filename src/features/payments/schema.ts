import { z } from "zod";

export const paymentStatuses = ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"] as const;
export const gatewayStatuses = ["ACTIVE", "INACTIVE"] as const;
export const logLevels = ["INFO", "ERROR"] as const;
export const logEventTypes = ["CHARGE_ATTEMPT", "CHARGE_RESULT", "REFUND_REQUESTED", "REFUND_RESULT"] as const;

const codePattern = /^[A-Z0-9_]{2,64}$/;

export const createGatewaySchema = z.object({
  code: z.string().trim().toUpperCase().regex(codePattern, "2–64 символов: A-Z, 0-9, _"),
  name: z.string().trim().min(1, "Укажите название"),
  status: z.enum(gatewayStatuses),
});
export type CreateGatewayValues = z.infer<typeof createGatewaySchema>;

export const updateGatewaySchema = z.object({
  code: z.string().trim().toUpperCase().regex(codePattern, "2–64 символов: A-Z, 0-9, _"),
  name: z.string().trim().min(1, "Укажите название"),
  status: z.enum(gatewayStatuses),
});
export type UpdateGatewayValues = z.infer<typeof updateGatewaySchema>;

export const paymentMethodSchema = z.object({
  code: z.string().trim().toUpperCase().regex(codePattern, "2–64 символов: A-Z, 0-9, _"),
  name: z.string().trim().min(1, "Укажите название"),
  status: z.enum(gatewayStatuses),
});
export type PaymentMethodValues = z.infer<typeof paymentMethodSchema>;

export const updateMethodSchema = z.object({
  name: z.string().trim().min(1, "Укажите название"),
  status: z.enum(gatewayStatuses),
});
export type UpdateMethodValues = z.infer<typeof updateMethodSchema>;
