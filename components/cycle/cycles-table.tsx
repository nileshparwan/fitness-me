"use client";

import { format, parseISO } from "date-fns";
import { useMemo, useState, type MouseEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import { Download, MoreHorizontal, Search, Star } from "lucide-react";
import { toast } from "sonner";

import {
  deleteCycleAction,
  type MenstrualCycleRow,
} from "@/app/actions/menstrual-cycles";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildCsv, downloadCsv } from "@/utils/csv-export";

type CyclesTableProps = {
  data: MenstrualCycleRow[];
  isLoading?: boolean;
  onEdit: (row: MenstrualCycleRow) => void;
  onDeleted: () => void;
};

function formatDateLabel(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

function formatDuration(value: number | null) {
  return value == null ? "—" : `${value} days`;
}

function renderScale(value: number | null) {
  if (value == null) return <span>—</span>;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${index < value ? "fill-current text-amber-400" : "text-muted-foreground/35"}`}
        />
      ))}
    </div>
  );
}

function renderCramps(value: number | null) {
  if (value == null) return "—";

  const label =
    value === 0 ? "None" : value === 1 ? "Mild" : value === 2 ? "Moderate" : "Severe";
  const tone =
    value === 0
      ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-200"
      : value === 1
        ? "border-sky-300/30 bg-sky-500/10 text-sky-200"
        : value === 2
          ? "border-amber-300/30 bg-amber-500/10 text-amber-100"
          : "border-rose-300/30 bg-rose-500/10 text-rose-200";

  return (
    <Badge className={`rounded-full border px-2.5 py-1 ${tone}`}>
      {label}
    </Badge>
  );
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

export function CyclesTable({
  data,
  isLoading,
  onEdit,
  onDeleted,
}: CyclesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "period_start_date", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    notes: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteCycleAction({ id }),
    onSuccess: () => {
      toast.success("Cycle entry deleted.");
      onDeleted();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to delete cycle entry");
    },
  });

  const columns = useMemo<ColumnDef<MenstrualCycleRow>[]>(
    () => [
      {
        id: "period_start_date",
        accessorKey: "period_start_date",
        header: ({ column }) => (
          <SortHeader
            label="Period Start"
            sorted={column.getIsSorted()}
            onClick={(event) =>
              column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)
            }
          />
        ),
        cell: ({ row }) => formatDateLabel(row.original.period_start_date),
      },
      {
        id: "period_end_date",
        accessorKey: "period_end_date",
        header: ({ column }) => (
          <SortHeader
            label="Period End"
            sorted={column.getIsSorted()}
            onClick={(event) =>
              column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)
            }
          />
        ),
        cell: ({ row }) => formatDateLabel(row.original.period_end_date),
      },
      {
        id: "cycle_length_days",
        accessorKey: "cycle_length_days",
        header: ({ column }) => (
          <SortHeader
            label="Cycle Length"
            sorted={column.getIsSorted()}
            onClick={(event) =>
              column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)
            }
          />
        ),
        cell: ({ row }) => formatDuration(row.original.cycle_length_days),
      },
      {
        id: "period_length_days",
        accessorKey: "period_length_days",
        header: ({ column }) => (
          <SortHeader
            label="Period Length"
            sorted={column.getIsSorted()}
            onClick={(event) =>
              column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)
            }
          />
        ),
        cell: ({ row }) => formatDuration(row.original.period_length_days),
      },
      {
        id: "energy_level",
        accessorKey: "energy_level",
        header: ({ column }) => (
          <SortHeader
            label="Energy"
            sorted={column.getIsSorted()}
            onClick={(event) =>
              column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)
            }
          />
        ),
        cell: ({ row }) => renderScale(row.original.energy_level),
      },
      {
        id: "mood",
        accessorKey: "mood",
        header: ({ column }) => (
          <SortHeader
            label="Mood"
            sorted={column.getIsSorted()}
            onClick={(event) =>
              column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)
            }
          />
        ),
        cell: ({ row }) => renderScale(row.original.mood),
      },
      {
        id: "cramps",
        accessorKey: "cramps",
        header: ({ column }) => (
          <SortHeader
            label="Cramps"
            sorted={column.getIsSorted()}
            onClick={(event) =>
              column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)
            }
          />
        ),
        cell: ({ row }) => renderCramps(row.original.cramps),
      },
      {
        id: "notes",
        accessorKey: "notes",
        header: ({ column }) => (
          <SortHeader
            label="Notes"
            sorted={column.getIsSorted()}
            onClick={(event) =>
              column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)
            }
          />
        ),
        cell: ({ row }) => {
          const value = row.original.notes;
          const truncated = truncate(value, 40);
          if (!value || value.length <= 40) return truncated;
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default text-sm text-muted-foreground">
                    {truncated}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm whitespace-pre-wrap">
                  {value}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  if (typeof window !== "undefined" && !window.confirm("Delete this cycle entry?")) {
                    return;
                  }
                  deleteMutation.mutate(row.original.id);
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [deleteMutation, onEdit]
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
        source.period_start_date,
        source.period_end_date,
        source.cycle_length_days,
        source.period_length_days,
        source.energy_level,
        source.mood,
        source.cramps,
        source.notes,
      ]
        .map((value) => (value == null ? "" : String(value)))
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const visibleColumns = table.getAllLeafColumns().filter((column) => column.getCanHide());

  const exportRows = table.getFilteredRowModel().rows.map((row) => row.original);

  return (
    <section className="space-y-3 rounded-[10px] border border-border/60 bg-card/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-[260px] max-w-full">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Search cycles"
            className="h-9 rounded-xl border-border/60 bg-muted/20 pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-border/60"
            onClick={() => {
              const csv = buildCsv(exportRows, [
                { header: "Period Start", value: (row) => row.period_start_date },
                { header: "Period End", value: (row) => row.period_end_date },
                { header: "Cycle Length", value: (row) => row.cycle_length_days },
                { header: "Period Length", value: (row) => row.period_length_days },
                { header: "Energy", value: (row) => row.energy_level },
                { header: "Mood", value: (row) => row.mood },
                { header: "Cramps", value: (row) => row.cramps },
                { header: "Notes", value: (row) => row.notes },
              ]);
              downloadCsv(`cycle-history-${new Date().toISOString().slice(0, 10)}.csv`, csv);
            }}
            disabled={exportRows.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-border/60"
              >
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {visibleColumns.map((column) => (
                <DropdownMenuItem
                  key={column.id}
                  onClick={() => column.toggleVisibility(!column.getIsVisible())}
                >
                  {column.getIsVisible() ? "Hide" : "Show"} {column.id.replaceAll("_", " ")}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-background/20">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`}>
                    {table.getVisibleLeafColumns().map((column) => (
                      <TableCell key={`${column.id}-${rowIndex}`}>
                        <Skeleton className="h-5 w-full rounded-md" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : table.getRowModel().rows.length > 0
                ? table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : (
                    <TableRow>
                      <TableCell
                        colSpan={table.getVisibleLeafColumns().length || 1}
                        className="h-32 text-center text-sm text-muted-foreground"
                      >
                        No cycles logged yet. Click &quot;Log Period&quot; to get started.
                      </TableCell>
                    </TableRow>
                  )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-border/60"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-border/60"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
