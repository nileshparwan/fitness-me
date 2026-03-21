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
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { MoreHorizontal, Search } from "lucide-react";

import type { SupplementSubjectRow } from "@/app/actions/supplements";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  rows: SupplementSubjectRow[];
  isLoading?: boolean;
  onRowClick: (row: SupplementSubjectRow) => void;
  onEditStack: (row: SupplementSubjectRow) => void;
  onDeleteStack: (row: SupplementSubjectRow) => void;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDateLabel(value: string | null) {
  if (!value) return "-";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function statusLabel(status: SupplementSubjectRow["status"]) {
  if (status === "inactive") return "Inactive";
  if (status === "archived") return "Archived";
  if (status === "completed") return "Completed";
  return "Active";
}

function statusStyle(status: SupplementSubjectRow["status"]) {
  if (status === "inactive") return "border-amber-500/50 bg-amber-500/15 text-amber-200";
  if (status === "archived") return "border-slate-500/50 bg-slate-500/15 text-slate-200";
  if (status === "completed") return "border-sky-500/50 bg-sky-500/15 text-sky-200";
  return "border-emerald-500/50 bg-emerald-500/15 text-emerald-200";
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
    <Button type="button" variant="ghost" size="sm" className="h-8 px-0 text-xs font-medium" onClick={onClick}>
      {label}
      <span className="ml-1 text-[10px] uppercase text-muted-foreground">{sorted === "asc" ? "asc" : sorted === "desc" ? "desc" : "-"}</span>
    </Button>
  );
}

export function SupplementRosterTable({ rows, isLoading, onRowClick, onEditStack, onDeleteStack }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "display_name", desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<"all" | "user" | "client">("all");

  const filteredRows = useMemo(() => {
    const search = globalFilter.trim().toLowerCase();
    return rows.filter((row) => {
      if (subjectFilter !== "all" && row.subject_type !== subjectFilter) return false;
      if (!search) return true;
      return (
        row.display_name.toLowerCase().includes(search) ||
        row.status.toLowerCase().includes(search) ||
        (row.title || "").toLowerCase().includes(search) ||
        (row.workout_program || "").toLowerCase().includes(search) ||
        (row.nutrition_program || "").toLowerCase().includes(search)
      );
    });
  }, [globalFilter, rows, subjectFilter]);

  const columns = useMemo<ColumnDef<SupplementSubjectRow>[]>(
    () => [
      {
        id: "display_name",
        accessorKey: "display_name",
        header: ({ column }) => (
          <SortHeader
            label="Person"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 rounded-full border border-border/70">
              <AvatarFallback className="rounded-full text-xs">{initials(row.original.display_name)}</AvatarFallback>
            </Avatar>
            <p className="font-medium">{row.original.display_name}</p>
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <SortHeader
            label="Status"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ${statusStyle(row.original.status)}`}
          >
            {statusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        id: "supplement_count",
        accessorKey: "supplement_count",
        header: ({ column }) => (
          <SortHeader
            label="Supplements"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
      },
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => row.original.title || <span className="text-muted-foreground">-</span>,
      },
      {
        id: "workout_program",
        accessorKey: "workout_program",
        header: "Workout Program",
        cell: ({ row }) => row.original.workout_program || <span className="text-muted-foreground">-</span>,
      },
      {
        id: "nutrition_program",
        accessorKey: "nutrition_program",
        header: "Nutrition Program",
        cell: ({ row }) => row.original.nutrition_program || <span className="text-muted-foreground">-</span>,
      },
      {
        id: "last_updated_at",
        accessorKey: "last_updated_at",
        header: ({ column }) => (
          <SortHeader
            label="Last Updated"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDateLabel(row.original.last_updated_at)}</span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  onRowClick(row.original);
                }}
              >
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  onEditStack(row.original);
                }}
              >
                Edit stack
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteStack(row.original);
                }}
              >
                Delete assigned supplement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onDeleteStack, onEditStack, onRowClick]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const visibleColumns = table.getAllLeafColumns().filter((column) => column.getCanHide());

  return (
    <section className="space-y-4 rounded-[10px] border border-border/60 bg-card/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={subjectFilter === "all" ? "default" : "outline"}
            onClick={() => setSubjectFilter("all")}
          >
            All
          </Button>
          <Button
            type="button"
            size="sm"
            variant={subjectFilter === "user" ? "default" : "outline"}
            onClick={() => setSubjectFilter("user")}
          >
            Me
          </Button>
          <Button
            type="button"
            size="sm"
            variant={subjectFilter === "client" ? "default" : "outline"}
            onClick={() => setSubjectFilter("client")}
          >
            Clients
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              placeholder="Search person"
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
            {isLoading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-16 text-sm text-muted-foreground">
                  Loading supplement roster...
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoading && table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No supplement stacks yet.</p>
                </TableCell>
              </TableRow>
            ) : null}

            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => onRowClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
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

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg border-border/60"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
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
            disabled={!table.getCanNextPage()}
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
  const options = [10, 25, 50];
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
