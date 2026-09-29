"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import { Apple, Download, Share2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  getProgressOverviewBundle,
  type ProgressRange,
  type ProgressTrainingType,
} from "@/app/actions/progress-overview";
import { ProgressFilterBar } from "@/components/progress/ProgressFilterBar";
import { BodyTab } from "@/components/progress/tabs/BodyTab";
import { CardioTab } from "@/components/progress/tabs/CardioTab";
import { CycleTab } from "@/components/progress/tabs/CycleTab";
import { HealthTab } from "@/components/progress/tabs/HealthTab";
import { NutritionTab } from "@/components/progress/tabs/NutritionTab";
import { OverviewTab } from "@/components/progress/tabs/OverviewTab";
import { StrengthTab } from "@/components/progress/tabs/StrengthTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { progressOverviewKeys } from "@/lib/query-keys-progress";

const PROGRESS_TABS = ["overview", "body", "strength", "cardio", "nutrition", "health", "cycle"] as const;
type ProgressTab = (typeof PROGRESS_TABS)[number];

export function ProgressMainPage() {
  const [range, setRange] = useState<ProgressRange>("30d");
  const [trainingType, setTrainingType] = useState<ProgressTrainingType>("mixed");
  const [compare, setCompare] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requestedTab = searchParams.get("tab");
  const activeTab: ProgressTab = PROGRESS_TABS.includes(requestedTab as ProgressTab)
    ? (requestedTab as ProgressTab)
    : "overview";

  const overviewQuery = useQuery({
    queryKey: progressOverviewKeys.bundle(range, trainingType, compare),
    queryFn: () => getProgressOverviewBundle(range, trainingType, compare),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const setTab = (nextTab: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const bundle = overviewQuery.data;
  const showSharedFilters = activeTab !== "cycle" && activeTab !== "nutrition";

  return (
    <div className="page-shell section-gap overflow-x-hidden pb-24 md:pb-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <section className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">My Progress</h1>
          <p className="text-sm text-muted-foreground">Track your training, body, nutrition, and wellness</p>
        </section>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-[10px]">
            <Link href="/progress/nutrition">
              <Apple className="mr-0 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nutrients</span>
            </Link>
          </Button>
          <Button type="button" variant="ghost" size="icon" disabled className="rounded-[10px]">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" disabled className="rounded-[10px]">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setTab} className="space-y-6">
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList className="h-auto w-full rounded-xl border border-white/10 bg-[#131b2f]/80 p-1 backdrop-blur-sm md:w-auto">
            {PROGRESS_TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="px-3 py-2 text-xs capitalize data-[state=active]:bg-[#e65778] data-[state=active]:text-white"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {showSharedFilters ? (
          <ProgressFilterBar
            range={range}
            onRangeChange={setRange}
            trainingType={trainingType}
            onTrainingTypeChange={setTrainingType}
            compare={compare}
            onCompareChange={setCompare}
          />
        ) : null}

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab bundle={bundle} isLoading={overviewQuery.isLoading} compare={compare} trainingType={trainingType} />
        </TabsContent>
        <TabsContent value="body" className="space-y-6">
          <BodyTab bundle={bundle} isLoading={overviewQuery.isLoading} compare={compare} />
        </TabsContent>
        <TabsContent value="strength" className="space-y-6">
          <StrengthTab bundle={bundle} isLoading={overviewQuery.isLoading} compare={compare} />
        </TabsContent>
        <TabsContent value="cardio" className="space-y-6">
          <CardioTab bundle={bundle} isLoading={overviewQuery.isLoading} compare={compare} />
        </TabsContent>
        <TabsContent value="nutrition" className="space-y-6">
          <NutritionTab />
        </TabsContent>
        <TabsContent value="health" className="space-y-6">
          <HealthTab bundle={bundle} isLoading={overviewQuery.isLoading} />
        </TabsContent>
        <TabsContent value="cycle" className="space-y-6">
          <CycleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
