import {
  getClientBillingPlanAction,
  getClientPaymentLogStatsAction,
  listClientBillingPlanHistoryAction,
  listClientPaymentLogsAction,
  type ClientBillingPlanWithRemaining,
  type ClientPaymentLogStats,
  type ClientPaymentLogsPayload,
} from "@/app/actions/coach-tools";
import { ClientPaymentLogsView } from "@/components/coach-tools/client-payment-logs";

type ClientPaymentsPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientPaymentsPage({ params }: ClientPaymentsPageProps) {
  const { clientId } = await params;

  let billingPlan: ClientBillingPlanWithRemaining | null | undefined;
  let billingHistory: ClientBillingPlanWithRemaining[] | undefined;
  let logs: ClientPaymentLogsPayload | undefined;
  let stats: ClientPaymentLogStats | undefined;

  try {
    [billingPlan, billingHistory, logs, stats] = await Promise.all([
      getClientBillingPlanAction(clientId),
      listClientBillingPlanHistoryAction(clientId),
      listClientPaymentLogsAction({
        client_id: clientId,
        page: 0,
        limit: 20,
        sort_by: "session_date",
        sort_dir: "desc",
        status: "all",
      }),
      getClientPaymentLogStatsAction(clientId),
    ]);
  } catch {
    // Let client hooks recover with their own loading/error states.
  }

  return (
    <div className="page-shell">
      <ClientPaymentLogsView
        clientId={clientId}
        initialData={{
          billingPlan,
          billingHistory,
          logs,
          stats,
        }}
      />
    </div>
  );
}
