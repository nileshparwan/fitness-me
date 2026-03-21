"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { toast } from "sonner";

import type { ClientGoalItem, GoalStatus, GoalTrend } from "@/app/actions/coach-tools";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useExerciseSearch, useProgramSearch } from "@/hooks/use-goal-links";
import { useClientFitnessGoalsRealtimeSync } from "@/hooks/use-fitness-goals-realtime";
import { useClientGoals, useCoachToolMutations, useMyGoals } from "@/hooks/use-coach-tools";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { cn } from "@/utils";

const GOAL_STATUSES: GoalStatus[] = ["active", "on_track", "at_risk", "completed", "paused", "archived"];
const GOAL_CATEGORIES = ["weight", "muscle_gain", "strength", "performance", "nutrition", "custom"] as const;
const WEIGHT_FOCUSED_CATEGORIES = new Set(["weight", "weight_gain", "weight_maintenance", "fat_loss", "body_recomp"]);
const STRENGTH_FOCUSED_CATEGORIES = new Set(["strength", "performance", "muscle_gain"]);
const TABLE_STORAGE_VERSION = "v4";
const DEFAULT_TABLE_SORTING: SortingState = [{ id: "updated_at", desc: true }];
const DEFAULT_TABLE_VISIBILITY: VisibilityState = {
  unit: false,
  start_value: false,
  start_date: false,
  target_date: false,
  notes: false,
  remaining: false,
  value_delta: false,
  pace_delta: false,
  days_remaining: false,
  elapsed_days: false,
  goal_direction: false,
  check_in_interval_days: false,
};
const DEFAULT_TABLE_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 10 };
const PAGE_SIZE_OPTIONS = ["5", "10", "20", "40"] as const;
const TABLE_COLUMN_LABELS: Record<string, string> = {
  goal: "Goal",
  category: "Category",
  priority: "Priority",
  start_value: "Start",
  current_value: "Current",
  target_value: "Target",
  remaining: "Remaining",
  value_delta: "Delta",
  unit: "Unit",
  progress_percent: "% Complete",
  pace_delta: "Pace",
  status: "Status",
  trend: "Trend",
  start_date: "Start Date",
  elapsed_days: "Elapsed",
  target_date: "Target Date",
  days_remaining: "Days Left",
  goal_direction: "Direction",
  check_in_interval_days: "Check-in",
  updated_at: "Updated",
  notes: "Notes",
  actions: "Actions",
};

type PersistedGoalsTableState = {
  globalFilter: string;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  pagination: PaginationState;
};

type GoalFormState = {
  goal: string;
  category: string;
  start_value: string;
  current_value: string;
  target_value: string;
  unit: string;
  status: GoalStatus;
  start_date: string;
  target_date: string;
  notes: string;
  priority: string;
  goal_direction: string;
  check_in_interval_days: string;
  linked_exercise_id: string | null;
  linked_exercise_name: string | null;
  linked_program_id: string | null;
  linked_program_name: string | null;
};

