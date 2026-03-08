import { ClientPortalWorkoutsView } from "@/components/client-portal/portal-modules";
import { requireClientModuleAccess } from "@/lib/client-portal/guards";

export default async function ClientPortalWorkoutsPage() {
  const { readOnly } = await requireClientModuleAccess("workouts");
  return <ClientPortalWorkoutsView readOnly={readOnly} />;
}

