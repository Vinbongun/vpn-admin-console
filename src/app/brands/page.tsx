"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { BrandDetail } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createBrandSchema, type CreateBrandValues } from "@/features/brands/schema";
import { can } from "@/lib/access-control";

function apiErrorMessage(error: ApiError): string {
  if (error.status === 409) return "Бренд с таким кодом уже существует.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

const columns: ColumnDef<BrandDetail>[] = [
  {
    id: "name",
    header: "Бренд",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.code}</p>
      </div>
    ),
  },
  { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { id: "hostnames", header: "Домены", cell: ({ row }) => row.original.hostnames.join(", ") || "—" },
];

export default function BrandsPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "brands.write");
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });

  const defaultValues: CreateBrandValues = { code: "", name: "" };
  const form = useForm<CreateBrandValues>({ resolver: zodResolver(createBrandSchema), defaultValues });

  const mutation = useMutation({
    mutationFn: adminApi.createBrand,
    onSuccess: async () => {
      toast.success("Бренд создан.");
      form.reset(defaultValues);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось создать бренд."),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <AppShell>
      <PageHeader
        title="Бренды"
        description="White-label сайты платформы — домены, ссылки, публичная конфигурация и способы оплаты каждого бренда"
        actions={
          mayWrite && (
            <Dialog open={open} onOpenChange={(next) => { if (!next) form.reset(defaultValues); setOpen(next); }}>
              <DialogTrigger
                render={
                  <Button size="sm">
                    <PlusIcon />
                    Создать бренд
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Создать бренд</DialogTitle>
                </DialogHeader>
                <form className="contents" onSubmit={submit}>
                  <FieldGroup>
                    <Field data-invalid={Boolean(form.formState.errors.code)}>
                      <FieldLabel htmlFor="brand-code">Код бренда</FieldLabel>
                      <Input id="brand-code" placeholder="Код (a-z0-9_-)" {...form.register("code")} />
                      <FieldError errors={[form.formState.errors.code]} />
                    </Field>
                    <Field data-invalid={Boolean(form.formState.errors.name)}>
                      <FieldLabel htmlFor="brand-name">Название бренда</FieldLabel>
                      <Input id="brand-name" placeholder="Название" {...form.register("name")} />
                      <FieldError errors={[form.formState.errors.name]} />
                    </Field>
                  </FieldGroup>
                  <DialogFooter>
                    <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
                    <Button disabled={mutation.isPending} type="submit">
                      {mutation.isPending && <Spinner />}
                      Создать
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />
      <div className="relative">
        <DataTable
          columns={columns}
          data={brands.data ?? []}
          isLoading={brands.isLoading}
          isError={brands.isError}
          errorMessage="Не удалось получить бренды."
          emptyMessage="Бренды не найдены."
          onRowClick={(brand) => startNavigation(() => router.push(`/brands/${brand.id}`))}
        />
        {isNavigating && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/60">
            <Spinner className="size-5" />
          </div>
        )}
      </div>
    </AppShell>
  );
}
