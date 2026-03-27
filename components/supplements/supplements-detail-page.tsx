"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  removeSupplementAssignmentAction,
  updateSupplementAssignmentAction,
  type SupplementAssignmentRow,
} from "@/app/actions/supplements";
import { AssignSupplementsSheet } from "@/components/supplements/assign-supplements-sheet";
import { EditAssignmentSheet } from "@/components/supplements/edit-assignment-sheet";
import { SupplementDetailTable } from "@/components/supplements/supplement-detail-table";
import { Button } from "@/components/ui/button";
import { useSupplementAssignments, useSupplementPeople, useSupplementSubjects, type SupplementSubject } from "@/hooks/use-supplements";
import { normalizeSupplementDisplayName } from "@/lib/nutrition/supplements";
import { supplementKeys } from "@/lib/query-keys-supplements";
import { withToastFeedback } from "@/lib/ui/toast-feedback";

type Props = {
  subject: SupplementSubject;
  profileId?: string;
};

export function SupplementsDetailPage({ subject, profileId }: Props) {
  const queryClient = useQueryClient();

  const assignmentsQuery = useSupplementAssignments(subject, profileId, true);
  const subjectsQuery = useSupplementSubjects();
  const peopleQuery = useSupplementPeople();

  const [assignSheetOpen, setAssignSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SupplementAssignmentRow | null>(null);

  const detailRows = assignmentsQuery.data || [];
  const assignedCount = detailRows.length;

  const subjectSummary = useMemo(() => {
    if (profileId) {
      return (subjectsQuery.data || []).find((row) => row.profile_id === profileId) || null;
    }
    if (subject.type === "me") {
      return (subjectsQuery.data || []).find((row) => row.subject_type === "user") || null;
    }
    return (subjectsQuery.data || []).find(
      (row) => row.subject_type === "client" && row.subject_id === subject.id
    ) || null;
  }, [profileId, subject, subjectsQuery.data]);

  const subjectPerson = useMemo(() => {
    if (subject.type === "me") {
      return (peopleQuery.data || []).find((row) => row.subject.type === "me") || null;
    }
    return (peopleQuery.data || []).find(
      (row) => row.subject.type === "client" && row.subject.id === subject.id
    ) || null;
  }, [peopleQuery.data, subject]);

  const displayName =
    subjectPerson?.display_name ||
    (subject.type === "me" ? "You" : `Client ${subject.id.slice(0, 8)}`);

  const invalidateSubject = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: supplementKeys.subjects() }),
      queryClient.invalidateQueries({ queryKey: supplementKeys.assignmentScope(subject) }),
    ]);
  };

  const updateAssignmentMutation = useMutation({
    mutationFn: updateSupplementAssignmentAction,
    onSuccess: async () => {
      await invalidateSubject();
    },
  });

  const updateAssignmentWithFeedback = async (input: Parameters<typeof updateSupplementAssignmentAction>[0]) => {
    await withToastFeedback(updateAssignmentMutation.mutateAsync(input), {
      loading: "Updating assignment...",
      success: "Assignment updated",
      error: "Unable to update assignment",
    });
  };

  const removeAssignmentMutation = useMutation({
    mutationFn: removeSupplementAssignmentAction,
    onSuccess: async () => {
      await invalidateSubject();
    },
  });

  const removeAssignmentWithFeedback = async (assignmentId: string) => {
    await toast.promise(removeAssignmentMutation.mutateAsync(assignmentId), {
      loading: "Removing supplement from stack...",
      success: "Supplement removed from stack",
      error: (error) => (error instanceof Error ? error.message : "Unable to remove assignment"),
    });
  };

  return (
    <div className="section-gap">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild type="button" variant="ghost" size="sm" className="mb-1 h-8 rounded-lg px-2 text-muted-foreground">
            <Link href="/supplements/assigned">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{displayName} - Supplements</h1>
          <p className="text-sm text-muted-foreground">
            Informational supplement assignments tied to workout and nutrition programs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="accent-strong rounded-xl text-black"
            onClick={() => setAssignSheetOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Assign Supplements
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 rounded-[10px] border border-border/60 bg-card/70 p-4 md:grid-cols-2">
        <Metric label="Supplements" value={String(assignedCount)} />
        <Metric label="Last Updated" value={formatDateLabel(subjectSummary?.last_updated_at || null)} />
      </section>

      <SupplementDetailTable
        rows={detailRows}
        isLoading={assignmentsQuery.isLoading}
        onEdit={(assignment) => setEditing(assignment)}
        onRemove={(assignment) => {
          const confirmed = window.confirm(
            `Remove ${normalizeSupplementDisplayName(assignment.supplement_name)} from stack?`
          );
          if (!confirmed) return;
          void removeAssignmentWithFeedback(assignment.id);
        }}
      />

      <AssignSupplementsSheet
        open={assignSheetOpen}
        onOpenChange={setAssignSheetOpen}
        initialSubject={subject}
        initialProfileId={subjectSummary?.profile_id || profileId || null}
        initialStatus={subjectSummary?.status || null}
        initialTitle={subjectSummary?.title || null}
        initialWorkoutProgram={subjectSummary?.workout_program || null}
        initialNutritionProgram={subjectSummary?.nutrition_program || null}
      />

      <EditAssignmentSheet
        open={Boolean(editing)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditing(null);
        }}
        assignment={editing}
        pending={updateAssignmentMutation.isPending || removeAssignmentMutation.isPending}
        onSave={(input) =>
          updateAssignmentWithFeedback({
            id: input.id,
            default_servings: input.default_servings,
            unit: input.unit,
          })
        }
        onRemove={removeAssignmentWithFeedback}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-base font-semibold">{value}</p>
    </div>
  );
}

function formatDateLabel(value: string | null) {
  if (!value) return "-";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}
