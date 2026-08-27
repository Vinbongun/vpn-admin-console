import { DomainDetailPage } from "@/features/domains/domain-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DomainDetailPage domainId={id} />;
}
