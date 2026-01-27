import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function WorkoutDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      
      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          {/* Workout Name */}
          <Skeleton className="h-8 w-64" /> 
          {/* Date */}
          <Skeleton className="h-4 w-40" /> 
        </div>
        <div className="flex gap-2">
           {/* Action Buttons */}
           <Skeleton className="h-10 w-28" />
           <Skeleton className="h-10 w-28" />
           <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" /> {/* Label */}
              <Skeleton className="h-4 w-4 rounded-full" /> {/* Icon */}
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16" /> {/* Value */}
            </CardContent>
          </Card>
        ))}
      </div>

      <Skeleton className="h-[1px] w-full" />

      {/* 3. Exercises / Logs List */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" /> {/* Section Title */}
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden border-l-4 border-l-muted">
              <CardHeader className="bg-muted/40 py-3">
                <Skeleton className="h-5 w-3/4" /> {/* Exercise Name */}
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 space-y-2">
                  <div className="flex justify-between gap-4">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div className="flex justify-between gap-4">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}