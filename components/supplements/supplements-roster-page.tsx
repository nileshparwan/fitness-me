"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { removeSupplementStackAction } from "@/app/actions/supplements";
import type { SupplementSubjectRow } from "@/app/actions/supplements";
import { AssignSupplementsSheet } from "@/components/supplements/assign-supplements-sheet";
import { SupplementRosterTable } from "@/components/supplements/supplement-roster-table";
import { Button } from "@/components/ui/button";
import { useSupplementSubjects, type SupplementSubject } from "@/hooks/use-supplements";
import { supplementKeys } from "@/lib/query-keys-supplements";

type SheetState = {
  open: boolean;
  subject: SupplementSubject | null;
  profileId: string | null;
  status: SupplementSubjectRow["status"] | null;
  title: string | null;
  workoutProgram: string | null;
  nutritionProgram: string | null;
};

type RemoveStackInput = {
  profile_id: string;
  row: SupplementSubjectRow;
};

function rowToSubject(row: SupplementSubjectRow): SupplementSubject {
  return row.subject_type === "user" ? { type: "me" } : { type: "client", id: row.subject_id };
}

function subjectRoute(row: SupplementSubjectRow) {
  const basePath = row.subject_type === "user" ? "/supplements/assigned/me" : `/supplements/assigned/${row.subject_id}`;
  return `${basePath}?stack=${encodeURIComponent(row.profile_id)}`;
}

export function SupplementsRosterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const subjectsQuery = useSupplementSubjects();

  const [sheetState, setSheetState] = useState<SheetState>({
    open: false,
    subject: null,
    profileId: null,
    status: null,
    title: null,
    workoutProgram: null,
    nutritionProgram: null,
  });

  const removeStackMutation = useMutation({
    mutationFn: async (input: RemoveStackInput) => {
      await removeSupplementStackAction({ profile_id: input.profile_id });
      return input;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supplementKeys.subjects() }),
        queryClient.invalidateQueries({
          queryKey: supplementKeys.assignmentScope(rowToSubject(result.row)),
        }),
      ]);
    },
  });

  return (
    <div className="section-gap">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Assigned Supplements</h1>
          <p className="text-sm text-muted-foreground">
            Multiple supplement stacks per person, linked to workout and nutrition programs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild type="button" variant="outline" className="rounded-xl border-border/60">
            <Link href="/supplements">Catalog</Link>
          </Button>

          <Button
            type="button"
            className="accent-strong rounded-xl text-black"
            onClick={() =>
              setSheetState({
                open: true,
                subject: null,
                profileId: null,
                status: null,
                title: null,
                workoutProgram: null,
                nutritionProgram: null,
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Assign Supplements
          </Button>
        </div>
      </section>

      <SupplementRosterTable
        rows={subjectsQuery.data || []}
        isLoading={subjectsQuery.isLoading}
        onRowClick={(row) => router.push(subjectRoute(row))}
        onEditStack={(row) =>
          setSheetState({
            open: true,
            subject: rowToSubject(row),
            profileId: row.profile_id,
            status: row.status,
            title: row.title,
            workoutProgram: row.workout_program,
            nutritionProgram: row.nutrition_program,
          })
        }
        onDeleteStack={(row) => {
          const confirmed = window.confirm(
            `Delete "${row.title || "supplement stack"}" for ${row.display_name}? This will remove all supplements in this stack.`
          );
          if (!confirmed) return;
          void toast.promise(removeStackMutation.mutateAsync({ profile_id: row.profile_id, row }), {
            loading: "Deleting assigned supplement stack...",
            success: "Assigned supplement stack deleted",
            error: (error) =>
              error instanceof Error ? error.message : "Unable to delete assigned supplement stack",
          });
        }}
      />

      <section className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Assignments are informational and linked to each person&apos;s workout and nutrition programs.
      </section>

      <AssignSupplementsSheet
        open={sheetState.open}
        onOpenChange={(open) => setSheetState((current) => ({ ...current, open }))}
        initialSubject={sheetState.subject}
        initialProfileId={sheetState.profileId}
        initialStatus={sheetState.status}
        initialTitle={sheetState.title}
        initialWorkoutProgram={sheetState.workoutProgram}
        initialNutritionProgram={sheetState.nutritionProgram}
      />
    </div>
  );
}
