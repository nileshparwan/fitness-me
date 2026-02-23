import { Skeleton } from "@/components/ui/skeleton";

export function NutritionProgramDetailSkeleton() {
  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto pb-40 space-y-6 relative animate-in fade-in duration-500">
      
      {/* --- HEADER SKELETON --- */}
      <div className="flex flex-col gap-4">
         {/* Top Row: Back + Title + Actions */}
         <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 w-full">
                <Skeleton className="h-9 w-9 rounded-md shrink-0" /> {/* Back Button */}
                <div className="space-y-2 flex-1 max-w-[200px] sm:max-w-md">
                   <Skeleton className="h-7 w-3/4" /> {/* Program Title */}
                   <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-16 rounded-sm" /> {/* Status Badge */}
                      <Skeleton className="h-5 w-24 rounded-sm hidden sm:block" /> {/* Date Range */}
                   </div>
                </div>
            </div>

            {/* Actions (Responsive) */}
            <div className="flex gap-2">
               <Skeleton className="h-9 w-9 md:w-24 rounded-md" /> 
               <Skeleton className="h-9 w-9 md:w-24 rounded-md hidden md:block" />
            </div>
         </div>
         
         {/* Action Bar (Status Select + Add Button) */}
         <div className="flex items-center justify-between gap-4 border-b pb-4">
             <div className="flex items-center gap-3">
                 <Skeleton className="h-8 w-[110px]" /> {/* Select Input */}
                 <Skeleton className="h-4 w-16 hidden sm:block" /> {/* Meal Count Text */}
             </div>
             <Skeleton className="h-9 w-32" /> {/* Add Meal Button */}
         </div>
      </div>

      {/* --- ANALYTICS BAR SKELETON --- */}
      <div className="h-24 w-full border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/10">
         <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
         </div>
         <div className="flex gap-4 w-full sm:w-auto">
            <Skeleton className="h-10 w-full sm:w-24 rounded-md" />
            <Skeleton className="h-10 w-full sm:w-24 rounded-md" />
            <Skeleton className="h-10 w-full sm:w-24 rounded-md" />
         </div>
      </div>

      {/* --- SORTABLE LIST SKELETON --- */}
      <div className="space-y-3">
         <div className="flex justify-between px-1">
             <Skeleton className="h-4 w-32" /> {/* "Plan Schedule" Title */}
             <Skeleton className="h-4 w-12" />
         </div>

         {/* Meal Rows */}
         {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-0 border rounded-md overflow-hidden h-[60px] bg-card">
               {/* Drag Handle Area */}
               <div className="w-8 h-full border-r bg-muted/20 flex items-center justify-center">
                  <Skeleton className="h-4 w-4 rounded-full opacity-20" />
               </div>

               {/* Content Area */}
               <div className="flex-1 p-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                     <Skeleton className="h-5 w-5 rounded-full shrink-0" /> {/* Checkbox */}
                     <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                           <Skeleton className="h-4 w-16 rounded-sm" /> {/* Type Badge */}
                           <Skeleton className="h-4 w-32 sm:w-48" /> {/* Food Name */}
                        </div>
                        <Skeleton className="h-3 w-24 sm:hidden" /> {/* Mobile Macros */}
                     </div>
                  </div>

                  {/* Desktop Macros & Menu */}
                  <div className="flex items-center gap-3">
                     <Skeleton className="h-3 w-32 hidden sm:block" /> {/* Desktop Macros */}
                     <Skeleton className="h-8 w-8 rounded-md" /> {/* Menu Trigger */}
                  </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}