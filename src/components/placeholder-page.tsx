import { Construction } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return <AppShell><PageHeader title={title} description={description} /><Card><CardContent className="flex min-h-72 flex-col items-center justify-center text-center"><div className="mb-4 rounded-full bg-primary/10 p-4 text-primary"><Construction className="size-7" /></div><h2 className="text-lg font-semibold">Раздел подготовлен</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">Данные появятся после публикации admin API и генерации типизированного клиента. Сейчас CRUD-операции намеренно отключены.</p></CardContent></Card></AppShell>;
}
