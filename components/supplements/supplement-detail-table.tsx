"use client";

import { format, parseISO } from "date-fns";
import { useMemo, useState, type MouseEvent } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import type { SupplementAssignmentRow } from "@/app/actions/supplements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  SUPPLEMENT_CATEGORY_LABELS,
  normalizeSupplementDisplayName,
} from "@/lib/nutrition/supplements";

type Props = {
  rows: SupplementAssignmentRow[];
  isLoading?: boolean;
  onEdit: (assignment: SupplementAssignmentRow) => void;
  onRemove: (assignment: SupplementAssignmentRow) => void;
};

function formatDateLabel(value: string) {
  if (!value) return "-";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
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

export function SupplementDetailTable({ rows, isLoading, onEdit, onRemove }: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "supplement_name", desc: false },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredRows = useMemo(() => {
    const text = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (categoryFilter !== "all" && !row.categories.includes(categoryFilter as typeof row.categories[number])) {
        return false;
      }
      if (!text) return true;
      return (
        [
          normalizeSupplementDisplayName(row.supplement_name),
          row.brand || "",
          row.categories.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(text)
      );
    });
  }, [categoryFilter, rows, search]);

  const columns = useMemo<ColumnDef<SupplementAssignmentRow>[]>(
    () => [
      {
        id: "supplement_name",
        accessorKey: "supplement_name",
        header: ({ column }) => (
          <SortHeader
            label="Supplement"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{normalizeSupplementDisplayName(row.original.supplement_name)}</p>
            <p className="text-xs text-muted-foreground">{row.original.brand || "No brand"}</p>
          </div>
        ),
      },
      {
        id: "categories",
        accessorFn: (row) => row.categories.join(","),
        header: "Categories",
        cell: ({ row }) =>
          row.original.categories.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.original.categories.slice(0, 2).map((category) => (
                <Badge key={`${row.original.id}-${category}`} variant="outline" className="rounded-full border-border/60 bg-muted/20">
                  {SUPPLEMENT_CATEGORY_LABELS[category] || category}
                </Badge>
              ))}
              {row.original.categories.length > 2 ? (
                <span className="text-xs text-muted-foreground">+{row.original.categories.length - 2}</span>
              ) : null}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        id: "default_servings",
        accessorKey: "default_servings",
        header: ({ column }) => (
          <SortHeader
            label="Dosage"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.default_servings} {row.original.unit || row.original.serving_label}
          </span>
        ),
      },
      {
        id: "updated_at",
        accessorKey: "updated_at",
        header: ({ column }) => (
          <SortHeader
            label="Updated"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateLabel(row.original.updated_at)}</span>,
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
              <DropdownMenuItem onClick={() => onEdit(row.original)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRemove(row.original)}>Remove</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onEdit, onRemove]
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
  });

  const visibleColumns = table.getAllLeafColumns().filter((column) => column.getCanHide());

  return (
    <section className="space-y-4 rounded-[10px] border border-border/60 bg-card/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant={categoryFilter === "all" ? "default" : "outline"} onClick={() => setCategoryFilter("all")}>All</Button>
          <Button type="button" size="sm" variant={categoryFilter === "vitamin" ? "default" : "outline"} onClick={() => setCategoryFilter("vitamin")}>Vitamins</Button>
          <Button type="button" size="sm" variant={categoryFilter === "mineral" ? "default" : "outline"} onClick={() => setCategoryFilter("mineral")}>Minerals</Button>
          <Button type="button" size="sm" variant={categoryFilter === "omega" ? "default" : "outline"} onClick={() => setCategoryFilter("omega")}>Omega</Button>
          <Button type="button" size="sm" variant={categoryFilter === "protein" ? "default" : "outline"} onClick={() => setCategoryFilter("protein")}>Performance</Button>
          <Button type="button" size="sm" variant={categoryFilter === "other" ? "default" : "outline"} onClick={() => setCategoryFilter("other")}>Other</Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search supplements"
            className="h-9 w-[220px] rounded-xl border-border/60 bg-muted/20"
          />

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
                  Loading supplements...
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoading && table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-20 text-center text-sm text-muted-foreground">
                  No supplements assigned yet.
                </TableCell>
              </TableRow>
            ) : null}

            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
