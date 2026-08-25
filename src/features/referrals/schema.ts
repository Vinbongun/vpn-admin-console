import { z } from "zod";

export const partnerStatuses = ["ACTIVE", "INACTIVE"] as const;

export const partnerSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя"),
  status: z.enum(partnerStatuses),
});
export type PartnerValues = z.infer<typeof partnerSchema>;

export const discountTypes = ["PERCENT", "FIXED_PRICE"] as const;
export const promoCodeStatuses = ["ACTIVE", "INACTIVE"] as const;

export const promoCodeSchema = z
  .object({
    code: z.string().trim().toUpperCase().min(1, "Укажите код").max(40, "До 40 символов"),
    referralPartnerId: z.uuid("Выберите партнёра"),
    discountType: z.enum(discountTypes),
    discountValue: z
      .string()
      .trim()
      .min(1, "Укажите значение")
      .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, "Введите неотрицательное число"),
    payoutPercent: z
      .string()
      .trim()
      .min(1, "Укажите процент")
      .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100, "От 0 до 100"),
    brandIds: z.array(z.uuid()).min(1, "Выберите хотя бы один бренд"),
    status: z.enum(promoCodeStatuses),
  })
  .check((ctx) => {
    if (ctx.value.discountType === "PERCENT" && Number(ctx.value.discountValue) > 100) {
      ctx.issues.push({ code: "custom", message: "Процент не может быть больше 100", path: ["discountValue"], input: ctx.value.discountValue });
    }
  });
export type PromoCodeValues = z.infer<typeof promoCodeSchema>;
