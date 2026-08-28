import {
  BookOpen,
  Building2,
  CircleDollarSign,
  FileClock,
  Gauge,
  Gift,
  Megaphone,
  Network,
  Settings,
  Users,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Gauge;
  permission?: string;
  items?: { label: string; href: string; permission?: string }[];
};

export const navigation = [
  { label: "Обзор", href: "/", icon: Gauge },
  { label: "Пользователи", href: "/users", icon: Users, permission: "customers.read" },
  {
    label: "Бренды",
    href: "/brands",
    icon: Building2,
    permission: "brands.read",
    items: [
      { label: "Список", href: "/brands" },
      { label: "Тарифы", href: "/brands/plans" },
    ],
  },
  {
    label: "Инфраструктура",
    href: "/infrastructure",
    icon: Network,
    permission: "infrastructure.read",
    items: [
      { label: "Обзор", href: "/infrastructure" },
      { label: "Панели и серверы", href: "/infrastructure/panels-and-servers" },
      { label: "Точки подключения", href: "/infrastructure/protocols" },
      { label: "Инциденты", href: "/infrastructure/incidents" },
      { label: "Домены", href: "/infrastructure/domains", permission: "domains.read" },
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
  {
    label: "Рефералы",
    href: "/referrals",
    icon: Gift,
    permission: "finance.read",
    items: [
      { label: "Статистика", href: "/referrals" },
      { label: "Промокоды", href: "/referrals/promo-codes" },
      { label: "Список рефералов", href: "/referrals/partners" },
    ],
  },
  { label: "Каналы привлечения", href: "/acquisitions", icon: Megaphone, permission: "finance.read" },
  { label: "Настройки платформы", href: "/platform-settings", icon: Settings, permission: "platform_settings.read" },
  { label: "Аудит", href: "/audit", icon: FileClock, permission: "audit.read" },
  { label: "Инструкции", href: "/instructions", icon: BookOpen },
] satisfies NavItem[];
