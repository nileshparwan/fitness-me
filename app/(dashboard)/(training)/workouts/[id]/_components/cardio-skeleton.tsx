import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function CardioSkeleton() {
  return (
    <div className="flex flex-col h-screen lg:h-auto animate-pulse">
      
      {/* 1. Header Section */}
      <div className="flex-none p-4 lg:px-0 lg:pb-6 border-b lg:border-none">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" /> {/* Back Button */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" /> {/* Title */}
            <Skeleton className="h-4 w-32 hidden lg:block" /> {/* Date */}
          </div>
        </div>
      </div>

      <div className="flex-1 container max-w-7xl mx-auto lg:px-0 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start p-4 lg:p-0">
        
        {/* --- LEFT COLUMN: LIST SKELETON --- */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Section Title */}
          <div className="hidden lg:flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-32" />
          </div>

          {/* List Items */}
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-l-4 border-l-muted">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex gap-3 w-full">
                    {/* Icon Circle */}
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    
                    <div className="space-y-2 w-full">
                      {/* Activity Title */}
                      <Skeleton className="h-5 w-1/3" />
                      
                      {/* Stats Chips */}
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-16 rounded-md" />
                        <Skeleton className="h-4 w-16 rounded-md" />
                        <Skeleton className="h-4 w-16 rounded-md" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons (Desktop) */}
                  <div className="hidden lg:flex gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* --- RIGHT COLUMN: STICKY FORM SKELETON --- */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-6">
          <div className="border rounded-xl overflow-hidden bg-card">
            {/* Form Header */}
            <div className="bg-muted/30 p-4 border-b">
              <Skeleton className="h-5 w-32" />
            </div>
            {/* Form Fields */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                 </div>
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                 </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                 <Skeleton className="h-16 w-full" />
                 <Skeleton className="h-16 w-full" />
                 <Skeleton className="h-16 w-full" />
              </div>
              <div className="space-y-2">
                 <Skeleton className="h-4 w-16" />
                 <Skeleton className="h-20 w-full" />
              </div>
              <div className="flex justify-end pt-2">
                 <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}