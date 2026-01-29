import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, ChefHat, Info, ArrowLeft, Flame } from "lucide-react";
import Link from "next/link";

// Import your Analytics component
import { NutritionAnalytics } from "@/components/nutrition/nutrition-analytics";

export default async function PublicNutritionPage({ params }: { params: Promise<{ id: string }> }) {
    // Await params in Next.js 15
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch Program
    const { data: program } = await supabase
        .from("nutrition_programs")
        .select("*")
        .eq("id", id)
        .eq("is_public", true) // Enforce public check
        .single();

    if (!program) return notFound();

    // 2. Fetch Meals (Ordered by position now, not date)
    const { data: meals } = await supabase
        .from("nutrition_meals")
        .select("*")
        .eq("program_id", id)
        .order("position", { ascending: true });

    const safeMeals = meals || [];

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* --- HEADER --- */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border p-6 shadow-sm">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                    Shared Plan
                                </Badge>
                                {program.status === 'active' && (
                                    <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                                )}
                            </div>

                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{program.name}</h1>

                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                <div className="flex items-center gap-1.5">
                                    <CalendarDays className="h-4 w-4" />
                                    <span>{format(parseISO(program.start_date), "MMM d, yyyy")} - {format(parseISO(program.end_date), "MMM d")}</span>
                                </div>
                                <span>•</span>
                                <span>{safeMeals.length} Items</span>
                            </div>

                            {program.description && (
                                <p className="mt-4 text-gray-600 leading-relaxed border-l-4 border-gray-100 pl-4 italic">
                                    {program.description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- ANALYTICS (Fixed at Top) --- */}
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 pl-1">Overview</h2>
                    {/* Reusing the compact analytics bar we built */}
                    <NutritionAnalytics meals={safeMeals} />
                </div>

                {program.notes && (
                    <p className="mt-4 text-gray-600 leading-relaxed border-l-4 border-gray-100 pl-4 italic">
                        {program.notes}
                    </p>
                )}

                {/* --- MEAL LIST (ACCORDION) --- */}
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 pl-1">Menu Schedule</h2>

                    <Card className="overflow-hidden border-none shadow-sm">
                        <Accordion type="single" collapsible className="w-full bg-white rounded-xl border">
                            {safeMeals.map((meal, index) => (
                                <AccordionItem key={meal.id} value={meal.id} className="border-b last:border-0 px-2">
                                    <AccordionTrigger className="hover:no-underline py-4 px-2 hover:bg-gray-50/50 rounded-lg transition-colors">
                                        <div className="flex items-center justify-between w-full pr-4 text-left">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {/* Number / Index */}
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                                                    {index + 1}
                                                </span>

                                                {/* Meal Info */}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase tracking-wide text-gray-500">
                                                            {meal.meal_type.replace('_', ' ')}
                                                        </Badge>
                                                        <span className="font-semibold text-gray-900 truncate">{meal.food_name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quick Calorie View in Trigger */}
                                            <div className="hidden sm:flex items-center gap-1 text-sm font-medium text-gray-600 shrink-0">
                                                {meal.calories} <span className="text-xs text-gray-400 font-normal">kcal</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>

                                    <AccordionContent className="px-4 pb-6 pt-2">
                                        <div className="ml-9 space-y-6">

                                            {/* Macros Grid */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm bg-gray-50 px-3 py-2 rounded-md border border-gray-100 w-fit">
                                                {/* Calories */}
                                                <div className="font-bold text-gray-900">
                                                    {meal.calories} <span className="font-normal text-gray-500">kcal</span>
                                                </div>

                                                {/* Divider (hidden on very small screens) */}
                                                <div className="hidden xs:block h-3 w-px bg-gray-300" />

                                                {/* Macros */}
                                                <div className="flex items-center gap-3 font-medium">
                                                    <span className="text-red-600/90">{meal.protein_g}p</span>
                                                    <span className="text-green-600/90">{meal.carbs_g}c</span>
                                                    <span className="text-yellow-600/90">{meal.fats_g}f</span>
                                                </div>
                                            </div>

                                            {/* Instructions */}
                                            {meal.instructions && (
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                                                        <ChefHat className="h-4 w-4 text-primary" /> Preparation
                                                    </h4>
                                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                                        {meal.instructions}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Alternatives */}
                                            {meal.alternatives && (
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                                                        <Info className="h-4 w-4 text-blue-500" /> Alternatives
                                                    </h4>
                                                    <div className="text-sm bg-blue-50 text-blue-700 p-3 rounded-md border border-blue-100">
                                                        {meal.alternatives}
                                                    </div>
                                                </div>
                                            )}

                                            {(!meal.instructions && !meal.alternatives) && (
                                                <p className="text-sm text-gray-400 italic">No additional details provided.</p>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}

                            {safeMeals.length === 0 && (
                                <div className="p-12 text-center text-gray-500">
                                    No meals have been added to this plan yet.
                                </div>
                            )}
                        </Accordion>
                    </Card>
                </div>

            </div>
        </div>
    );
}