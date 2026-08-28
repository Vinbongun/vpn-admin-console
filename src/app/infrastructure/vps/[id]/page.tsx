import { VpsDetailPage } from "@/features/vps/vps-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VpsDetailPage vpsId={id} />;
}
