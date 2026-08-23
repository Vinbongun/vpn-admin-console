import { z } from "zod";

export const subscriptionStatuses = ["PENDING", "TRIAL", "ACTIVE", "PAST_DUE", "EXPIRED", "SUSPENDED", "REVOKED"] as const;

export const createSubscriptionSchema = z.object({
  brandMembershipId: z.uuid("Выберите привязку к бренду"),
  planId: z.string(),
  status: z.enum(["PENDING", "TRIAL", "ACTIVE"]),
  startsAt: z.string().min(1, "Укажите начало"),
  expiresAt: z.string().min(1, "Укажите окончание"),
});
export type CreateSubscriptionValues = z.infer<typeof createSubscriptionSchema>;
