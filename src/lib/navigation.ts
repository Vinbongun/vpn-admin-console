import {
  Activity,
  BookOpen,
  Building2,
  CircleDollarSign,
  FileClock,
  Gauge,
  Gift,
  Network,
  Users,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Gauge;
  permission?: string;
  items?: { label: string; href: string }[];
};

export const navigation = [
  { label: "Обзор", href: "/", icon: Gauge },
  { label: "Пользователи", href: "/users", icon: Users, permission: "customers.read" },
  { label: "Подписки", href: "/subscriptions", icon: Activity, permission: "subscriptions.read" },
  {
    label: "Справочники",
    href: "/reference",
    icon: BookOpen,
    permission: "brands.read",
    items: [
      { label: "Бренды", href: "/reference#brands" },
      { label: "Тарифы", href: "/reference#plans" },
      { label: "Группы endpoint'ов", href: "/reference#endpoint-groups" },
    ],
  },
  { label: "Бренды", href: "/brands", icon: Building2, permission: "brands.read" },
  {
    label: "Инфраструктура",
    href: "/infrastructure",
    icon: Network,
    permission: "infrastructure.read",
    items: [
      { label: "Источники", href: "/infrastructure#sources" },
      { label: "Endpoints", href: "/infrastructure#endpoints" },
      { label: "Инциденты", href: "/infrastructure#incidents" },
    ],
  },
  {
    label: "Финансы",
    href: "/finance",
    icon: CircleDollarSign,
    permission: "finance.read",
    items: [
      { label: "Обзор", href: "/finance" },
      { label: "Платежи", href: "/finance/payments" },
      { label: "Логи платежей", href: "/finance/payment-logs" },
      { label: "Настройки", href: "/finance/payment-gateways" },
    ],
  },
  { label: "Рефералы", href: "/referrals", icon: Gift, permission: "finance.read" },
  { label: "Аудит", href: "/audit", icon: FileClock, permission: "audit.read" },
] satisfies NavItem[];
