"use client";

import { useMemo, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getLatestBodyMeasurementAction } from "@/app/actions/body-measurements";
import { updateCoachingDefaults, type SettingsProfilePayload } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { coachingDefaultsSchema, type CoachingDefaultsPayload } from "@/lib/validations/settings";
import { useSettingsStore } from "@/stores/use-settings-store";
import { useUnitLabels } from "@/stores/use-settings-store";
import { calculateTDEE, type ActivityLevel } from "@/utils/tdee";

type CoachingSettingsFormProps = {
  profile: SettingsProfilePayload;
};

function MetricInput({
  value,
  onChange,
  label,
  suffix,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  label: string;
  suffix: string;
}) {
  return (
    <div className="space-y-2">
      <FormLabel>{label}</FormLabel>
      <div className="relative">
        <Input
          type="number"
          min={0}
          value={value ?? ""}
          onChange={(event) => {
            if (event.target.value === "") {
              onChange(null);
              return;
            }
            const numeric = Number(event.target.value);
            onChange(Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : null);
          }}
          className="pr-14"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}

export function CoachingSettingsForm({ profile }: CoachingSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const labels = useUnitLabels();
  const hydrate = useSettingsStore((state) => state.hydrate);
  const latestWeightQuery = useQuery({
    queryKey: ["settings", "latest-body-weight"],
    queryFn: () => getLatestBodyMeasurementAction({ type: "me" }),
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<CoachingDefaultsPayload>({
    resolver: zodResolver(coachingDefaultsSchema),
    defaultValues: {
      preferred_units: profile.preferred_units,
      default_calories: profile.default_calories,
      default_protein: profile.default_protein,
      default_carbs: profile.default_carbs,
      default_fat: profile.default_fat,
    },
  });

  const onSubmit = (values: CoachingDefaultsPayload) => {
    startTransition(async () => {
      const result = await withToastFeedback(updateCoachingDefaults(values), {
        loading: "Updating coaching defaults...",
        success: "Coaching defaults saved",
        error: "Unable to save coaching defaults",
      }).catch(() => null);
      if (!result) return;
      hydrate({
        preferred_units: result.preferred_units,
        default_macros: {
          calories: result.default_calories,
          protein: result.default_protein,
          carbs: result.default_carbs,
          fat: result.default_fat,
        },
        gender: profile.gender,
        fitness_level: profile.fitness_level,
        coach_specialty: profile.coach_specialty,
        is_pregnant: profile.is_pregnant,
        due_date: profile.due_date,
        is_postpartum: profile.is_postpartum,
        postpartum_since: profile.postpartum_since,
      });
    });
  };

  const age = useMemo(() => {
    if (!profile.date_of_birth) return null;
    const birth = new Date(profile.date_of_birth);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    let years = now.getUTCFullYear() - birth.getUTCFullYear();
    const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
    const dayDiff = now.getUTCDate() - birth.getUTCDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;
    return years > 0 ? years : null;
  }, [profile.date_of_birth]);

  const suggestion = useMemo(() => {
    const latestWeightKg = latestWeightQuery.data?.weight;
    if (!profile.gender || !profile.height || !age || latestWeightKg == null) return null;

    return calculateTDEE({
      weight_kg: latestWeightKg,
      height_cm: profile.height,
      age,
      gender: profile.gender,
      activity_level: activityLevel,
      goal_type: "maintenance",
    });
  }, [activityLevel, age, latestWeightQuery.data?.weight, profile.gender, profile.height]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <section className="native-surface surface-pad stack-gap">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Default Macro Targets</h3>
            <p className="text-sm text-muted-foreground">Used as defaults when creating new meal plans.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField
              control={form.control}
              name="default_calories"
              render={({ field }) => (
                <FormItem>
                  <MetricInput label="Calories" suffix={labels.energy} value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="default_protein"
              render={({ field }) => (
                <FormItem>
                  <MetricInput label="Protein" suffix={labels.macro} value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="default_carbs"
              render={({ field }) => (
                <FormItem>
                  <MetricInput label="Carbs" suffix={labels.macro} value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="default_fat"
              render={({ field }) => (
                <FormItem>
                  <MetricInput label="Fat" suffix={labels.macro} value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="native-surface surface-pad stack-gap">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Unit System</h3>
            <p className="text-sm text-muted-foreground">Stored values stay metric; labels switch with your unit preference.</p>
          </div>
          <FormField
            control={form.control}
            name="preferred_units"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit System</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit system" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="metric">Metric</SelectItem>
                    <SelectItem value="imperial">Imperial</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="native-surface surface-pad stack-gap">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Suggested Starting Targets</h3>
            <p className="text-sm text-muted-foreground">Personalized from your profile and latest weight measurement.</p>
          </div>

          {suggestion ? (
            <div className="space-y-4 rounded-2xl border border-border/60 bg-background/40 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormItem>
                  <FormLabel>Activity Level</FormLabel>
                  <Select value={activityLevel} onValueChange={(value) => setActivityLevel(value as ActivityLevel)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary</SelectItem>
                      <SelectItem value="light">Lightly active</SelectItem>
                      <SelectItem value="moderate">Moderately active</SelectItem>
                      <SelectItem value="very_active">Very active</SelectItem>
                      <SelectItem value="extreme">Extremely active</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
                <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Suggested calories</p>
                  <p className="mt-1 text-2xl font-semibold">{suggestion.calories}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Protein {suggestion.protein_g}g · Carbs {suggestion.carbs_g}g · Fat {suggestion.fat_g}g
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    form.setValue("default_calories", suggestion.calories, { shouldDirty: true });
                    form.setValue("default_protein", suggestion.protein_g, { shouldDirty: true });
                    form.setValue("default_carbs", suggestion.carbs_g, { shouldDirty: true });
                    form.setValue("default_fat", suggestion.fat_g, { shouldDirty: true });
                  }}
                >
                  Use these values
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/30 p-4 text-sm text-muted-foreground">
              Complete your profile to get personalised suggestions.
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Defaults"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
