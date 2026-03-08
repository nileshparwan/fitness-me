import { ClientPortalCheckinsView } from "@/components/client-portal/portal-modules";
import { requireClientModuleAccess } from "@/lib/client-portal/guards";

export default async function ClientPortalCheckinsPage() {
  const { readOnly } = await requireClientModuleAccess("check_ins");
  return <ClientPortalCheckinsView readOnly={readOnly} />;
}

