import { VpsRegistrarDetailPage } from "@/features/vps-registrars/vps-registrar-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VpsRegistrarDetailPage accountId={id} />;
}
