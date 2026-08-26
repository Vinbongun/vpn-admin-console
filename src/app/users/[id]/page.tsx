import { CustomerDetailPage } from "@/features/users/customer-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailPage customerId={id} />;
}
