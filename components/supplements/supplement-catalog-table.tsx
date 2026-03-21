"use client";

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
} from "@tanstack/react-table";
import { Search } from "lucide-react";

import type { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUPPLEMENT_CATEGORY_LABELS, normalizeSupplementDisplayName } from "@/lib/nutrition/supplements";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SupplementCatalogRow = Database["public"]["Tables"]["supplement_catalog"]["Row"];
type SupplementCategory =
  | "vitamin"
  | "mineral"
  | "omega"
  | "protein"
  | "electrolyte"
  | "herbal"
  | "other";

type Props = {
  rows: SupplementCatalogRow[];
  isLoading?: boolean;
  onEditSupplement?: (supplement: SupplementCatalogRow) => void;
};

const CATEGORY_OPTIONS: Array<{ value: "all" | SupplementCategory; label: string }> = [
  { value: "all", label: "All" },
  { value: "vitamin", label: "Vitamins" },
  { value: "mineral", label: "Minerals" },
  { value: "omega", label: "Omega" },
  { value: "protein", label: "Performance" },
  { value: "electrolyte", label: "Electrolytes" },
  { value: "herbal", label: "Herbal" },
  { value: "other", label: "Other" },
];

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
      <span className="ml-1 text-[10px] uppercase text-muted-foreground">
        {sorted === "asc" ? "asc" : sorted === "desc" ? "desc" : "-"}
      </span>
    </Button>
  );
}

function readCategories(row: SupplementCatalogRow): SupplementCategory[] {
  const raw = (row as SupplementCatalogRow & { categories?: unknown }).categories;
  if (Array.isArray(raw) && raw.length > 0) {
    const values = raw.filter((item): item is SupplementCategory => typeof item === "string") as SupplementCategory[];
    if (values.length > 0) return Array.from(new Set(values));
  }
  return [row.category as SupplementCategory];
}

export function SupplementCatalogTable({ rows, isLoading, onEditSupplement }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | SupplementCategory>("all");

  const filteredRows = useMemo(() => {
    const search = globalFilter.trim().toLowerCase();
    return rows.filter((row) => {
      const categories = readCategories(row);
      if (categoryFilter !== "all" && !categories.includes(categoryFilter)) return false;
      if (!search) return true;
      return (
        row.name.toLowerCase().includes(search) ||
        categories
          .map((value) => SUPPLEMENT_CATEGORY_LABELS[value] || value)
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    });
  }, [categoryFilter, globalFilter, rows]);

  const columns = useMemo<ColumnDef<SupplementCatalogRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <SortHeader
            label="Supplement"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{normalizeSupplementDisplayName(row.original.name)}</span>
        ),
      },
      {
        id: "categories",
        accessorFn: (row) => readCategories(row).join(","),
        header: ({ column }) => (
          <SortHeader
            label="Categories"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => {
          const categories = readCategories(row.original);
          if (categories.length === 0) return <span className="text-muted-foreground">-</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {categories.slice(0, 2).map((category) => (
                <span
                  key={`${row.original.id}-${category}`}
                  className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                >
                  {SUPPLEMENT_CATEGORY_LABELS[category] || category}
                </span>
              ))}
              {categories.length > 2 ? (
                <span className="text-xs text-muted-foreground">+{categories.length - 2}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-border/60"
            onClick={() => onEditSupplement?.(row.original)}
          >
            Edit
          </Button>
        ),
      },
    ],
    [onEditSupplement]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 12,
      },
    },
  });

  return (
    <section className="space-y-4 rounded-[10px] border border-border/60 bg-card/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-[280px] max-w-full">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Search supplements"
            className="h-9 rounded-xl border-border/60 bg-muted/20 pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={categoryFilter === option.value ? "default" : "outline"}
              onClick={() => setCategoryFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
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
                  Loading catalog...
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoading && table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-16 text-center text-sm text-muted-foreground">
                  No supplements match your filters.
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

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {filteredRows.length} supplements
        </p>
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