function formatDateLabel(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function statusPillClass(status: GoalStatus) {
  if (status === "completed" || status === "on_track") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (status === "at_risk") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (status === "paused") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  if (status === "archived") return "border-border/60 bg-muted/40 text-muted-foreground";
  return "border-chart-3/40 bg-chart-3/10 text-chart-3";
}

function trendClass(trend: GoalTrend) {
  if (trend === "uptrend") return "text-green-400";
  if (trend === "downtrend") return "text-red-400";
  return "text-yellow-400";
}

function trendLabel(trend: GoalTrend) {
  if (trend === "uptrend") return "Uptrend";
  if (trend === "downtrend") return "Downtrend";
  return "Stable";
}

function categoryLabel(category: string) {
  return category.replaceAll("_", " ");
}

function priorityLabel(p: number) {
  if (p <= 2) return "High";
  if (p === 3) return "Med";
  return "Low";
}

function priorityClass(p: number) {
  if (p <= 2) return "border-destructive/40 bg-destructive/10 text-destructive";
  if (p === 3) return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  return "border-border/60 bg-muted/40 text-muted-foreground";
}

function paceLabel(delta: number | null) {
  if (delta === null) return null;
  if (delta >= 2) return `Ahead +${delta}%`;
  if (delta <= -2) return `Behind ${delta}%`;
  return "On track";
}

function paceClass(delta: number | null) {
  if (delta === null) return "text-muted-foreground";
  if (delta >= 2) return "text-green-400";
  if (delta <= -2) return "text-red-400";
  return "text-yellow-400";
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCategoryKey(value: string | null | undefined) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function isWeightFocusedCategory(value: string | null | undefined) {
  const normalized = normalizeCategoryKey(value);
  return (
    normalized === "weight" ||
    WEIGHT_FOCUSED_CATEGORIES.has(normalized) ||
    normalized.includes("weight") ||
    normalized.includes("fat") ||
    normalized.includes("body")
  );
}

function isStrengthFocusedCategory(value: string | null | undefined) {
  const normalized = normalizeCategoryKey(value);
  return STRENGTH_FOCUSED_CATEGORIES.has(normalized);
}

function defaultModalSections(category: string) {
  const base = ["goal-basics", "goal-metrics", "timeline"];
  if (isWeightFocusedCategory(category)) return [...base, "notes"];
  return [...base, "notes"];
}

function categoryHelperText(category: string) {
  if (isWeightFocusedCategory(category)) {
    return "Weight goal selected. Use start/current/target values in kg and choose the right direction.";
  }
  if (isStrengthFocusedCategory(category)) {
    return "Strength/performance goal selected. Use start/current/target values for your chosen unit.";
  }
  return "Use whichever metric group best matches this goal.";
}

function defaultFormState(): GoalFormState {
  return {
    goal: "",
    category: "weight",
    start_value: "",
    current_value: "",
    target_value: "",
    unit: "",
    status: "active",
    start_date: new Date().toISOString().slice(0, 10),
    target_date: "",
    notes: "",
    priority: "1",
    goal_direction: "decrease",
    check_in_interval_days: "",
    linked_exercise_id: null,
    linked_exercise_name: null,
    linked_program_id: null,
    linked_program_name: null,
  };
}

function formStateFromGoal(goal: ClientGoalItem): GoalFormState {
  return {
    goal: goal.goal,
    category: isWeightFocusedCategory(goal.category) ? "weight" : goal.category || "custom",
    start_value: goal.start_value === null ? "" : String(goal.start_value),
    current_value: goal.current_value === null ? "" : String(goal.current_value),
    target_value: goal.target_value === null ? "" : String(goal.target_value),
    unit: goal.unit || "",
    status: goal.status,
    start_date: goal.start_date,
    target_date: goal.target_date || "",
    notes: goal.notes || "",
    priority: String(goal.priority ?? 1),
    goal_direction: goal.goal_direction || (isWeightFocusedCategory(goal.category) ? "decrease" : "increase"),
    check_in_interval_days: goal.check_in_interval_days ? String(goal.check_in_interval_days) : "",
    linked_exercise_id: goal.linked_exercise_id || null,
    linked_exercise_name: goal.linked_exercise_name || null,
    linked_program_id: goal.linked_program_id || null,
    linked_program_name: goal.linked_program_name || null,
  };
}

function tableStorageKey(clientId: string) {
  return `coach-client-goals-table:${TABLE_STORAGE_VERSION}:${clientId}`;
}

function parsePersistedTableState(value: string | null): PersistedGoalsTableState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PersistedGoalsTableState>;
    return {
      globalFilter: typeof parsed.globalFilter === "string" ? parsed.globalFilter : "",
      sorting: Array.isArray(parsed.sorting) ? parsed.sorting : DEFAULT_TABLE_SORTING,
      columnFilters: Array.isArray(parsed.columnFilters) ? parsed.columnFilters : [],
      columnVisibility:
        parsed.columnVisibility && typeof parsed.columnVisibility === "object"
          ? (parsed.columnVisibility as VisibilityState)
          : DEFAULT_TABLE_VISIBILITY,
      pagination:
        parsed.pagination &&
        typeof parsed.pagination.pageIndex === "number" &&
        typeof parsed.pagination.pageSize === "number"
          ? parsed.pagination
          : DEFAULT_TABLE_PAGINATION,
    };
  } catch {
    return null;
  }
}

