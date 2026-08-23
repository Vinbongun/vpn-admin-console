import { z } from "zod";

export const referralStatuses = ["PENDING", "CONFIRMED", "CANCELLED"] as const;
export const programStatuses = ["ACTIVE", "INACTIVE"] as const;

export const upsertProgramSchema = z.object({
  brandId: z.uuid("Выберите бренд"),
  campaignCode: z.string().trim().toUpperCase(),
  rewardPercent: z.string().min(1, "Укажите процент"),
  status: z.enum(programStatuses),
});
export type UpsertProgramValues = z.infer<typeof upsertProgramSchema>;
