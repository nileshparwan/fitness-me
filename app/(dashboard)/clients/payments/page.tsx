import { listCoachPaymentsDashboardAction, type CoachPaymentsDashboard as CoachPaymentsDashboardData } from "@/app/actions/coach-tools";
import { CoachPaymentsDashboard } from "@/components/coach-tools/coach-payments-dashboard";

export default async function ClientsPaymentsPage() {
  let initialData: CoachPaymentsDashboardData | null = null;
  try {
    initialData = await listCoachPaymentsDashboardAction({
      status: "all",
      search: "",
      limit: 300,
      page: 0,
      page_size: 10,
      sort_by: "created_at",
      sort_dir: "desc",
    });
  } catch {
    initialData = null;
  }

  return (
    <div className="page-shell">
      <CoachPaymentsDashboard initialData={initialData} />
    </div>
  );
}
