export const DashboardSkeleton = () => {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Navigation skeleton */}
      <div className="mb-6">
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Event Header skeleton */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <div className="h-9 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-5 w-48 bg-gray-100 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Main Content - Two Column Layout skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column skeleton */}
        <div className="lg:col-span-2">
          {/* Venue details skeleton */}
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm mb-4">
            <div className="p-3 border-b border-gray-100 bg-purple-50/50 flex justify-between">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="p-4">
              <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>

          {/* RSVP Summary skeleton */}
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm mb-4">
            <div className="p-3 border-b border-gray-100 bg-purple-50/50 flex justify-between">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="p-4">
              <div className="flex justify-between mb-6">
                <div className="flex gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="text-center">
                      <div className="h-7 w-10 bg-gray-200 rounded animate-pulse mb-1 mx-auto"></div>
                      <div className="h-3 w-14 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <div className="h-7 w-10 bg-gray-200 rounded animate-pulse mb-1 mx-auto"></div>
                  <div className="h-3 w-14 bg-gray-100 rounded animate-pulse"></div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <div className="h-3 w-24 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-3 w-10 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-gray-200 h-1.5 rounded-full w-1/3 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column skeleton */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="p-3 border-b border-gray-100 bg-purple-50/50">
              <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="p-4 space-y-3">
              <div className="h-20 bg-gray-100 rounded animate-pulse mb-2"></div>
              <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
