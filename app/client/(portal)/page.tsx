import { ClientPortalDashboardView } from "@/components/client-portal/portal-modules";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ClientPortalDashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientPortalDashboardPage({
  searchParams,
}: ClientPortalDashboardPageProps) {
  const resolved = await searchParams;
  const noAccess =
    typeof resolved.noAccess === "string" ? resolved.noAccess : null;
  const readOnly =
    typeof resolved.readOnly === "string" ? resolved.readOnly : null;

  return (
    <div className="space-y-3">
      {noAccess ? (
        <Alert>
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            Your coach has disabled access for <span className="font-medium">{noAccess}</span>.
          </AlertDescription>
        </Alert>
      ) : null}
      {readOnly ? (
        <Alert>
          <AlertTitle>Read-only Mode</AlertTitle>
          <AlertDescription>
            You can view <span className="font-medium">{readOnly}</span>, but updates are disabled.
          </AlertDescription>
        </Alert>
      ) : null}
      <ClientPortalDashboardView />
    </div>
  );
}

