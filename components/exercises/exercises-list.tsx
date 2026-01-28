"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback } from "react"; // Added hooks
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    ColumnDef,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Dumbbell, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { ExerciseActions } from "./exercises-actions";
import { ExerciseSheet } from "./exercises-sheet";
import { useInfiniteQueryExercises } from "@/hooks/use-exercise";

export function ExercisesList() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQueryExercises(debouncedSearch);

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState<any | null>(null);

    // useMemo ensures these arrays don't trigger re-renders
    const exercises = useMemo(() =>
        data?.pages.flatMap((page) => page.data) || [],
        [data]);

    // useCallback keeps the function reference stable
    const handleEdit = useCallback((exercise: any) => {
        setEditingExercise(exercise);
        setIsSheetOpen(true);
    }, []);

    const handleCreate = useCallback(() => {
        setEditingExercise(null);
        setIsSheetOpen(true);
    }, []);

    // --- CRITICAL FIX: Memoize Columns ---
    // Without useMemo, this array is recreated on every render, 
    // causing the table to loop endlessly.
    const columns = useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium text-foreground">{row.original.name}</span>
                    <span className="text-xs text-muted-foreground md:hidden">
                        {row.original.muscle_groups?.join(", ")}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "category",
            header: "Category",
            cell: ({ row }) => (
                <Badge variant="secondary" className="font-normal">
                    {row.original.category}
                </Badge>
            ),
        },
        {
            accessorKey: "muscle_groups",
            header: "Muscles",
            meta: { className: "hidden md:table-cell" },
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {row.original.muscle_groups?.slice(0, 2).map((m: string) => (
                        <span key={m} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{m}</span>
                    ))}
                    {(row.original.muscle_groups?.length || 0) > 2 && (
                        <span className="text-xs text-muted-foreground">+{(row.original.muscle_groups?.length || 0) - 2}</span>
                    )}
                </div>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => <ExerciseActions exercise={row.original} onEdit={handleEdit} />,
        },
    ], [handleEdit]); // Only recreate if handleEdit changes

    const table = useReactTable({
        data: exercises,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search exercises..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Button onClick={handleCreate} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add Exercise
                </Button>
            </div>

            <div className="rounded-md border bg-card flex-1 overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : exercises.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                        <Dumbbell className="h-12 w-12 mb-2 opacity-20" />
                        <p>No exercises found.</p>
                    </div>
                ) : (
                    <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => {
                                            const hiddenClass = (header.column.columnDef.meta as any)?.className || "";
                                            return (
                                                <TableHead key={header.id} className={hiddenClass}>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                                </TableHead>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={(e) => {
                                            // Prevent navigation if clicking the "Actions" button specifically
                                            // (The generic type check handles standard HTML elements)
                                            if ((e.target as HTMLElement).closest("button")) return;

                                            router.push(`/exercises/${row.original.id}`);
                                        }}
                                    >
                                        {row.getVisibleCells().map((cell) => {
                                            const hiddenClass = (cell.column.columnDef.meta as any)?.className || "";
                                            return (
                                                <TableCell key={cell.id} className={`py-3 ${hiddenClass}`}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {hasNextPage && (
                <div className="flex justify-center pt-2 pb-4">
                    <Button
                        variant="outline"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="w-full sm:w-auto"
                    >
                        {isFetchingNextPage ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                            </>
                        ) : (
                            "Load More"
                        )}
                    </Button>
                </div>
            )}

            <ExerciseSheet
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                exerciseToEdit={editingExercise}
            />
        </div>
    );
}