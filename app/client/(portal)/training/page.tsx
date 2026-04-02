import { ClientPortalTrainingView } from "@/components/client-portal/portal-modules";
import { requireClientModuleAccess } from "@/lib/client-portal/guards";

export default async function ClientPortalTrainingPage() {
  const { readOnly } = await requireClientModuleAccess("program");
  return <ClientPortalTrainingView readOnly={readOnly} />;
}

