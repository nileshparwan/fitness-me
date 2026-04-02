"use client";

import { useEffect, useMemo } from "react";

import { useAssignableSubjects } from "@/hooks/use-meal-groups";
import {
  useNutritionAutoMealGroupSelection,
  useNutritionDefaultMealGroupPreference,
  useNutritionMealGroupOptions,
} from "@/hooks/use-nutrition-data";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isMealGroupSelected } from "@/lib/nutrition/meal-ui";
import { cn } from "@/utils";
import {
  useNutritionActiveSubject,
  useNutritionSelectedMealGroupId,
  useSetNutritionActiveSubject,
  useSetNutritionSelectedMealGroupId,
  type NutritionSubjectType,
} from "@/stores/use-nutrition-ui-store";

type SubjectOption = {
  key: string;
  label: string;
  type: NutritionSubjectType;
  id: string | null;
};

type GroupOption = {
  id: string;
  label: string;
};

type NutritionScopeControlsProps = {
  compact?: boolean;
  showHelperText?: boolean;
  fullWidthOnMobile?: boolean;
  className?: string;
};

function formatClientLabel(input: { display_name: string | null; first_name: string; last_name: string | null }) {
  if (input.display_name) return input.display_name;
  return `${input.first_name} ${input.last_name || ""}`.trim();
}

export function NutritionScopeControls({
  compact = false,
  showHelperText = false,
  fullWidthOnMobile = false,
  className,
}: NutritionScopeControlsProps) {
  const subjectsQuery = useAssignableSubjects();
  const groupsQuery = useNutritionMealGroupOptions();
  const { activeSubjectType, activeSubjectId } = useNutritionActiveSubject();
  const selectedMealGroupId = useNutritionSelectedMealGroupId();
  const setActiveSubject = useSetNutritionActiveSubject();
  const setSelectedMealGroupId = useSetNutritionSelectedMealGroupId();
  const { defaultMealGroupId, clearDefaultMealGroupId } = useNutritionDefaultMealGroupPreference();

  const subjectOptions = useMemo(() => {
    const options: SubjectOption[] = [{ key: "self", label: "Me", type: "self", id: null }];
    const seen = new Set<string>(["self"]);

    for (const client of subjectsQuery.data?.clients || []) {
      const clientKey = `client:${client.id}`;
      if (!seen.has(clientKey)) {
        options.push({
          key: clientKey,
          label: `Client • ${formatClientLabel(client)}`,
          type: "client",
          id: client.id,
        });
        seen.add(clientKey);
      }

      if (client.linked_user_id) {
        const userKey = `user:${client.linked_user_id}`;
        if (!seen.has(userKey)) {
          options.push({
            key: userKey,
            label: `Linked User • ${formatClientLabel(client)}`,
            type: "user",
            id: client.linked_user_id,
          });
          seen.add(userKey);
        }
      }
    }

    return options;
  }, [subjectsQuery.data?.clients]);

  const selectedSubjectKey = useMemo(() => {
    if (activeSubjectType === "client" && activeSubjectId) return `client:${activeSubjectId}`;
    if (activeSubjectType === "user" && activeSubjectId) return `user:${activeSubjectId}`;
    return "self";
  }, [activeSubjectId, activeSubjectType]);

  const assignmentSubject = useMemo(() => {
    if (activeSubjectType === "client" && activeSubjectId) {
      return { subject_client_id: activeSubjectId };
    }
    if (activeSubjectType === "user" && activeSubjectId) {
      return { subject_user_id: activeSubjectId };
    }
    return undefined;
  }, [activeSubjectId, activeSubjectType]);

  const { assignmentsQuery, activeAssignmentGroupId } = useNutritionAutoMealGroupSelection({
    subject: assignmentSubject,
  });

  const assignedGroupOptions = useMemo(() => {
    const map = new Map<string, GroupOption>();
    for (const assignment of assignmentsQuery.data || []) {
      const groupId = assignment.nutrition_plan_id;
      if (!groupId) continue;
      const label = assignment.template_group?.name || assignment.meal_group?.name || "Assigned meal group";
      map.set(groupId, { id: groupId, label });
    }
    return Array.from(map.values());
  }, [assignmentsQuery.data]);

  const groupOptions = useMemo(() => {
    if (assignedGroupOptions.length > 0) return assignedGroupOptions;
    return (groupsQuery.data?.rows || []).map((group) => ({ id: group.id, label: group.name }));
  }, [assignedGroupOptions, groupsQuery.data?.rows]);

  useEffect(() => {
    if (subjectsQuery.isLoading) return;
    if (subjectOptions.some((option) => option.key === selectedSubjectKey)) return;
    setActiveSubject("self", null);
  }, [selectedSubjectKey, setActiveSubject, subjectOptions, subjectsQuery.isLoading]);

  useEffect(() => {
    if (!isMealGroupSelected(selectedMealGroupId)) return;
    if (groupOptions.some((option) => option.id === selectedMealGroupId)) return;
    if (assignedGroupOptions.length === 0 && groupsQuery.data?.has_more) return;
    setSelectedMealGroupId("");
  }, [assignedGroupOptions.length, groupOptions, groupsQuery.data?.has_more, selectedMealGroupId, setSelectedMealGroupId]);

  useEffect(() => {
    if (!defaultMealGroupId) return;
    if (groupOptions.some((option) => option.id === defaultMealGroupId)) return;
    if (assignedGroupOptions.length === 0 && groupsQuery.data?.has_more) return;
    void clearDefaultMealGroupId().catch(() => null);
  }, [assignedGroupOptions.length, clearDefaultMealGroupId, defaultMealGroupId, groupOptions, groupsQuery.data?.has_more]);

  const onSubjectChange = (nextKey: string) => {
    const next = subjectOptions.find((option) => option.key === nextKey);
    if (!next) return;
    setActiveSubject(next.type, next.id);
    setSelectedMealGroupId("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("flex flex-wrap items-center gap-2", fullWidthOnMobile && "items-stretch")}>
        <div className={cn(fullWidthOnMobile ? "min-w-0 w-full sm:w-auto sm:min-w-[220px]" : "min-w-[220px]")}>
          {!compact ? <Label className="mb-1 block text-xs text-muted-foreground">User</Label> : null}
          <Select value={selectedSubjectKey} onValueChange={onSubjectChange}>
            <SelectTrigger className="w-full rounded-xl border-border/60 bg-muted/20">
              <SelectValue placeholder={subjectsQuery.isLoading ? "Loading users..." : "Select user"} />
            </SelectTrigger>
            <SelectContent>
              {subjectOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn(fullWidthOnMobile ? "min-w-0 w-full sm:w-auto sm:min-w-[220px]" : "min-w-[220px]")}>
          {!compact ? <Label className="mb-1 block text-xs text-muted-foreground">Meal Group</Label> : null}
          <Select value={selectedMealGroupId} onValueChange={setSelectedMealGroupId}>
            <SelectTrigger className="w-full rounded-xl border-border/60 bg-muted/20">
              <SelectValue
                placeholder={groupsQuery.isLoading || assignmentsQuery.isLoading ? "Loading meal groups..." : "Select meal group"}
              />
            </SelectTrigger>
            <SelectContent>
              {groupOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showHelperText ? (
        <p className="text-xs text-muted-foreground">
          {selectedMealGroupId
            ? "Selection is shared across all nutrition pages."
            : assignmentsQuery.isLoading
              ? "Loading assigned meal groups..."
              : activeAssignmentGroupId
                ? "Assigned meal group selected by default."
                : "No active assignment found for this user. Select a meal group manually."}
        </p>
      ) : null}
    </div>
  );
}
