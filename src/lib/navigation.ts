import {
  Activity,
  BookOpen,
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
  items?: { label: string; hash: string }[];
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
      { label: "Бренды", hash: "brands" },
      { label: "Тарифы", hash: "plans" },
      { label: "Серверные пакеты", hash: "endpoint-groups" },
    ],
  },
  {
    label: "Инфраструктура",
    href: "/infrastructure",
    icon: Network,
    permission: "infrastructure.read",
    items: [
      { label: "Панели", hash: "sources" },
      { label: "Endpoints", hash: "endpoints" },
      { label: "Инциденты", hash: "incidents" },
    ],
  },
  { label: "Финансы", href: "/finance", icon: CircleDollarSign, permission: "finance.read" },
  { label: "Рефералы", href: "/referrals", icon: Gift, permission: "finance.read" },
  { label: "Аудит", href: "/audit", icon: FileClock, permission: "audit.read" },
] satisfies NavItem[];
