import Link from "next/link";
import { redirect } from "next/navigation";

import { ClientPortalLogoutButton } from "@/components/client-portal/logout-button";
import { Badge } from "@/components/ui/badge";
import { getClientPortalContext } from "@/lib/client-portal/session";

const MODULE_NAV = [
  { key: "workouts", href: "/client/workouts", label: "Workouts" },
  { key: "program", href: "/client/training", label: "Program" },
  { key: "nutrition_plan", href: "/client/meal-plan", label: "Nutrition Plan" },
  { key: "diary", href: "/client/nutrition", label: "Diary" },
  { key: "steps_tracking", href: "/client/steps", label: "Steps" },
  { key: "goals", href: "/client/goals", label: "Goals" },
  { key: "check_ins", href: "/client/check-ins", label: "Check-ins" },
  { key: "coach_notes", href: "/client/notes", label: "Coach Notes" },
  { key: "tasks", href: "/client/tasks", label: "Tasks" },
] as const;

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getClientPortalContext();
  if (!context) {
    redirect("/client/login");
  }

  const fullName =
    context.client.display_name ||
    `${context.client.first_name} ${context.client.last_name || ""}`.trim() ||
    "Client";

  const links = MODULE_NAV.filter(
    (item) => context.features[item.key] !== "disabled"
  );

  return (
    <main className="min-h-screen bg-background px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <header className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Client Portal</p>
              <h1 className="text-lg font-semibold">{fullName}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {context.client.status}
              </Badge>
              <ClientPortalLogoutButton />
            </div>
          </div>
          <nav className="mt-3 flex flex-wrap gap-2">
            <Link className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent" href="/client">
              Dashboard
            </Link>
            {links.map((item) => (
              <Link
                key={item.href}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
