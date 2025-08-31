import { Skeleton } from '@/components/ui/skeleton';

export function AgentDebuggerSkeleton() {
  return (
    <div className="h-full flex">
      {/* Sidebar Skeleton */}
      <div className="w-80 border-r border-gray-200/60 bg-white/50 p-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}
