import Link from "next/link";
import { ArrowRight, Dumbbell, Salad, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const quickActions = [
  {
    title: "Log Workout",
    description: "Track strength and cardio with full set details.",
    href: "/workouts/new",
    icon: Dumbbell,
  },
  {
    title: "Update Nutrition",
    description: "Manage meal plans and monitor adherence.",
    href: "/nutrition",
    icon: Salad,
  },
  {
    title: "Open Progress",
    description: "Review trends, consistency, and performance.",
    href: "/progress",
    icon: TrendingUp,
  },
  {
    title: "Ask AI Coach",
    description: "Get actionable next-step recommendations.",
    href: "/ai-coach",
    icon: Sparkles,
  },
];

export default function DashboardPage() {
  return (
    <div className="page-shell section-gap">
      <Card className="native-surface md:desktop-surface overflow-hidden">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl md:text-3xl tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Train with intent, recover intelligently, and build long-term consistency.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/workouts/new">Start Session</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/progress">View Progress</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href}>
            <Card className="h-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{action.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <div className="rounded-xl bg-primary/10 p-2">
                    <action.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs font-medium text-primary">
                  Open <ArrowRight className="ml-1 h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
