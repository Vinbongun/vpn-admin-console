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

// Поля покупки (где куплена/стоимость/валюта/период/следующая оплата) убраны из формы редактирования —
// это устаревшая, довиртуальная модель "стоимость владения панелью" с тех времён, когда VPS и панель ещё
// не различались как отдельные сущности. Реальная информация о покупке теперь живёт на VPS (vps_instances).
// Статус здесь намеренно не редактируется (только отображается) — панель либо реально
// зарегистрирована нашей автоустановкой, либо это активная запись стороннего источника;
// staff не должен иметь возможность руками щёлкнуть её в ACTIVE/INACTIVE вручную.
export const updateSourceSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]{2,64}$/, "2–64 символов: A-Z, 0-9, _"),
  comment: z.string().trim().max(2000, "До 2000 символов"),
});
export type UpdateSourceValues = z.infer<typeof updateSourceSchema>;

export const healthStatuses = ["PROVISIONING", "HEALTHY", "DEGRADED", "UNHEALTHY", "DRAINING", "DISABLED", "RETIRED"] as const;

export const updateEndpointSchema = z.object({
  healthStatus: z.enum(healthStatuses, { error: "Выберите статус здоровья" }),
  comment: z.string().trim().max(2000, "До 2000 символов"),
});
export type UpdateEndpointValues = z.infer<typeof updateEndpointSchema>;
