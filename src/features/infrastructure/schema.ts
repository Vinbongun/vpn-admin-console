import { z } from "zod";

export const providerTypes = ["REMNAWAVE", "3X_UI", "HYSTERIA2", "WIREGUARD"] as const;
export const sourceStatuses = ["ACTIVE", "INACTIVE"] as const;

export const createSourceSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]{2,64}$/, "2–64 символов: A-Z, 0-9, _"),
  providerType: z.enum(providerTypes, { error: "Выберите тип провайдера" }),
  status: z.enum(sourceStatuses),
});
export type CreateSourceValues = z.infer<typeof createSourceSchema>;
