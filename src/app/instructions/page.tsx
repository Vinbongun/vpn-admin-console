import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listInstructions } from "@/lib/instructions";

export default function InstructionsPage() {
  const instructions = listInstructions();

  return (
    <AppShell>
      <PageHeader title="Инструкции" description="Внутренние runbook'и — доступны только внутри админки" />
      <Card>
        <CardContent className="divide-y p-0">
          {instructions.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Пока нет ни одной статьи.</p>
          ) : (
            instructions.map((item) => (
              <Link key={item.slug} href={`/instructions/${item.slug}`} className="block px-4 py-3 text-sm font-medium hover:bg-muted">
                {item.title}
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
