import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { getPublicMealGroupAction } from "@/app/actions/meal-groups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const MEAL_DAY_LABELS = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
} as const;

const MEAL_TYPE_LABELS = {
  water: "Water",
  breakfast: "Breakfast",
  snack: "Snack",
  lunch: "Lunch",
  pre_workout_meal: "Pre-workout Meal",
  post_workout_meal: "Post-workout Meal",
  dinner: "Dinner",
  protein_drink: "Protein Drink",
} as const;

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "No duration";
  if (start && !end) return `From ${start}`;
  if (!start && end) return `Until ${end}`;
  return `${start} → ${end}`;
}

export default async function PublicNutritionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPublicMealGroupAction(id);
  if (!data) return notFound();

  const totals = data.plans.reduce(
    (acc, plan) => {
      acc.calories += plan.totals.calories;
      acc.protein_g += plan.totals.protein_g;
      acc.carbs_g += plan.totals.carbs_g;
      acc.fat_g += plan.totals.fat_g;
      acc.items += plan.items.length;
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, items: 0 }
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Shared Meal Template
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{data.group.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatDateRange(data.group.start_date, data.group.end_date)}
              </span>
              <span>{data.plans.length} day plans</span>
              <span>{totals.items} items</span>
            </div>
          </div>
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Open App
            </Link>
          </Button>
        </div>

        {data.group.description ? (
          <Card className="rounded-2xl border border-border/60 p-5">
            <p className="text-sm leading-7 text-muted-foreground">{data.group.description}</p>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Calories</p>
            <p className="mt-2 text-2xl font-semibold">{Math.round(totals.calories)}</p>
          </Card>
          <Card className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Protein</p>
            <p className="mt-2 text-2xl font-semibold">{Math.round(totals.protein_g)}g</p>
          </Card>
          <Card className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Carbs</p>
            <p className="mt-2 text-2xl font-semibold">{Math.round(totals.carbs_g)}g</p>
          </Card>
          <Card className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Fat</p>
            <p className="mt-2 text-2xl font-semibold">{Math.round(totals.fat_g)}g</p>
          </Card>
        </div>

        <div className="space-y-4">
          {data.plans.map((plan) => (
            <Card key={plan.id} className="overflow-hidden rounded-2xl border border-border/60">
              <div className="border-b border-border/60 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{MEAL_DAY_LABELS[plan.day_of_week]}</h2>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em]">
                    {plan.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{Math.round(plan.totals.calories)} kcal</span>
                </div>
                {plan.notes ? <p className="mt-2 text-sm text-muted-foreground">{plan.notes}</p> : null}
              </div>
              <div className="divide-y divide-border/50">
                {plan.items.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-muted-foreground">No items configured for this day.</div>
                ) : (
                  plan.items.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                            {MEAL_TYPE_LABELS[item.type]}
                          </Badge>
                          <p className="text-base font-medium">{item.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity !== null && item.quantity !== undefined ? `${item.quantity}` : "No qty"}
                          {item.unit ? ` ${item.unit}` : ""}
                          {item.planned_time ? ` • ${item.planned_time}` : ""}
                        </p>
                        {item.notes ? <p className="text-sm text-muted-foreground">{item.notes}</p> : null}
                      </div>
                      <div className="text-sm text-muted-foreground md:text-right">
                        <p>{Math.round(item.calories || 0)} kcal</p>
                        <p>
                          P {Math.round(item.protein_g || 0)}g • C {Math.round(item.carbs_g || 0)}g • F {Math.round(item.fat_g || 0)}g
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>

        {data.group.notes ? (
          <Card className="rounded-2xl border border-border/60 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Coach Notes</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{data.group.notes}</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
