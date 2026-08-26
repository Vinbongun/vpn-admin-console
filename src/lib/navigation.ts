import {
  BookOpen,
  Building2,
  CircleDollarSign,
  FileClock,
  Gauge,
  Gift,
  Megaphone,
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
      { label: "Панели", href: "/infrastructure#sources" },
      { label: "Серверы", href: "/infrastructure#endpoints" },
      { label: "Инциденты", href: "/infrastructure#incidents" },
      { label: "Статистика", href: "/infrastructure#popularity" },
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
  { label: "Аудит", href: "/audit", icon: FileClock, permission: "audit.read" },
  { label: "Инструкции", href: "/instructions", icon: BookOpen },
] satisfies NavItem[];
