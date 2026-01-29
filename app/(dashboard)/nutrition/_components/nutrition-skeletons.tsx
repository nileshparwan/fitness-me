import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ProgramsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-[150px]" /><Skeleton className="h-3 w-[200px] mt-2" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
              <TableCell><Skeleton className="h-5 w-[60px] rounded-full" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md inline-block" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ProgramDetailSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 border rounded-xl p-6">
        <div className="space-y-3">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Calendar Grid Skeleton */}
      <div className="space-y-12">
        {[1, 2].map((day) => (
          <div key={day} className="space-y-4">
            <Skeleton className="h-8 w-[150px]" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3].map((card) => (
                <Card key={card} className="h-[200px]">
                  <CardHeader><Skeleton className="h-5 w-[120px]" /></CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}