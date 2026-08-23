"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { adminApi } from "@/api/client";
import type { ReferralProgram } from "@/api/types";
import { DataTable } from "@/components/data-table";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ProgramDialog } from "@/features/referrals/program-dialog";

export function ProgramsSection({ mayWrite }: { mayWrite: boolean }) {
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const programs = useQuery({ queryKey: ["admin-referral-programs"], queryFn: adminApi.listReferralPrograms, retry: false });

  const brandName = (brandId: string) => brands.data?.find((brand) => brand.id === brandId)?.name ?? brandId;

  const columns: ColumnDef<ReferralProgram>[] = [
    { id: "brand", header: "Бренд", cell: ({ row }) => brandName(row.original.brandId) },
    { accessorKey: "campaignCode", header: "Код кампании" },
    { id: "rewardPercent", header: "Награда", cell: ({ row }) => `${row.original.rewardPercent}%` },
    { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "updatedAt", header: "Обновлено", cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString("ru-RU") },
    ...(mayWrite
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }: { row: { original: ReferralProgram } }) => (
              <div className="text-right">
                <ProgramDialog program={row.original} trigger={<Button size="sm" variant="outline">Изменить</Button>} />
              </div>
            ),
          } satisfies ColumnDef<ReferralProgram>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Реферальные программы" description="Процент награды за приглашённых клиентов, по брендам" actions={mayWrite && <ProgramDialog />} />
      <DataTable
        columns={columns}
        data={programs.data ?? []}
        isLoading={programs.isLoading}
        isError={programs.isError}
        errorMessage="Не удалось получить программы."
        emptyMessage="Программ пока нет."
      />
    </div>
  );
}
