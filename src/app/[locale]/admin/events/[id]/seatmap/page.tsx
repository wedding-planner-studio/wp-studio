// NO 'use client' here - this remains a Server Component
import AdminLayout from '@/components/layouts/AdminLayout';
import SeatmapLoader from '@/components/admin/seatmap/SeatmapLoader'; // Import the new loader component

export default function SeatmapPage() {
  // This page component sets up the layout and renders the loader,
  // which in turn dynamically loads the actual client-side editor.
  return (
    <AdminLayout>
      <SeatmapLoader />
    </AdminLayout>
  );
}
