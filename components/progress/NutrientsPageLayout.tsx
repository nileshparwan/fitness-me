"use client";

import Link from "next/link";
import { ArrowLeft, Download, Share2 } from "lucide-react";

import { NutrientsContent } from "@/components/progress/NutrientsContent";
import { Button } from "@/components/ui/button";

type NutrientsPageLayoutProps = {
  backPath: string;
  pageTitle?: string;
};

export function NutrientsPageLayout({
  backPath,
  pageTitle = "Nutrition Progress",
}: NutrientsPageLayoutProps) {
  return (
    <div className="page-shell section-gap pb-24 md:pb-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild type="button" variant="ghost" size="icon" className="mt-1 rounded-[10px] border border-white/10 bg-[#131b2f]/80">
            <Link href={backPath}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to progress</span>
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground">Calories, macros, and dietary insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" className="rounded-[10px]" disabled>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="rounded-[10px]" disabled>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <NutrientsContent embedded={true} />
    </div>
  );
}

