import { ClientPortalTrainingView } from "@/components/client-portal/portal-modules";
import { requireClientModuleAccess } from "@/lib/client-portal/guards";

export default async function ClientPortalTrainingPage() {
  const { readOnly } = await requireClientModuleAccess("training_plan");
  return <ClientPortalTrainingView readOnly={readOnly} />;
}

