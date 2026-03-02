"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function TicketTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-2 text-xs">Ticket</TableHead>
            <TableHead className="py-2 text-xs">Category</TableHead>
            <TableHead className="py-2 text-xs">Status</TableHead>
            <TableHead className="py-2 text-xs">Upvotes</TableHead>
            <TableHead className="py-2 text-xs">Updated</TableHead>
            <TableHead className="py-2 text-right text-xs">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRow key={`ticket-skeleton-row-${index}`}>
              <TableCell className="space-y-2 py-2">
                <Skeleton className="h-4 w-[55%]" />
                <Skeleton className="h-3 w-[78%]" />
              </TableCell>
              <TableCell className="py-2">
                <Skeleton className="h-3 w-24" />
              </TableCell>
              <TableCell className="py-2">
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>
              <TableCell className="py-2">
                <Skeleton className="h-3 w-10" />
              </TableCell>
              <TableCell className="py-2">
                <Skeleton className="h-3 w-24" />
              </TableCell>
              <TableCell className="py-2 text-right">
                <Skeleton className="ml-auto h-8 w-24 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function TicketCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 md:hidden">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={`ticket-card-skeleton-${index}`} className="rounded-lg border p-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-[70%]" />
                <Skeleton className="h-3 w-[95%]" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TicketDetailSkeleton() {
  return (
    <section className="native-surface surface-pad space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[65%]" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[96%]" />
        <Skeleton className="h-4 w-[85%]" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
    </section>
  );
}
