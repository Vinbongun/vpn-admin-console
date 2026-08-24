import type { ColumnDef } from "@tanstack/react-table";
import type { SubscriptionSummary } from "@/api/types";
import { StatusBadge } from "@/components/status-badge";

export const subscriptionColumns: ColumnDef<SubscriptionSummary>[] = [
  { id: "customer", header: "Клиент", cell: ({ row }) => row.original.customerEmail ?? "—" },
  { accessorKey: "brandCode", header: "Бренд", enableSorting: false },
  { id: "plan", header: "Тариф", cell: ({ row }) => row.original.planCode ?? "—" },
  { accessorKey: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "expiresAt", header: "До", cell: ({ row }) => new Date(row.original.expiresAt).toLocaleString("ru-RU") },
];
