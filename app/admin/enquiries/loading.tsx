import { Skeleton } from "@/components/ui/skeleton";

export default function AdminEnquiriesLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-10 w-64 rounded-xl" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
