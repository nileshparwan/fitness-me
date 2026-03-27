"use client";

import { useMemo, useState, type MouseEvent } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import { Search, Settings2 } from "lucide-react";

import type { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { buildCsv, downloadCsv } from "@/utils/csv-export";

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
  onBulkAssign?: (supplements: SupplementCatalogRow[]) => void;
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

function sourceLabel(row: SupplementCatalogRow) {
  return row.is_global ? "Global" : "Custom";
}

function sourceTone(row: SupplementCatalogRow) {
  return row.is_global ? "border-chart-3/40 bg-chart-3/10 text-chart-3" : "border-chart-1/40 bg-chart-1/10 text-chart-1";
}

export function SupplementCatalogTable({ rows, isLoading, onEditSupplement, onBulkAssign }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | SupplementCategory>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "global" | "custom">("all");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    category: true,
    brand: false,
    source: true,
    nutrients: true,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const filteredRows = useMemo(() => {
    const search = globalFilter.trim().toLowerCase();
    return rows.filter((row) => {
      const categories = readCategories(row);
      if (categoryFilter !== "all" && !categories.includes(categoryFilter)) return false;
      if (sourceFilter === "global" && !row.is_global) return false;
      if (sourceFilter === "custom" && row.is_global) return false;
      if (!search) return true;
      return (
        row.name.toLowerCase().includes(search) ||
        (row.brand || "").toLowerCase().includes(search) ||
        categories
          .map((value) => SUPPLEMENT_CATEGORY_LABELS[value] || value)
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    });
  }, [categoryFilter, globalFilter, rows, sourceFilter]);

  const columns = useMemo<ColumnDef<SupplementCatalogRow>[]>(
    () => [
      {
        id: "select",
        enableHiding: false,
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
            aria-label="Select all supplements"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label={`Select ${row.original.name}`}
          />
        ),
      },
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
        id: "category",
        accessorFn: (row) => readCategories(row)[0] || "other",
        header: ({ column }) => (
          <SortHeader
            label="Category"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => {
          const categories = readCategories(row.original);
          const category = categories[0] || "other";
          return (
            <span className="rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {SUPPLEMENT_CATEGORY_LABELS[category] || category}
            </span>
          );
        },
      },
      {
        id: "brand",
        accessorKey: "brand",
        header: "Brand",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.brand || "—"}</span>,
      },
      {
        id: "source",
        accessorFn: (row) => (row.is_global ? "global" : "custom"),
        header: ({ column }) => (
          <SortHeader
            label="Source"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${sourceTone(row.original)}`}>
            {sourceLabel(row.original)}
          </span>
        ),
      },
      {
        id: "nutrients",
        accessorFn: (row) => Object.keys(row.nutrients || {}).length,
        header: "Nutrients",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{Object.keys(row.original.nutrients || {}).length || "—"}</span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          if (row.original.is_global || !onEditSupplement) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-border/60"
              onClick={() => onEditSupplement?.(row.original)}
            >
              Edit
            </Button>
          );
        },
      },
    ],
    [onEditSupplement]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <section className="space-y-4 rounded-[10px] border border-border/60 bg-card/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
                className="rounded-full"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={sourceFilter === "all" ? "default" : "outline"}
              onClick={() => setSourceFilter("all")}
              className="rounded-full"
            >
              All Sources
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sourceFilter === "global" ? "default" : "outline"}
              onClick={() => setSourceFilter("global")}
              className="rounded-full"
            >
              Global
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sourceFilter === "custom" ? "default" : "outline"}
              onClick={() => setSourceFilter("custom")}
              className="rounded-full"
            >
              Custom
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-border/60"
            onClick={() => {
              const csv = buildCsv(table.getFilteredRowModel().rows.map((row) => row.original), [
                { header: "Name", value: (row) => normalizeSupplementDisplayName(row.name) },
                { header: "Category", value: (row) => SUPPLEMENT_CATEGORY_LABELS[readCategories(row)[0] || "other"] || row.category },
                { header: "Brand", value: (row) => row.brand || "" },
                { header: "Source", value: (row) => sourceLabel(row) },
              ]);
              downloadCsv(`supplement-catalog-${new Date().toISOString().slice(0, 10)}.csv`, csv);
            }}
          >
            Export CSV
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="rounded-xl border-border/60">
                <Settings2 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/70 bg-card/95">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuItem
                    key={column.id}
                    onSelect={(event) => {
                      event.preventDefault();
                      column.toggleVisibility(!column.getIsVisible());
                    }}
                    className="flex items-center gap-2"
                  >
                    <Checkbox checked={column.getIsVisible()} aria-label={`Toggle ${column.id}`} />
                    <span>{column.id.replaceAll("_", " ")}</span>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {table.getSelectedRowModel().rows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-chart-1/30 bg-chart-1/10 px-3 py-2 text-sm">
          <p className="text-chart-1">{table.getSelectedRowModel().rows.length} selected</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-xl border-border/60" onClick={() => setRowSelection({})}>
              Clear
            </Button>
            <Button
              type="button"
              className="accent-strong rounded-xl text-black"
              onClick={() => onBulkAssign?.(table.getSelectedRowModel().rows.map((row) => row.original))}
              disabled={table.getSelectedRowModel().rows.length === 0}
            >
              Assign Selected
            </Button>
          </div>
        </div>
      ) : null}

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
