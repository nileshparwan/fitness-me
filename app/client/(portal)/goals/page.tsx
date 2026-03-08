import { ClientPortalGoalsView } from "@/components/client-portal/portal-modules";
import { requireClientModuleAccess } from "@/lib/client-portal/guards";

export default async function ClientPortalGoalsPage() {
  const { readOnly } = await requireClientModuleAccess("goals");
  return <ClientPortalGoalsView readOnly={readOnly} />;
}

