"use client";

import { format, parseISO } from "date-fns";
import { useMemo, useState, type MouseEvent } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal, Search } from "lucide-react";

import type { BodyMeasurementRow } from "@/app/actions/body-measurements";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MeasurementsTableProps = {
  data: BodyMeasurementRow[];
  isLoading?: boolean;
  onEdit: (row: BodyMeasurementRow) => void;
};

function formatDateLabel(value: string) {
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function fmtUnit(value: number | null, unit: string) {
  return value == null ? "—" : `${value} ${unit}`;
}

function fmtPct(value: number | null) {
  return value == null ? "—" : `${value}%`;
}

function truncate(value: string | null, max = 40) {
  if (!value) return "—";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function SortHeader({
  label,
  sorted,
  onClick,
}: {
  label: string;
  sorted: false | "asc" | "desc";
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-0 text-xs font-medium"
      onClick={onClick}
    >
      {label}
      <span className="ml-1 text-[10px] uppercase text-muted-foreground">
        {sorted === "asc" ? "asc" : sorted === "desc" ? "desc" : "-"}
      </span>
    </Button>
  );
}

export function MeasurementsTable({ data, isLoading, onEdit }: MeasurementsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns = useMemo<ColumnDef<BodyMeasurementRow>[]>(
    () => [
      {
        id: "date",
        accessorKey: "date",
        header: ({ column }) => (
          <SortHeader
            label="Date"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => <span>{formatDateLabel(row.original.date)}</span>,
      },
      {
        id: "weight",
        accessorKey: "weight",
        header: ({ column }) => (
          <SortHeader
            label="Weight"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => fmtUnit(row.original.weight, "kg"),
      },
      {
        id: "body_fat_percent",
        accessorKey: "body_fat_percent",
        header: ({ column }) => (
          <SortHeader
            label="Body Fat"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => fmtPct(row.original.body_fat_percent),
      },
      {
        id: "waist_cm",
        accessorKey: "waist_cm",
        header: ({ column }) => (
          <SortHeader
            label="Waist"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => fmtUnit(row.original.waist_cm, "cm"),
      },
      {
        id: "hips_cm",
        accessorKey: "hips_cm",
        header: ({ column }) => (
          <SortHeader
            label="Hips"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => fmtUnit(row.original.hips_cm, "cm"),
      },
      {
        id: "chest_cm",
        accessorKey: "chest_cm",
        header: ({ column }) => (
          <SortHeader
            label="Chest"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => fmtUnit(row.original.chest_cm, "cm"),
      },
      {
        id: "notes",
        accessorKey: "notes",
        header: ({ column }) => (
          <SortHeader
            label="Notes"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{truncate(row.original.notes, 40)}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>Edit</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onEdit]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue || "").trim().toLowerCase();
      if (!query) return true;
      const source = row.original;
      const haystack = [
        source.date,
        source.weight,
        source.body_fat_percent,
        source.waist_cm,
        source.hips_cm,
        source.chest_cm,
        source.notes,
      ]
        .map((value) => (value == null ? "" : String(value)))
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

  const visibleColumns = table.getAllLeafColumns().filter((column) => column.getCanHide());

  return (
    <section className="space-y-3 rounded-[10px] border border-border/60 bg-card/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-[260px] max-w-full">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Search measurements"
            className="h-9 rounded-xl border-border/60 bg-muted/20 pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="rounded-xl border-border/60">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {visibleColumns.map((column) => (
              <DropdownMenuItem key={column.id} onClick={() => column.toggleVisibility(!column.getIsVisible())}>
                {column.getIsVisible() ? "Hide" : "Show"} {column.id.replaceAll("_", " ")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border border-border/60 bg-background/20">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, rowIndex) => (
                  <TableRow key={`loading-${rowIndex}`}>
                    {table.getVisibleLeafColumns().map((column, columnIndex) => (
                      <TableCell key={`${column.id || columnIndex}-${rowIndex}`}>
                        <Skeleton className="h-10 rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}

            {!isLoading && table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-20 text-center text-sm text-muted-foreground">
                  No measurements logged yet.
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoading
              ? table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows per page</span>
          <SelectRowsPerPage
            value={table.getState().pagination.pageSize}
            onValueChange={(value) => table.setPageSize(value)}
          />
        </div>

        <p className="text-muted-foreground">Filtered rows: {table.getFilteredRowModel().rows.length}</p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg border-border/60"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || Boolean(isLoading)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg border-border/60"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || Boolean(isLoading)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}

function SelectRowsPerPage({
  value,
  onValueChange,
}: {
  value: number;
  onValueChange: (value: number) => void;
}) {
  const options = [10, 20, 50];
  return (
    <div className="flex items-center gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onValueChange(option)}
          className={
            value === option
              ? "h-8 rounded-full bg-gradient-to-r from-[#f27bbd] via-[#f2c86f] to-[#87f5cf] px-3 text-sm font-medium text-black"
              : "h-8 rounded-full border border-border/60 bg-muted/20 px-3 text-sm text-muted-foreground"
          }
        >
          {option}
        </button>
      ))}
    </div>
  );
}
