import { ClientPortalTasksView } from "@/components/client-portal/portal-modules";
import { requireClientModuleAccess } from "@/lib/client-portal/guards";

export default async function ClientPortalTasksPage() {
  const { readOnly } = await requireClientModuleAccess("tasks");
  return <ClientPortalTasksView readOnly={readOnly} />;
}

