import { Construction } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <AppShell>
      <PageHeader title={title} description={description} />
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Construction />
          </EmptyMedia>
          <EmptyTitle>Раздел подготовлен</EmptyTitle>
          <EmptyDescription>Данные появятся после публикации admin API и генерации типизированного клиента. Сейчас CRUD-операции намеренно отключены.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </AppShell>
  );
}
