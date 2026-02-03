"use client";

import { useQuery } from "@tanstack/react-query";
import { getProgressData } from "@/app/actions/nutrition-progress";
import { ProgressCharts } from "@/components/nutrition/progress-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NutritionProgressPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["nutrition-progress"],
    queryFn: getProgressData
  });

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto min-h-screen space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/nutrition">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-primary" /> Progress
            </h1>
            <p className="text-muted-foreground">Visualize your nutrition journey over time.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-[120px] rounded-xl" />
                <Skeleton className="h-[120px] rounded-xl" />
                <Skeleton className="h-[120px] rounded-xl" />
            </div>
        </div>
      ) : (
        <ProgressCharts programs={data?.programs || []} goals={data?.goals || null} />
      )}
    </div>
  );
}