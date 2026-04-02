import { ClientPortalNotesView } from "@/components/client-portal/portal-modules";
import { requireClientModuleAccess } from "@/lib/client-portal/guards";

export default async function ClientPortalNotesPage() {
  await requireClientModuleAccess("coach_notes");
  return <ClientPortalNotesView />;
}
