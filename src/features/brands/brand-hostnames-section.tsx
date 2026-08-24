"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { BrandDetail } from "@/api/types";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function BrandHostnamesSection({ brand, mayWrite }: { brand: BrandDetail; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const [hostnames, setHostnames] = useState<string[]>(brand.hostnames);

  const mutation = useMutation({
    mutationFn: () => adminApi.updateBrand(brand.id, { hostnames: hostnames.map((value) => value.trim()).filter(Boolean) }),
    onSuccess: async () => {
      toast.success("Домены сохранены.");
      await queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Не удалось сохранить домены."),
  });

  const update = (index: number, value: string) => setHostnames((prev) => prev.map((host, i) => (i === index ? value : host)));
  const remove = (index: number) => setHostnames((prev) => prev.filter((_, i) => i !== index));
  const add = () => setHostnames((prev) => [...prev, ""]);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Домены" description="Технические hostnames, по которым резолвится конфиг бренда для customer-portal — сохранение полностью заменяет список" />
      <Card>
        <CardContent className="flex flex-col gap-2">
          {hostnames.length === 0 && <p className="text-sm text-muted-foreground">Домены не заданы.</p>}
          {hostnames.map((host, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input aria-label="Домен" disabled={!mayWrite} placeholder="example.com" value={host} onChange={(event) => update(index, event.target.value)} className="flex-1" />
              {mayWrite && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                  <XIcon />
                </Button>
              )}
            </div>
          ))}
          {mayWrite && (
            <div className="mt-1 flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={add}>
                <PlusIcon />
                Добавить домен
              </Button>
              <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
                {mutation.isPending && <Spinner />}
                Сохранить
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
