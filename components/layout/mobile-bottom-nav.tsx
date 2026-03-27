"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Activity,
  BookOpen,
  ChevronRight,
  Dumbbell,
  Folder,
  Goal,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  Ruler,
  TrendingUp,
  UserRound,
  Users,
  Utensils,
} from "lucide-react";

import { useRole } from "@/hooks/use-role";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { useSettingsStore } from "@/stores/use-settings-store";
import {
  getMobileTabsForRole,
  getSidebarSectionsForRole,
  getWorkspaceSubtitle,
  type MobileNavTabConfig,
  type RoleNavContext,
  type SidebarItemConfig,
} from "@/lib/auth/route-access";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/utils";

const iconMap: Record<MobileNavTabConfig["icon"] | SidebarItemConfig["icon"], ComponentType<{ className?: string }>> = {
  home: LayoutDashboard,
  dumbbell: Dumbbell,
  folder: Folder,
  book: BookOpen,
  nutrition: Utensils,
  trend: TrendingUp,
  users: Users,
  target: Goal,
  menu: Menu,
  support: BookOpen,
  user: UserRound,
  shield: LayoutDashboard,
  settings: Goal,
  message: BookOpen,
  building: Folder,
  bell: Goal,
  pill: Pill,
  ruler: Ruler,
  activity: Activity,
};

function isRouteActive(pathname: string, href: string) {
  if (href === "/supplements") {
    return pathname === "/supplements";
  }
  if (href === "/nutrition/meal-groups" && (pathname.startsWith("/nutrition/groups") || pathname.startsWith("/nutrition/meal-groups"))) {
    return true;
  }
  if (href === "/nutrition/dashboard" && pathname === "/nutrition") {
    return true;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getDisplayName(user: ReturnType<typeof useUser>["data"]) {
  const profile = user?.profile;
  const metadata = (user?.metadata || {}) as { full_name?: string; username?: string };
  return (
    profile?.full_name ||
    metadata.full_name ||
    metadata.username ||
    user?.email?.split("@")[0] ||
    "User"
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const roleQuery = useRole();
  const userQuery = useUser();
  const gender = useSettingsStore((state) => state.gender);

  const roleContext = roleQuery.data
    ? ({ role: roleQuery.data.role, gender } satisfies RoleNavContext)
    : null;

  const tabs = useMemo(() => {
    if (!roleContext) return [] as MobileNavTabConfig[];
    return getMobileTabsForRole(pathname, roleContext);
  }, [pathname, roleContext]);

  const menuSections = useMemo(() => {
    if (!roleContext) return [];
    return getSidebarSectionsForRole(roleContext);
  }, [roleContext]);

  if (!roleContext || roleContext.role === "sysadmin") return null;

  const displayName = getDisplayName(userQuery.data);
  const email = userQuery.data?.email || "user@example.com";
  const avatarUrl = userQuery.data?.profile?.avatar_url || userQuery.data?.metadata?.avatar_url || undefined;
  const initials = getInitials(displayName);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur-xl md:hidden">
        <div
          className="grid h-[4.25rem] px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)]"
          style={{ gridTemplateColumns: `repeat(${Math.max(tabs.length, 1)}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => {
            const Icon = iconMap[tab.icon];
            const active = tab.href ? isRouteActive(pathname, tab.href) : false;

            if (tab.action === "menu") {
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors",
                    menuOpen ? "text-chart-2" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={tab.key}
                href={tab.href || "/dashboard"}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors",
                  active ? "text-chart-2" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[88svh] overflow-hidden rounded-t-3xl border-x border-t border-border/70 bg-card/98 p-0 shadow-2xl backdrop-blur-xl"
        >
          <SheetHeader className="border-b border-border/60 px-4 py-3">
            <div className="mb-1 text-left">
              <p className="text-sm font-semibold">FitTrack.ai</p>
              <p className="text-xs text-muted-foreground">{getWorkspaceSubtitle(roleContext)}</p>
            </div>
            <SheetTitle className="text-left">Menu</SheetTitle>
            <SheetDescription className="sr-only">Application navigation menu</SheetDescription>
          </SheetHeader>

          <div className="max-h-[calc(88svh-10.5rem)] overflow-y-auto px-4 py-3">
            <div className="space-y-5">
              {menuSections.map((section) => (
                <section key={section.label} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">{section.label}</h3>
                  <div className="space-y-1.5">
                    {section.items.map((item) => {
                      const Icon = iconMap[item.icon];
                      const active = isRouteActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                            active
                              ? "border-chart-2/45 bg-chart-2/12 text-foreground"
                              : "border-border/60 bg-background/40 text-foreground/90 hover:bg-accent/40"
                          )}
                        >
                          <Icon className={cn("h-4 w-4", active ? "text-chart-2" : "text-muted-foreground")} />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="border-t border-border/60 bg-background/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border/70 bg-card/80 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-10 w-10 rounded-xl">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="rounded-xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{getWorkspaceSubtitle(roleContext)}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
