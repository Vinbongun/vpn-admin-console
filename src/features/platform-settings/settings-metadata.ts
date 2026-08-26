import type { PlatformSettingKey } from "@/api/types";

export type SettingMeta =
  | { key: PlatformSettingKey; kind: "rate_limit"; label: string; description: string; limitBounds: [number, number]; windowBounds: [number, number] }
  | { key: PlatformSettingKey; kind: "scalar"; label: string; description: string; unit: string; bounds: [number, number] };

export const settingsMeta: SettingMeta[] = [
  {
    key: "rate_limit.login",
    kind: "rate_limit",
    label: "Попытки входа",
    description: "Сколько раз подряд можно ошибиться с паролем при входе (сотрудник или клиент), прежде чем вход временно заблокируется",
    limitBounds: [1, 1000],
    windowBounds: [10, 86400],
  },
  {
    key: "rate_limit.otp_request",
    kind: "rate_limit",
    label: "Запросы кода подтверждения",
    description: "Сколько раз подряд клиент может запросить код подтверждения на email, прежде чем запросы временно заблокируются",
    limitBounds: [1, 1000],
    windowBounds: [10, 86400],
  },
  {
    key: "rate_limit.promo_code",
    kind: "rate_limit",
    label: "Попытки ввода промокода",
    description: "Сколько раз подряд можно попробовать ввести промокод при оформлении заказа, прежде чем попытки временно заблокируются",
    limitBounds: [1, 1000],
    windowBounds: [10, 86400],
  },
  {
    key: "otp.expiry_seconds",
    kind: "scalar",
    label: "Срок действия кода подтверждения",
    description: "Сколько времени действует код подтверждения, присланный на email, прежде чем сгорит",
    unit: "сек",
    bounds: [60, 3600],
  },
  {
    key: "otp.max_attempts",
    kind: "scalar",
    label: "Попытки ввода кода подтверждения",
    description: "Сколько раз можно ввести неправильный код подтверждения, прежде чем он аннулируется",
    unit: "попыток",
    bounds: [1, 20],
  },
  {
    key: "session.customer_lifetime_days",
    kind: "scalar",
    label: "Срок сессии клиента",
    description: "Сколько дней клиент остаётся авторизован в личном кабинете, не вводя пароль заново",
    unit: "дней",
    bounds: [1, 365],
  },
  {
    key: "session.staff_lifetime_hours",
    kind: "scalar",
    label: "Срок сессии сотрудника",
    description: "Сколько часов сотрудник остаётся авторизован в админке, не вводя пароль заново",
    unit: "часов",
    bounds: [1, 168],
  },
  {
    key: "device.active_window_seconds",
    kind: "scalar",
    label: "Окно активности устройства",
    description: "Насколько «свежим» должно быть последнее подключение устройства, чтобы оно считалось «недавно активным» в списке устройств клиента",
    unit: "сек",
    bounds: [30, 3600],
  },
];
