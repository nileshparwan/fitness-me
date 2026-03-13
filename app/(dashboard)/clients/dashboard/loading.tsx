import { ClientsDashboardSkeleton } from "@/components/clients/clients-dashboard-skeleton";

export default function ClientsDashboardRouteLoading() {
  return (
    <div className="page-shell">
      <ClientsDashboardSkeleton />
    </div>
  );
}

