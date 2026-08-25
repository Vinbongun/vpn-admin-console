import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/features/instructions/code-block";
import { readInstruction } from "@/lib/instructions";

export default async function InstructionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const instruction = readInstruction(slug);
  if (!instruction) notFound();

  return (
    <AppShell>
      <Button size="sm" variant="ghost" render={<Link href="/instructions" />} nativeButton={false} className="-ml-2.5 self-start">
        <ArrowLeftIcon />
        Инструкции
      </Button>
      <article className="md-article w-full">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlock }}>
          {instruction.content}
        </ReactMarkdown>
      </article>
    </AppShell>
  );
}
