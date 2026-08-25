import { z } from "zod";

export const brandStatuses = ["ACTIVE", "ARCHIVED"] as const;

export const createBrandSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]{2,32}$/, "2–32 символов: a-z, 0-9, _, -"),
  name: z.string().trim().min(1, "Укажите название"),
});
export type CreateBrandValues = z.infer<typeof createBrandSchema>;

export const brandBasicsSchema = z.object({
  name: z.string().trim().min(1, "Укажите название"),
  status: z.enum(brandStatuses),
  portalUrl: z.string().trim(),
  homepageUrl: z.string().trim(),
});
export type BrandBasicsValues = z.infer<typeof brandBasicsSchema>;

export const brandPublicSchema = z.object({
  logoUrl: z.string().trim(),
  faviconUrl: z.string().trim(),
  supportEmail: z.string().trim(),
  termsUrl: z.string().trim(),
  privacyUrl: z.string().trim(),
  siteUrl: z.string().trim(),
  profileTitle: z.string().trim().max(25, "До 25 символов — ограничение Happ"),
  announce: z.string().trim().max(200, "До 200 символов"),
  supportUrl: z.string().trim(),
});
export type BrandPublicValues = z.infer<typeof brandPublicSchema>;
