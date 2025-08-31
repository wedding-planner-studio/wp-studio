'use client'; // This component needs to be a client component

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import the actual editor component here
const SeatmapEditorClient = dynamic(
  () => import('@/components/admin/seatmap/SeatmapEditorClient'),
  {
    ssr: false, // ssr: false is allowed within a Client Component
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        {/* Ensure the skeleton takes up space appropriately */}
        <Skeleton className="h-[calc(100vh-200px)] w-full max-w-4xl" />
      </div>
    ),
  }
);

// This component just renders the dynamically loaded editor
export default function SeatmapLoader() {
  return <SeatmapEditorClient />;
}
