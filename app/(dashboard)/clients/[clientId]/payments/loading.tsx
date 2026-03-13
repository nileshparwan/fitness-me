import { ClientPaymentLogsSkeleton } from "@/components/coach-tools/client-payment-logs-skeleton";

export default function ClientPaymentsLoading() {
  return (
    <div className="page-shell">
      <ClientPaymentLogsSkeleton />
    </div>
  );
}
