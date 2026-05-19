import { Skeleton } from "@/components/ui/skeleton";

export default function ArtistsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-16 z-20 bg-background/95 backdrop-blur border-b px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Skeleton className="h-10 flex-1 max-w-xs rounded-xl" />
          <div className="flex gap-2 overflow-x-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 flex-shrink-0 rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <Skeleton className="h-5 w-32 rounded-lg mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
              <Skeleton className="h-4 w-2/3 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
