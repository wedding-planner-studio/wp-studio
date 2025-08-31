import AdminLayout from '@/components/layouts/AdminLayout';
import { DashboardSkeleton } from './_components/DashboardSkeleton';

export default function Loading() {
  return (
    <AdminLayout>
      <DashboardSkeleton />
    </AdminLayout>
  );
}
