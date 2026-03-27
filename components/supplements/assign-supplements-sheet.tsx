"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

import { addSupplementAssignmentsBulkAction } from "@/app/actions/supplements";
import type { SupplementProfileStatus } from "@/app/actions/supplements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  useSupplementAssignments,
  useSupplementCatalog,
  useSupplementPeople,
  useSupplementProgramOptions,
  type SupplementSubject,
} from "@/hooks/use-supplements";
import { normalizeSupplementDisplayName } from "@/lib/nutrition/supplements";
import { supplementKeys } from "@/lib/query-keys-supplements";
import { cn } from "@/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSubject?: SupplementSubject | null;
  initialProfileId?: string | null;
  initialStatus?: SupplementProfileStatus | null;
  initialTitle?: string | null;
  initialWorkoutProgram?: string | null;
  initialNutritionProgram?: string | null;
  initialSupplementIds?: string[] | null;
};

export function AssignSupplementsSheet({
  open,
  onOpenChange,
  initialSubject,
  initialProfileId,
  initialStatus,
  initialTitle,
  initialWorkoutProgram,
  initialNutritionProgram,
  initialSupplementIds,
}: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState<SupplementSubject>(initialSubject || { type: "me" });
  const [profileId, setProfileId] = useState<string | null>(initialProfileId || null);
  const [status, setStatus] = useState<SupplementProfileStatus>(initialStatus || "active");
  const [title, setTitle] = useState(initialTitle || "");
  const [selectedSupplementIds, setSelectedSupplementIds] = useState<string[]>([]);
  const [selectedWorkoutProgramId, setSelectedWorkoutProgramId] = useState<string | null>(null);
  const [selectedNutritionProgramId, setSelectedNutritionProgramId] = useState<string | null>(null);
  const [selectedWorkoutProgramLabel, setSelectedWorkoutProgramLabel] = useState(initialWorkoutProgram || "");
  const [selectedNutritionProgramLabel, setSelectedNutritionProgramLabel] = useState(initialNutritionProgram || "");
  const [supplementSearch, setSupplementSearch] = useState("");
  const [hasPrefilledSupplements, setHasPrefilledSupplements] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [supplementOpen, setSupplementOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubject(initialSubject || { type: "me" });
    setProfileId(initialProfileId || null);
    setStatus(initialStatus || "active");
    setTitle(initialTitle || "");
    setSelectedSupplementIds(initialSupplementIds || []);
    setSelectedWorkoutProgramId(null);
    setSelectedNutritionProgramId(null);
    setSelectedWorkoutProgramLabel(initialWorkoutProgram || "");
    setSelectedNutritionProgramLabel(initialNutritionProgram || "");
    setSupplementSearch("");
    setHasPrefilledSupplements(false);
  }, [
    initialNutritionProgram,
    initialProfileId,
    initialStatus,
    initialSubject,
    initialTitle,
    initialWorkoutProgram,
    initialSupplementIds,
    open,
  ]);

  const peopleQuery = useSupplementPeople();
  const programsQuery = useSupplementProgramOptions(subject, open);
  const existingAssignmentsQuery = useSupplementAssignments(
    subject,
    profileId || undefined,
    open && Boolean(profileId)
  );
  const catalogQuery = useSupplementCatalog({ search: supplementSearch, enabled: open });

  const workoutPrograms = useMemo(
    () => (programsQuery.data || []).filter((item) => item.kind === "workout"),
    [programsQuery.data]
  );
  const nutritionPrograms = useMemo(
    () => (programsQuery.data || []).filter((item) => item.kind === "nutrition"),
    [programsQuery.data]
  );

  const selectedPerson = useMemo(() => {
    if (subject.type === "me") {
      return (peopleQuery.data || []).find((person) => person.subject.type === "me") || null;
    }
    return (
      (peopleQuery.data || []).find(
        (person) => person.subject.type === "client" && person.subject.id === subject.id
      ) || null
    );
  }, [peopleQuery.data, subject]);

  const selectedWorkoutProgram = useMemo(
    () => workoutPrograms.find((program) => program.id === selectedWorkoutProgramId) || null,
    [selectedWorkoutProgramId, workoutPrograms]
  );
  const selectedNutritionProgram = useMemo(
    () => nutritionPrograms.find((program) => program.id === selectedNutritionProgramId) || null,
    [nutritionPrograms, selectedNutritionProgramId]
  );

  useEffect(() => {
    if (!open) return;
    if (!selectedWorkoutProgramId && selectedWorkoutProgramLabel) {
      const match = workoutPrograms.find((program) => program.label === selectedWorkoutProgramLabel);
      if (match) setSelectedWorkoutProgramId(match.id);
    }
  }, [open, selectedWorkoutProgramId, selectedWorkoutProgramLabel, workoutPrograms]);

  useEffect(() => {
    if (!open) return;
    if (!selectedNutritionProgramId && selectedNutritionProgramLabel) {
      const match = nutritionPrograms.find((program) => program.label === selectedNutritionProgramLabel);
      if (match) setSelectedNutritionProgramId(match.id);
    }
  }, [nutritionPrograms, open, selectedNutritionProgramId, selectedNutritionProgramLabel]);

  const selectedSupplements = useMemo(() => {
    const byId = new Map(
      (catalogQuery.data || []).map((row) => [
        row.id,
        { id: row.id, name: row.name },
      ] as const)
    );
    for (const row of existingAssignmentsQuery.data || []) {
      if (!byId.has(row.supplement_id)) {
        byId.set(row.supplement_id, {
          id: row.supplement_id,
          name: row.supplement_name,
        });
      }
    }

    return selectedSupplementIds
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }, [catalogQuery.data, existingAssignmentsQuery.data, selectedSupplementIds]);

  useEffect(() => {
    if (!open) return;
    if (hasPrefilledSupplements) return;
    if (!profileId) {
      setSelectedSupplementIds(initialSupplementIds || []);
      setHasPrefilledSupplements(true);
      return;
    }
    if (existingAssignmentsQuery.isLoading) return;
    const existingIds = Array.from(
      new Set((existingAssignmentsQuery.data || []).map((row) => row.supplement_id))
    );
    setSelectedSupplementIds(Array.from(new Set([...(initialSupplementIds || []), ...existingIds])));
    setHasPrefilledSupplements(true);
  }, [
    existingAssignmentsQuery.data,
    existingAssignmentsQuery.isLoading,
    hasPrefilledSupplements,
    initialSupplementIds,
    open,
    profileId,
  ]);

  const assignMutation = useMutation({
    mutationFn: addSupplementAssignmentsBulkAction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supplementKeys.subjects() }),
        queryClient.invalidateQueries({ queryKey: supplementKeys.assignmentScope(subject) }),
      ]);
      toast.success("Supplements assigned");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to assign supplements");
    },
  });

  const toggleSupplement = (supplementId: string) => {
    setSelectedSupplementIds((current) =>
      current.includes(supplementId)
        ? current.filter((id) => id !== supplementId)
        : [...current, supplementId]
    );
  };

  const submit = async () => {
    if (selectedSupplementIds.length === 0) {
      toast.error("Select at least one supplement");
      return;
    }

    await assignMutation.mutateAsync({
      subject,
      profile_id: profileId || undefined,
      supplement_ids: selectedSupplementIds,
      title: title.trim() || undefined,
      workout_program: selectedWorkoutProgramLabel.trim() || undefined,
      nutrition_program: selectedNutritionProgramLabel.trim() || undefined,
      status,
    });
  };

  const isEditingStack = Boolean(profileId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "gap-0 border-border/70 bg-card/95 p-0",
          isDesktop ? "w-full sm:max-w-[760px]" : "max-h-[92vh] rounded-t-2xl"
        )}
      >
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle>{isEditingStack ? "Edit Supplement Stack" : "Assign Supplements"}</SheetTitle>
          <SheetDescription>
            {isEditingStack
              ? "Update stack title, status, linked programs, and assigned supplements."
              : "Assign supplements to a person and link them to workout and nutrition programs."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <Label>Assigned Client</Label>
            <Popover open={personOpen} onOpenChange={setPersonOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full justify-between rounded-xl border-border/60 bg-muted/20"
                >
                  <span className="truncate">{selectedPerson?.display_name || "Select person"}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[420px] max-w-[calc(100vw-2rem)] rounded-xl border-border/70 bg-card/95 p-2"
              >
                <ScrollArea className="max-h-[280px] pr-2">
                  <div className="space-y-1">
                    {(peopleQuery.data || []).map((person) => {
                      const active =
                        (person.subject.type === "me" && subject.type === "me") ||
                        (person.subject.type === "client" &&
                          subject.type === "client" &&
                          person.subject.id === subject.id);
                      return (
                        <button
                          key={
                            person.subject.type === "me"
                              ? "me"
                              : `client-${person.subject.id}`
                          }
                          type="button"
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                            active
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted/40"
                          )}
                          onClick={() => {
                            setSubject(person.subject);
                            setProfileId(null);
                            setStatus("active");
                            setTitle("");
                            setSelectedWorkoutProgramId(null);
                            setSelectedNutritionProgramId(null);
                            setSelectedWorkoutProgramLabel("");
                            setSelectedNutritionProgramLabel("");
                            setPersonOpen(false);
                          }}
                        >
                          <span>{person.display_name}</span>
                          {active ? <Check className="h-4 w-4" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplement-stack-status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as SupplementProfileStatus)}>
              <SelectTrigger
                id="supplement-stack-status"
                className="h-11 w-full rounded-xl border-border/60 bg-muted/20"
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplement-assignment-title">Title</Label>
            <Input
              id="supplement-assignment-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Morning stack"
              className="rounded-xl border-border/60 bg-muted/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Workout Program</Label>
              <Popover open={workoutOpen} onOpenChange={setWorkoutOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full justify-between rounded-xl border-border/60 bg-muted/20"
                  >
                    <span className="truncate text-left">
                      {selectedWorkoutProgram?.label || selectedWorkoutProgramLabel || "Select workout program"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border-border/70 bg-card/95 p-2"
                >
                  <ScrollArea className="max-h-[240px] pr-2">
                    <div className="space-y-1">
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/40",
                          !selectedWorkoutProgramId ? "bg-accent text-accent-foreground" : ""
                        )}
                        onClick={() => {
                          setSelectedWorkoutProgramId(null);
                          setSelectedWorkoutProgramLabel("");
                          setWorkoutOpen(false);
                        }}
                      >
                        <span>No workout program</span>
                        {!selectedWorkoutProgramId ? <Check className="h-4 w-4" /> : null}
                      </button>

                      {workoutPrograms.map((program) => {
                        const active = selectedWorkoutProgramId === program.id;
                        return (
                          <button
                            key={program.id}
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                              active
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-muted/40"
                            )}
                            onClick={() => {
                              setSelectedWorkoutProgramId(program.id);
                              setSelectedWorkoutProgramLabel(program.label);
                              setWorkoutOpen(false);
                            }}
                          >
                            <span className="truncate">{program.label}</span>
                            {active ? <Check className="h-4 w-4" /> : null}
                          </button>
                        );
                      })}

                      {programsQuery.isLoading ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">Loading workout programs...</p>
                      ) : workoutPrograms.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No workout programs found.</p>
                      ) : null}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Nutrition Program</Label>
              <Popover open={nutritionOpen} onOpenChange={setNutritionOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full justify-between rounded-xl border-border/60 bg-muted/20"
                  >
                    <span className="truncate text-left">
                      {selectedNutritionProgram?.label || selectedNutritionProgramLabel || "Select nutrition program"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border-border/70 bg-card/95 p-2"
                >
                  <ScrollArea className="max-h-[240px] pr-2">
                    <div className="space-y-1">
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/40",
                          !selectedNutritionProgramId ? "bg-accent text-accent-foreground" : ""
                        )}
                        onClick={() => {
                          setSelectedNutritionProgramId(null);
                          setSelectedNutritionProgramLabel("");
                          setNutritionOpen(false);
                        }}
                      >
                        <span>No nutrition program</span>
                        {!selectedNutritionProgramId ? <Check className="h-4 w-4" /> : null}
                      </button>

                      {nutritionPrograms.map((program) => {
                        const active = selectedNutritionProgramId === program.id;
                        return (
                          <button
                            key={program.id}
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                              active
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-muted/40"
                            )}
                            onClick={() => {
                              setSelectedNutritionProgramId(program.id);
                              setSelectedNutritionProgramLabel(program.label);
                              setNutritionOpen(false);
                            }}
                          >
                            <span className="truncate">{program.label}</span>
                            {active ? <Check className="h-4 w-4" /> : null}
                          </button>
                        );
                      })}

                      {programsQuery.isLoading ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">Loading nutrition programs...</p>
                      ) : nutritionPrograms.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No nutrition programs found.</p>
                      ) : null}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Supplements</Label>
            <Popover modal open={supplementOpen} onOpenChange={setSupplementOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full justify-between rounded-xl border-border/60 bg-muted/20"
                >
                  <span className="truncate text-left">
                    {selectedSupplementIds.length > 0
                      ? `${selectedSupplementIds.length} selected`
                      : "Select supplements"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="z-[90] w-[min(460px,calc(100vw-2rem))] overflow-hidden rounded-xl border-border/70 bg-card p-0 shadow-2xl"
              >
                <div className="space-y-2 p-3 pb-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={supplementSearch}
                      onChange={(event) => setSupplementSearch(event.target.value)}
                      placeholder="Search supplements"
                      className="h-10 rounded-xl border-border/60 bg-muted/20 pl-9"
                    />
                  </div>
                </div>

                <div className="max-h-[320px] overflow-y-auto p-3 pt-1">
                  <div className="space-y-1 pr-1">
                    {catalogQuery.isLoading ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Loading supplements...</p>
                    ) : (catalogQuery.data || []).length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No supplements found.</p>
                    ) : (
                      (catalogQuery.data || []).map((item) => {
                        const selected = selectedSupplementIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                              selected
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-muted/40"
                            )}
                            onClick={() => toggleSupplement(item.id)}
                          >
                            <span className="truncate">{normalizeSupplementDisplayName(item.name)}</span>
                            {selected ? <Check className="h-4 w-4" /> : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {selectedSupplements.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Selected supplements</p>
              <div className="flex flex-wrap gap-2">
                {selectedSupplements.map((supplement) => (
                  <span
                    key={supplement.id}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-sm"
                  >
                    {normalizeSupplementDisplayName(supplement.name)}
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-muted"
                      aria-label={`Remove ${supplement.name}`}
                      onClick={() => toggleSupplement(supplement.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 px-5 py-4">
          <Button type="button" variant="outline" className="rounded-xl border-border/60" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="accent-strong rounded-xl text-black"
            onClick={() => void submit()}
            disabled={assignMutation.isPending || selectedSupplementIds.length === 0}
          >
            {assignMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEditingStack ? "Save Stack" : "Assign Selected"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