function sortIndicator(sorted: false | "asc" | "desc") {
  if (sorted === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  if (sorted === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
}

function ExerciseSearchDropdown({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const query = useExerciseSearch(search);
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data?.pages]);

  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-background/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Link to Exercise (optional)</p>
        <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-xs" onClick={onClose}>
          Close
        </Button>
      </div>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search exercises..."
        className="h-10 rounded-xl border-border/60 bg-muted/20"
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border/50">
        {query.isLoading ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">Loading exercises...</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">No exercises found.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  onSelect(item.id, item.name);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40",
                  selectedId === item.id ? "bg-muted/40" : ""
                )}
              >
                <span className="text-sm">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.category || "General"}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {query.hasNextPage ? (
        <Button
          variant="outline"
          className="h-9 w-full rounded-lg border-border/60 bg-muted/20"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? "Loading..." : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}

function ProgramSearchDropdown({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const query = useProgramSearch(search);
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data?.pages]);

  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-background/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Link to Training Program (optional)</p>
        <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-xs" onClick={onClose}>
          Close
        </Button>
      </div>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search programs..."
        className="h-10 rounded-xl border-border/60 bg-muted/20"
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border/50">
        {query.isLoading ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">Loading programs...</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">No programs found.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  onSelect(item.id, item.name);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40",
                  selectedId === item.id ? "bg-muted/40" : ""
                )}
              >
                <span className="text-sm">{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {query.hasNextPage ? (
        <Button
          variant="outline"
          className="h-9 w-full rounded-lg border-border/60 bg-muted/20"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? "Loading..." : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}

export function ClientGoalsMedicalTab({
  clientId,
  medicalFlags,
  mode = "client",
  title = "Goals",
}: {
  clientId?: string;
  medicalFlags?: string[];
  mode?: "client" | "self";
  title?: string;
}) {
  const mutations = useCoachToolMutations();
  const clientGoalsQuery = useClientGoals(clientId || "", "all", 120, {
    enabled: mode !== "self" && Boolean(clientId),
  });
  const selfGoalsQuery = useMyGoals("all", 120, {
    enabled: mode === "self",
  });
  const query = mode === "self" ? selfGoalsQuery : clientGoalsQuery;
  const linkedUserId = mode !== "self" ? (query.data?.linked_user_id ?? null) : null;
  useClientFitnessGoalsRealtimeSync(linkedUserId, mode !== "self" ? (clientId ?? null) : null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ClientGoalItem | null>(null);
  const [form, setForm] = useState<GoalFormState>(() => defaultFormState());
  const [modalSections, setModalSections] = useState<string[]>(() => defaultModalSections("weight"));
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_TABLE_SORTING);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_TABLE_VISIBILITY);
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_TABLE_PAGINATION);
  const [tableStateHydrated, setTableStateHydrated] = useState(false);
  const [activeStatusGoalId, setActiveStatusGoalId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState<ClientGoalItem | null>(null);
  const [isExerciseDropdownOpen, setIsExerciseDropdownOpen] = useState(false);
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);

  const categories = useMemo(() => {
    const custom = query.data?.categories || [];
    const normalizedCustom = custom.map((category) => normalizeCategoryKey(category) || "custom");
    return Array.from(new Set([...GOAL_CATEGORIES, ...normalizedCustom])).sort((a, b) => a.localeCompare(b));
  }, [query.data?.categories]);

  const storageKey = useMemo(() => tableStorageKey(mode === "self" ? "self" : clientId || "unknown"), [clientId, mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = parsePersistedTableState(window.localStorage.getItem(storageKey));
    if (persisted) {
      setGlobalFilter(persisted.globalFilter);
      setSorting(persisted.sorting);
      setColumnFilters(persisted.columnFilters);
      setColumnVisibility({
        ...DEFAULT_TABLE_VISIBILITY,
        ...persisted.columnVisibility,
      });
      setPagination({
        pageIndex: Math.max(persisted.pagination.pageIndex, 0),
        pageSize: persisted.pagination.pageSize > 0 ? persisted.pagination.pageSize : DEFAULT_TABLE_PAGINATION.pageSize,
      });
    } else {
      setGlobalFilter("");
      setSorting(DEFAULT_TABLE_SORTING);
      setColumnFilters([]);
      setColumnVisibility(DEFAULT_TABLE_VISIBILITY);
      setPagination(DEFAULT_TABLE_PAGINATION);
    }
    setTableStateHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!tableStateHydrated || typeof window === "undefined") return;
    const nextState: PersistedGoalsTableState = {
      globalFilter,
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(nextState));
  }, [columnFilters, columnVisibility, globalFilter, pagination, sorting, storageKey, tableStateHydrated]);

  const openCreate = () => {
    setEditingGoal(null);
    setForm(defaultFormState());
    setModalSections(defaultModalSections("weight"));
    setIsExerciseDropdownOpen(false);
    setIsProgramDropdownOpen(false);
    setDialogOpen(true);
  };

  const openEdit = useCallback((goal: ClientGoalItem) => {
    setEditingGoal(goal);
    setForm(formStateFromGoal(goal));
    setModalSections(defaultModalSections(goal.category || "custom"));
    setIsExerciseDropdownOpen(false);
    setIsProgramDropdownOpen(false);
    setDialogOpen(true);
  }, []);

  const openDelete = useCallback((goal: ClientGoalItem) => {
    setDeletingGoal(goal);
    setDeleteDialogOpen(true);
  }, []);

  const onSaveGoal = async () => {
    if (!form.goal.trim()) {
      toast.error("Goal title is required.");
      return;
    }
    if (!form.category.trim()) {
      toast.error("Category is required.");
      return;
    }

    const startValue = parseOptionalNumber(form.start_value);
    const currentValue = parseOptionalNumber(form.current_value);
    const targetValue = parseOptionalNumber(form.target_value);
    if (targetValue === null || targetValue <= 0) {
      toast.error("Set a target value greater than zero.");
      return;
    }

    const payload = {
      goal: form.goal.trim(),
      category: form.category.trim(),
      start_value: startValue,
      current_value: currentValue,
      target_value: targetValue,
      unit: form.unit.trim() || null,
      status: form.status,
      start_date: form.start_date,
      target_date: form.target_date || null,
      notes: form.notes.trim() || null,
      priority: Number(form.priority) || 1,
      goal_direction: form.goal_direction as "increase" | "decrease",
      check_in_interval_days: form.check_in_interval_days ? Number(form.check_in_interval_days) : null,
      linked_exercise_id: form.linked_exercise_id,
      linked_program_id: form.linked_program_id,
    } as const;

    const result = editingGoal
      ? mode === "self"
        ? await withToastFeedback(
            mutations.updateOwnGoal.mutateAsync({
              ...payload,
              goal_id: editingGoal.id,
            }),
            {
              loading: "Updating goal...",
              success: "Goal updated",
              error: "Unable to save goal",
            }
          ).catch(() => null)
        : await withToastFeedback(
            mutations.updateGoal.mutateAsync({
              ...(payload as Omit<typeof payload, never> & { client_id: string }),
              client_id: clientId || "",
              goal_id: editingGoal.id,
            }),
            {
              loading: "Updating goal...",
              success: "Goal updated",
              error: "Unable to save goal",
            }
          ).catch(() => null)
      : mode === "self"
        ? await withToastFeedback(mutations.createOwnGoal.mutateAsync(payload), {
            loading: "Creating goal...",
            success: "Goal created",
            error: "Unable to save goal",
          }).catch(() => null)
        : await withToastFeedback(
            mutations.createGoal.mutateAsync({
              ...(payload as Omit<typeof payload, never> & { client_id: string }),
              client_id: clientId || "",
            }),
            {
              loading: "Creating goal...",
              success: "Goal created",
              error: "Unable to save goal",
            }
          ).catch(() => null);

    if (!result) return;
    setDialogOpen(false);
    setEditingGoal(null);
    setForm(defaultFormState());
  };

  const onStatusChange = useCallback(async (goal: ClientGoalItem, status: GoalStatus) => {
    if (goal.status === status) return;
    try {
      setActiveStatusGoalId(goal.id);
      const result = mode === "self"
        ? await withToastFeedback(
            mutations.updateOwnGoalStatus.mutateAsync({
              goal_id: goal.id,
              status,
            }),
            {
              loading: "Updating goal status...",
              success: "Goal status updated",
              error: "Unable to update goal status",
            }
          ).catch(() => null)
        : await withToastFeedback(
            mutations.updateGoalStatus.mutateAsync({
              client_id: clientId || "",
              goal_id: goal.id,
              status,
            }),
            {
              loading: "Updating goal status...",
              success: "Goal status updated",
              error: "Unable to update goal status",
            }
          ).catch(() => null);
      if (!result) return;
    } finally {
      setActiveStatusGoalId(null);
    }
  }, [clientId, mode, mutations.updateGoalStatus, mutations.updateOwnGoalStatus]);

  const onDeleteGoal = useCallback(async () => {
    if (!deletingGoal) return;
    const result = mode === "self"
      ? await withToastFeedback(
          mutations.deleteOwnGoal.mutateAsync({
            goal_id: deletingGoal.id,
            goal_title: deletingGoal.goal,
          }),
          {
            loading: "Deleting goal...",
            success: "Goal deleted",
            error: "Unable to delete goal",
          }
        ).catch(() => null)
      : await withToastFeedback(
          mutations.deleteGoal.mutateAsync({
            client_id: clientId || "",
            goal_id: deletingGoal.id,
            goal_title: deletingGoal.goal,
          }),
          {
            loading: "Deleting goal...",
            success: "Goal deleted",
            error: "Unable to delete goal",
          }
        ).catch(() => null);
    if (!result) return;
    setDeleteDialogOpen(false);
    setDeletingGoal(null);
  }, [clientId, deletingGoal, mode, mutations.deleteGoal, mutations.deleteOwnGoal]);

  const isSaving =
    mutations.createGoal.isPending ||
    mutations.updateGoal.isPending ||
    mutations.updateGoalStatus.isPending ||
    mutations.deleteGoal.isPending ||
    mutations.createOwnGoal.isPending ||
    mutations.updateOwnGoal.isPending ||
    mutations.updateOwnGoalStatus.isPending ||
    mutations.deleteOwnGoal.isPending;

  const linkedUserMissing = mode !== "self" && query.data && !query.data.linked_user_id;
  const activeCategory = form.category || "custom";

  const onCategoryChange = (value: string) => {
    const weightFocused = isWeightFocusedCategory(value);
    const direction = weightFocused ? "decrease" : "increase";
    setForm((prev) => ({
      ...prev,
      category: value,
      goal_direction: direction,
      unit: weightFocused && !prev.unit ? "kg" : prev.unit,
    }));
    setModalSections((prev) => {
      const recommended = "goal-metrics";
      return prev.includes(recommended) ? prev : [...prev, recommended];
    });
  };

  const columns = useMemo<ColumnDef<ClientGoalItem>[]>(
    () => [
      {
        accessorKey: "goal",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Goal
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="line-clamp-2 break-words text-sm font-medium">{row.original.goal}</p>
            <div className="flex flex-wrap gap-1">
              {row.original.exceeded_days > 0 ? (
                <span className="inline-flex rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-destructive">
                  Overdue · {row.original.exceeded_days}d
                </span>
              ) : null}
              {row.original.review_due ? (
                <span className="inline-flex rounded-full border border-chart-4/40 bg-chart-4/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-chart-4">
                  Review due
                </span>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Category
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        filterFn: (row, id, value) => {
          if (!value || value === "all") return true;
          return String(row.getValue(id)) === value;
        },
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{categoryLabel(row.original.category)}</span>,
      },
      {
        accessorKey: "priority",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Priority
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => (
          <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]", priorityClass(row.original.priority))}>
            {priorityLabel(row.original.priority)}
          </span>
        ),
      },
      {
        accessorKey: "start_value",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Start
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => <span className="text-sm">{row.original.start_value ?? "—"}</span>,
      },
      {
        accessorKey: "current_value",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Current
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => <span className="text-sm">{row.original.current_value ?? "—"}</span>,
      },
      {
        accessorKey: "target_value",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Target
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => <span className="text-sm">{row.original.target_value ?? "—"}</span>,
      },
      {
        accessorKey: "remaining",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Remaining
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => {
          const r = row.original.remaining;
          if (r === null) return <span className="text-sm text-muted-foreground">—</span>;
          return <span className="text-sm">{r}{row.original.unit ? ` ${row.original.unit}` : ""}</span>;
        },
      },
      {
        accessorKey: "value_delta",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Delta
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => {
          const d = row.original.value_delta;
          if (d === null) return <span className="text-sm text-muted-foreground">—</span>;
          const color = d > 0 ? "text-green-400" : d < 0 ? "text-red-400" : "text-muted-foreground";
          return <span className={cn("text-sm font-medium", color)}>{d > 0 ? "+" : ""}{d}</span>;
        },
      },
      {
        accessorKey: "unit",
        header: "Unit",
        cell: ({ row }) => <span className="text-sm">{row.original.unit || "—"}</span>,
      },
      {
        accessorKey: "progress_percent",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            % Complete
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => <span className="text-sm font-semibold">{row.original.progress_percent}%</span>,
      },
      {
        accessorKey: "pace_delta",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Pace
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => {
          const label = paceLabel(row.original.pace_delta);
          return <span className={cn("text-xs font-medium", paceClass(row.original.pace_delta))}>{label ?? "—"}</span>;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, id, value) => {
          if (!value || value === "all") return true;
          return String(row.getValue(id)) === value;
        },
        cell: ({ row }) => {
          const goal = row.original;
          const isUpdatingStatus = mutations.updateGoalStatus.isPending && activeStatusGoalId === goal.id;
          return (
            <div className="flex items-center gap-1.5">
              <Select
                value={goal.status}
                onValueChange={(value) => void onStatusChange(goal, value as GoalStatus)}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className={cn("h-6 w-[96px] min-w-0 rounded-md border px-1 text-[10px]", statusPillClass(goal.status))}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isUpdatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
            </div>
          );
        },
      },
      {
        accessorKey: "trend",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Trend
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => {
          const trend = row.original.trend;
          const td = row.original.trend_delta;
          return (
            <span className={cn("inline-flex items-center gap-1 text-xs font-medium", trendClass(trend))}>
              {trend === "uptrend" ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : trend === "downtrend" ? (
                <ArrowDownRight className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              {trendLabel(trend)}
              {td !== null ? <span className="text-[10px] opacity-70">({td > 0 ? "+" : ""}{td}%)</span> : null}
            </span>
          );
        },
      },
      {
        accessorKey: "start_date",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Start Date
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateLabel(row.original.start_date)}</span>,
      },
      {
        accessorKey: "elapsed_days",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Elapsed
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => {
          const d = row.original.elapsed_days;
          return <span className="text-sm text-muted-foreground">{d !== null ? `${d}d` : "—"}</span>;
        },
      },
      {
        accessorKey: "target_date",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Target Date
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateLabel(row.original.target_date)}</span>,
      },
      {
        accessorKey: "days_remaining",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Days Left
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => {
          const d = row.original.days_remaining;
          if (d === null) return <span className="text-sm text-muted-foreground">—</span>;
          const color = d <= 0 ? "text-destructive" : d <= 7 ? "text-chart-4" : "text-muted-foreground";
          return <span className={cn("text-sm font-medium", color)}>{d}d</span>;
        },
      },
      {
        accessorKey: "goal_direction",
        header: "Direction",
        cell: ({ row }) => <span className="text-sm text-muted-foreground capitalize">{row.original.goal_direction}</span>,
      },
      {
        accessorKey: "check_in_interval_days",
        header: "Check-in",
        cell: ({ row }) => {
          const d = row.original.check_in_interval_days;
          return <span className="text-sm text-muted-foreground">{d ? `Every ${d}d` : "—"}</span>;
        },
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Updated
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatUpdatedAt(row.original.updated_at)}</span>,
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
          <span className="line-clamp-2 break-words text-xs text-muted-foreground">{row.original.notes || "—"}</span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        header: () => <span className="text-right text-xs font-semibold uppercase tracking-[0.08em]">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => openEdit(row.original)}
              title="Edit goal"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => openDelete(row.original)}
              title="Delete goal"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [activeStatusGoalId, mutations.updateGoalStatus.isPending, onStatusChange, openDelete, openEdit]
  );

  const table = useReactTable({
    data: query.data?.goals ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const input = String(filterValue || "").trim().toLowerCase();
      if (!input) return true;
      const goal = row.original;
      return [goal.goal, categoryLabel(goal.category), goal.notes || "", goal.status, trendLabel(goal.trend)]
        .join(" ")
        .toLowerCase()
        .includes(input);
    },
  });

  const statusColumn = table.getColumn("status");
  const categoryColumn = table.getColumn("category");
  const statusFilterValue = (statusColumn?.getFilterValue() as string | undefined) ?? "all";
  const categoryFilterValue = (categoryColumn?.getFilterValue() as string | undefined) ?? "all";
  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageRows = table.getRowModel().rows;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageStart = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd = filteredCount === 0 ? 0 : Math.min(pageStart + pageRows.length - 1, filteredCount);

  const clearFilters = () => {
    setGlobalFilter("");
    setColumnFilters([]);
    setSorting(DEFAULT_TABLE_SORTING);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  return (
    <div className="min-w-0 space-y-4">
      <section className="glass-surface overflow-hidden rounded-[10px] border border-border/60 p-4">
        <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setIsExerciseDropdownOpen(false);
                  setIsProgramDropdownOpen(false);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="accent-strong rounded-xl text-black" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[10px] border-border/70 bg-card/95 sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingGoal ? "Update Goal" : "Create Goal"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  <p className="rounded-lg border border-border/60 bg-background/20 px-3 py-2 text-xs text-muted-foreground">
                    Percentage completion and trend are calculated automatically from current, target, and saved history.
                  </p>

                  <Accordion type="multiple" value={modalSections} onValueChange={setModalSections} className="space-y-2">
                    <AccordionItem value="goal-basics" className="rounded-xl border border-border/60 bg-background/20 px-3">
                      <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">Goal Basics</AccordionTrigger>
                      <AccordionContent className="space-y-3 pb-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Goal</Label>
                            <Input
                              value={form.goal}
                              onChange={(event) => setForm((prev) => ({ ...prev, goal: event.target.value }))}
                              className="h-11 rounded-xl border-border/60 bg-muted/20 focus-visible:ring-chart-1/60"
                              placeholder="e.g. Lose 10 lbs"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={form.category} onValueChange={onCategoryChange}>
                              <SelectTrigger className="h-11 w-full rounded-xl border-border/60 bg-muted/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category.replaceAll("_", " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Direction</Label>
                            <Select value={form.goal_direction} onValueChange={(v) => setForm((prev) => ({ ...prev, goal_direction: v }))}>
                              <SelectTrigger className="h-11 w-full rounded-xl border-border/60 bg-muted/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="increase">Increase</SelectItem>
                                <SelectItem value="decrease">Decrease</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{categoryHelperText(activeCategory)}</p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="goal-metrics" className="rounded-xl border border-border/60 bg-background/20 px-3">
                      <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">Goal Metrics</AccordionTrigger>
                      <AccordionContent className="space-y-3 pb-3">
                        <p className="text-xs text-muted-foreground">
                          Enter start, current, and target values. Progress and trends are calculated automatically from these values.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div className="space-y-2">
                            <Label>Start Value</Label>
                            <Input
                              value={form.start_value}
                              onChange={(event) => setForm((prev) => ({ ...prev, start_value: event.target.value }))}
                              className="h-11 rounded-xl border-border/60 bg-muted/20"
                              placeholder="0"
                              disabled={!!editingGoal}
                              title={editingGoal ? "Start value is locked after creation" : undefined}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Current Value</Label>
                            <Input
                              value={form.current_value}
                              onChange={(event) => setForm((prev) => ({ ...prev, current_value: event.target.value }))}
                              className="h-11 rounded-xl border-border/60 bg-muted/20"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Target Value</Label>
                            <Input
                              value={form.target_value}
                              onChange={(event) => setForm((prev) => ({ ...prev, target_value: event.target.value }))}
                              className="h-11 rounded-xl border-border/60 bg-muted/20"
                              placeholder="100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit</Label>
                            <Input
                              value={form.unit}
                              onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
                              className="h-11 rounded-xl border-border/60 bg-muted/20"
                              placeholder="kg / reps / km / min"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="timeline" className="rounded-xl border border-border/60 bg-background/20 px-3">
                      <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">Progress Tracking & Timeline</AccordionTrigger>
                      <AccordionContent className="space-y-3 pb-3">
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                              value={form.status}
                              onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as GoalStatus }))}
                            >
                              <SelectTrigger className="h-11 w-full rounded-xl border-border/60 bg-muted/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {GOAL_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status.replaceAll("_", " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              value={form.start_date}
                              onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))}
                              className="h-11 rounded-xl border-border/60 bg-muted/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Target Date</Label>
                            <Input
                              type="date"
                              value={form.target_date}
                              onChange={(event) => setForm((prev) => ({ ...prev, target_date: event.target.value }))}
                              className="h-11 rounded-xl border-border/60 bg-muted/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select
                              value={form.priority}
                              onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}
                            >
                              <SelectTrigger className="h-11 w-full rounded-xl border-border/60 bg-muted/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["1", "2", "3", "4", "5"].map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Check-in Interval</Label>
                            <Select
                              value={form.check_in_interval_days || "none"}
                              onValueChange={(value) => setForm((prev) => ({ ...prev, check_in_interval_days: value === "none" ? "" : value }))}
                            >
                              <SelectTrigger className="h-11 w-full rounded-xl border-border/60 bg-muted/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="7">Every 7 days</SelectItem>
                                <SelectItem value="14">Every 14 days</SelectItem>
                                <SelectItem value="21">Every 21 days</SelectItem>
                                <SelectItem value="30">Every 30 days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="notes" className="rounded-xl border border-border/60 bg-background/20 px-3">
                      <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">Notes & Extra Context</AccordionTrigger>
                      <AccordionContent className="space-y-2 pb-3">
                        <Label>Notes (optional)</Label>
                        <Textarea
                          rows={3}
                          value={form.notes}
                          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                          className="rounded-xl border-border/60 bg-muted/20"
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/60 bg-background/20 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                          Link to Exercise (optional)
                        </p>
                        {!isExerciseDropdownOpen ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-lg border-border/60 bg-muted/20 px-2 text-xs"
                            onClick={() => setIsExerciseDropdownOpen(true)}
                          >
                            Search exercises
                          </Button>
                        ) : null}
                      </div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {form.linked_exercise_id ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-1 text-xs">
                            {form.linked_exercise_name || "Selected exercise"}
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  linked_exercise_id: null,
                                  linked_exercise_name: null,
                                }))
                              }
                              className="rounded p-0.5 hover:bg-muted/60"
                              aria-label="Clear exercise link"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">None selected</span>
                        )}
                      </div>
                      {isExerciseDropdownOpen ? (
                        <ExerciseSearchDropdown
                          selectedId={form.linked_exercise_id}
                          onSelect={(id, name) =>
                            setForm((prev) => ({
                              ...prev,
                              linked_exercise_id: id,
                              linked_exercise_name: name,
                            }))
                          }
                          onClose={() => setIsExerciseDropdownOpen(false)}
                        />
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background/20 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                          Link to Training Program (optional)
                        </p>
                        {!isProgramDropdownOpen ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-lg border-border/60 bg-muted/20 px-2 text-xs"
                            onClick={() => setIsProgramDropdownOpen(true)}
                          >
                            Search programs
                          </Button>
                        ) : null}
                      </div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {form.linked_program_id ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-1 text-xs">
                            {form.linked_program_name || "Selected program"}
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  linked_program_id: null,
                                  linked_program_name: null,
                                }))
                              }
                              className="rounded p-0.5 hover:bg-muted/60"
                              aria-label="Clear program link"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">None selected</span>
                        )}
                      </div>
                      {isProgramDropdownOpen ? (
                        <ProgramSearchDropdown
                          selectedId={form.linked_program_id}
                          onSelect={(id, name) =>
                            setForm((prev) => ({
                              ...prev,
                              linked_program_id: id,
                              linked_program_name: name,
                            }))
                          }
                          onClose={() => setIsProgramDropdownOpen(false)}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <div className="grid w-full grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl border-border/60 bg-muted/30"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button className="h-11 rounded-xl bg-chart-1 text-white hover:bg-chart-1/90" onClick={() => void onSaveGoal()} disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {editingGoal ? "Save Changes" : "Create Goal"}
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={deleteDialogOpen}
              onOpenChange={(open) => {
                if (!open && !mutations.deleteGoal.isPending) {
                  setDeletingGoal(null);
                }
                setDeleteDialogOpen(open);
              }}
            >
              <DialogContent className="rounded-[10px] border-border/70 bg-card/95 sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete Goal</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Delete <span className="font-medium text-foreground">{deletingGoal?.goal || "this goal"}</span>?
                  This action cannot be undone.
                </p>
                <DialogFooter>
                  <div className="grid w-full grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl border-border/60 bg-muted/30"
                      onClick={() => {
                        setDeleteDialogOpen(false);
                        setDeletingGoal(null);
                      }}
                      disabled={mutations.deleteGoal.isPending}
                    >
                      Keep Goal
                    </Button>
                    <Button
                      className="h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => void onDeleteGoal()}
                      disabled={mutations.deleteGoal.isPending || !deletingGoal}
                    >
                      {mutations.deleteGoal.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Delete Goal
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-4 grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-10 w-full rounded-xl border-border/60 bg-muted/20 pl-9"
              placeholder="Search goals, categories, notes..."
            />
          </div>
          <Select
            value={statusFilterValue}
            onValueChange={(value) => statusColumn?.setFilterValue(value === "all" ? undefined : value)}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20 lg:w-[170px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {GOAL_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={categoryFilterValue}
            onValueChange={(value) => categoryColumn?.setFilterValue(value === "all" ? undefined : value)}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20 lg:w-[170px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {categoryLabel(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 w-full rounded-xl border-border/60 bg-muted/20 text-muted-foreground lg:w-[140px]"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/70 bg-card/95">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuItem
                    key={column.id}
                    className="cursor-pointer"
                    onSelect={(event) => event.preventDefault()}
                  >
                    <label className="flex w-full cursor-pointer items-center gap-2">
                      <Checkbox
                        checked={column.getIsVisible()}
                        onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
                      />
                      <span className="text-sm">{TABLE_COLUMN_LABELS[column.id] || column.id}</span>
                    </label>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            className="h-10 w-full rounded-xl border-border/60 bg-muted/20 text-muted-foreground lg:w-[130px]"
            onClick={clearFilters}
          >
            <FilterX className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>

        {query.isLoading && !query.data ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : null}

        {query.isError ? (
          <p className="text-sm text-destructive">
            {query.error instanceof Error ? query.error.message : "Unable to load goals"}
          </p>
        ) : null}

        {linkedUserMissing ? (
          <p className="rounded-xl border border-border/60 bg-background/20 px-3 py-3 text-sm text-muted-foreground">
            Link this client to a user account before using measurable goals and trends.
          </p>
        ) : null}

        {!linkedUserMissing && query.data ? (
          <>
            <div className="hidden w-full max-w-full md:block">
              <Table className="w-full table-fixed">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="px-3 py-2 align-middle">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={table.getVisibleFlatColumns().length}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No goals found for this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageRows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-3 py-2 align-top">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 md:hidden">
              {pageRows.length === 0 ? (
                <p className="rounded-xl border border-border/60 bg-background/25 px-3 py-4 text-sm text-muted-foreground">
                  No goals found for this filter.
                </p>
              ) : (
                pageRows.map((row) => {
                  const goal = row.original;
                  return (
                  <article key={goal.id} className="rounded-xl border border-border/60 bg-background/30 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{goal.goal}</p>
                        <p className="text-xs text-muted-foreground">{categoryLabel(goal.category)}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {goal.exceeded_days > 0 ? (
                            <span className="inline-flex rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-destructive">
                              Overdue · {goal.exceeded_days}d
                            </span>
                          ) : null}
                          {goal.review_due ? (
                            <span className="inline-flex rounded-full border border-chart-4/40 bg-chart-4/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-chart-4">
                              Review due
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-sm font-semibold">{goal.progress_percent}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Start: {goal.start_value ?? "—"}</span>
                      <span>Current: {goal.current_value ?? "—"}</span>
                      <span>Target: {goal.target_value ?? "—"}</span>
                      <span>Unit: {goal.unit || "—"}</span>
                      <span className={cn("inline-flex items-center gap-1", trendClass(goal.trend))}>
                        {goal.trend === "uptrend" ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : goal.trend === "downtrend" ? (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        ) : (
                          <Minus className="h-3.5 w-3.5" />
                        )}
                        {trendLabel(goal.trend)}
                      </span>
                      <span>Start: {formatDateLabel(goal.start_date)}</span>
                      <span>Target: {formatDateLabel(goal.target_date)}</span>
                    </div>
                    {goal.notes ? <p className="mt-2 text-xs text-muted-foreground">{goal.notes}</p> : null}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Select value={goal.status} onValueChange={(value) => void onStatusChange(goal, value as GoalStatus)}>
                        <SelectTrigger className={cn("h-9 w-[150px] rounded-lg border px-2 text-xs", statusPillClass(goal.status))}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GOAL_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replaceAll("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-xs" onClick={() => openEdit(goal)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  </article>
                );
                })
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
              <p className="text-xs text-muted-foreground">
                {filteredCount === 0 ? "No goals" : `Showing ${pageStart}-${pageEnd} of ${filteredCount} goals`}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) =>
                    table.setPagination({
                      pageIndex: 0,
                      pageSize: Number(value),
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-[112px] rounded-lg border-border/60 bg-muted/20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="inline-flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/60 bg-muted/20"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-1 text-xs text-muted-foreground">
                    {table.getPageCount() === 0 ? "0 / 0" : `${pageIndex + 1} / ${table.getPageCount()}`}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/60 bg-muted/20"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {mode !== "self" ? (
        <section className="glass-surface rounded-[10px] border border-border/60 p-4">
          <h2 className="mb-3 text-base font-semibold">Medical Flags</h2>
          {(medicalFlags || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No medical flags recorded.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {(medicalFlags || []).map((flag, index) => (
                <li key={`${flag}-${index}`} className="flex items-start gap-2 text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-chart-4" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
