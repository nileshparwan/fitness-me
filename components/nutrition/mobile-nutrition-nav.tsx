"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

const NUTRITION_TABS = [
  { label: "Dashboard", href: "/nutrition/dashboard" },
  { label: "Meal Planner", href: "/nutrition/meal-planner" },
  { label: "Meal Diary", href: "/nutrition/diary" },
  { label: "Meal Groups", href: "/nutrition/meal-groups" },
] as const;

function isTabActive(pathname: string, href: string) {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  if (href === "/nutrition/dashboard" && pathname === "/nutrition") return true;
  if (href === "/nutrition/meal-groups" && (pathname.startsWith("/nutrition/groups") || pathname.startsWith("/nutrition/meal-groups"))) {
    return true;
  }
  return false;
}

function titleFromPath(pathname: string) {
  if (pathname.startsWith("/nutrition/meal-planner")) return "Meal Planner";
  if (pathname.startsWith("/nutrition/diary")) return "Meal Diary";
  if (pathname.startsWith("/nutrition/meal-groups") || pathname.startsWith("/nutrition/groups")) return "Meal Groups";
  if (pathname === "/nutrition" || pathname.startsWith("/nutrition/dashboard")) return "Nutrition Dashboard";
  return "Nutrition";
}

function fallbackFromPath(pathname: string) {
  if (pathname === "/nutrition" || pathname.startsWith("/nutrition/dashboard")) return "/dashboard";
  return "/nutrition/dashboard";
}

export function MobileNutritionNav() {
  const pathname = usePathname();
  const router = useRouter();

  const onBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackFromPath(pathname));
  };

  return (
    <div className="md:hidden">
      <section className="mb-3 border-b border-border/60 px-3 pb-3 pt-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-border/60 bg-card/70"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="truncate text-base font-semibold tracking-tight">{titleFromPath(pathname)}</h1>
          <div className="h-9 w-9" aria-hidden="true" />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NUTRITION_TABS.map((tab) => {
            const active = isTabActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-chart-2/40 bg-chart-2/90 text-black"
                    : "border-border/60 bg-card/70 text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

