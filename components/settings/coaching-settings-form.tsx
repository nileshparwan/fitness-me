"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
  const labels = useUnitLabels();
  const hydrate = useSettingsStore((state) => state.hydrate);

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
      });
    });
  };

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

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Defaults"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
