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
export const navigation = [
  { label: "Обзор", href: "/", icon: Gauge },
  { label: "Пользователи", href: "/users", icon: Users, permission: "customers.read" },
  { label: "Подписки", href: "/subscriptions", icon: Activity, permission: "subscriptions.read" },
  { label: "Справочники", href: "/reference", icon: BookOpen, permission: "brands.read" },
  { label: "Инфраструктура", href: "/infrastructure", icon: Network, permission: "infrastructure.read" },
  { label: "Финансы", href: "/finance", icon: CircleDollarSign, permission: "finance.read" },
  { label: "Рефералы", href: "/referrals", icon: Gift, permission: "finance.read" },
  { label: "Аудит", href: "/audit", icon: FileClock, permission: "audit.read" },
] satisfies Array<{ label: string; href: string; icon: typeof Gauge; permission?: string }>;
