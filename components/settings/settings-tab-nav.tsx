"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Monitor, Shield, User } from "lucide-react";

import { cn } from "@/utils";

const SETTINGS_TABS = [
  { title: "Profile", href: "/settings/profile", icon: User },
  { title: "Coaching", href: "/settings/coaching", icon: Dumbbell },
  { title: "Display", href: "/settings/display", icon: Monitor },
  { title: "Security", href: "/settings/security", icon: Shield },
] as const;

export function SettingsTabNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full overflow-x-auto pb-1">
      <div className="inline-flex min-w-full gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1">
        {SETTINGS_TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors",
                "border border-transparent whitespace-nowrap",
                isActive
                  ? "relative bg-background text-primary border-border/60 shadow-sm after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/70"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
