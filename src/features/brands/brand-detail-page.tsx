"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BrandBasicsSection } from "@/features/brands/brand-basics-section";
import { BrandHostnamesSection } from "@/features/brands/brand-hostnames-section";
import { BrandPackagesSection } from "@/features/brands/brand-packages-section";
import { BrandPaymentMethodsSection } from "@/features/brands/brand-payment-methods-section";
import { BrandPlansSection } from "@/features/brands/brand-plans-section";
import { BrandPublicSection } from "@/features/brands/brand-public-section";
import { can } from "@/lib/access-control";

export function BrandDetailPage() {
  const params = useParams<{ id: string }>();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "brands.write");
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const brand = brands.data?.find((item) => item.id === params.id);

  return (
    <AppShell>
      <div>
        <Button size="sm" variant="ghost" render={<Link href="/brands" />} nativeButton={false} className="-ml-2.5 mb-2">
          <ArrowLeftIcon />
          Бренды
        </Button>
        {brands.isLoading ? (
          <LoadingState />
        ) : brands.isError ? (
          <ErrorState description="Не удалось получить бренды." />
        ) : !brand ? (
          <ErrorState title="Бренд не найден" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-xl font-semibold tracking-tight">{brand.name}</h1>
              <StatusBadge status={brand.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{brand.code}</p>
          </>
        )}
      </div>

      {brand && (
        <>
          <BrandBasicsSection brand={brand} mayWrite={mayWrite} />
          <Separator />
          <BrandHostnamesSection brand={brand} mayWrite={mayWrite} />
          <Separator />
          <BrandPublicSection brand={brand} mayWrite={mayWrite} />
          <Separator />
          <BrandPackagesSection brand={brand} mayWrite={mayWrite} />
          <Separator />
          <BrandPlansSection brand={brand} mayWrite={mayWrite} />
          <Separator />
          <BrandPaymentMethodsSection brandId={brand.id} mayWrite={mayWrite} />
        </>
      )}
    </AppShell>
  );
}
