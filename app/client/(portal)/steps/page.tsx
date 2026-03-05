import { ClientPortalStepsView } from "@/components/client-portal/portal-modules";
import { requireClientModuleAccess } from "@/lib/client-portal/guards";

export default async function ClientPortalStepsPage() {
  const { readOnly } = await requireClientModuleAccess("steps_tracking");
  return <ClientPortalStepsView readOnly={readOnly} />;
}

