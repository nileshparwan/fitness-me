"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminUserDetail } from "@/hooks/admin/use-admin";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return format(new Date(value), "MMM d, yyyy");
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { data, isLoading } = useAdminUserDetail(userId);

  return (
    <div className="section-gap">
      <div className="native-surface surface-pad flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">User</p>
          <h2 className="text-xl font-semibold md:text-2xl">{userId}</h2>
        </div>
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="native-surface">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.sessions.length ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="native-surface">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Strength Sets</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.strength_sets_count ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="native-surface">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Meal Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.meal_plans.length ?? 0}</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card className="native-surface">
              <CardHeader>
                <CardTitle>Recent Training Sessions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.sessions || []).slice(0, 8).map((session) => (
                  <div key={session.id} className="rounded-lg border p-3">
                    <p className="font-medium">{session.name || "Untitled Session"}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(session.date)} • {session.status || "unknown"} • {session.duration_minutes ?? 0} min
                    </p>
                  </div>
                ))}
                {(data?.sessions.length || 0) === 0 && (
                  <p className="text-sm text-muted-foreground">No sessions found.</p>
                )}
              </CardContent>
            </Card>

            <Card className="native-surface">
              <CardHeader>
                <CardTitle>Recent Meal Plans</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.meal_plans || []).slice(0, 8).map((plan) => (
                  <div key={plan.id} className="rounded-lg border p-3">
                    <p className="font-medium">{plan.name || "Untitled Plan"}</p>
                    <p className="text-sm text-muted-foreground">
                      {plan.status || "unknown"} • {formatDate(plan.start_date)} to {formatDate(plan.end_date)}
                    </p>
                  </div>
                ))}
                {(data?.meal_plans.length || 0) === 0 && (
                  <p className="text-sm text-muted-foreground">No meal plans found.</p>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
