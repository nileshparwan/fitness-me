import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ProgressSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-24 bg-gray-50/30 min-h-screen">
      
      {/* HEADER SKELETON */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Skeleton className="h-10 w-[240px]" />
          <Skeleton className="h-10 w-[200px]" />
        </div>
      </div>

      {/* EXERCISE PROFILE */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
             <Skeleton className="w-full md:w-1/3 h-48 rounded-lg" />
             <div className="space-y-4 w-full">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
             </div>
          </div>
        </CardContent>
      </Card>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-sm">
               <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
               <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
         ))}
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="col-span-1 lg:col-span-2 shadow-sm h-[400px]">
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent><Skeleton className="w-full h-[300px]" /></CardContent>
         </Card>
         <Card className="col-span-1 shadow-sm h-[400px]">
             <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
             <CardContent className="flex items-center justify-center">
                <Skeleton className="h-[250px] w-[250px] rounded-full" />
             </CardContent>
         </Card>
      </div>

      {/* BOTTOM SECTIONS */}
      <div className="grid grid-cols-1 gap-6">
         <Skeleton className="h-64 w-full rounded-xl" />
         <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </div>
  );
}