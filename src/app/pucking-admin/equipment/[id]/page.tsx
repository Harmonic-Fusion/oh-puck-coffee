import { AdminEquipmentDetailClient } from "@/components/admin/equipment/AdminEquipmentDetailClient";

export default async function AdminEquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminEquipmentDetailClient equipmentId={id} />;
}
