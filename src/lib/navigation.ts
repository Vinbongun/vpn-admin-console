import {
  Activity,
  CircleDollarSign,
  FileClock,
  Gauge,
  Network,
  Users,
} from "lucide-react";
export const navigation = [
  { label: "Обзор", href: "/", icon: Gauge },
  { label: "Пользователи", href: "/users", icon: Users, permission: "customers.read" },
  { label: "Подписки", href: "/subscriptions", icon: Activity, permission: "subscriptions.read" },
  { label: "Инфраструктура", href: "/infrastructure", icon: Network, permission: "infrastructure.read" },
  { label: "Финансы", href: "/finance", icon: CircleDollarSign, permission: "finance.read" },
  { label: "Audit", href: "/audit", icon: FileClock, permission: "audit.read" },
] satisfies Array<{ label: string; href: string; icon: typeof Gauge; permission?: string }>;
