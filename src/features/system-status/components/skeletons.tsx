import { Card, Skeleton } from "./card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading status">
      <Card className="flex items-center gap-4 p-5 sm:p-6">
        <Skeleton className="size-12 rounded-full sm:size-14" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </Card>
      <div>
        <Skeleton className="mb-3 h-4 w-28" />
        <Card className="divide-y divide-border">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4 sm:px-5">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="space-y-4 p-5" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </Card>
  );
}
