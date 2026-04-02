import { ClientPortalMealPlanView } from "@/components/client-portal/portal-modules";
import { requireClientModuleAccess } from "@/lib/client-portal/guards";

export default async function ClientPortalMealPlanPage() {
  await requireClientModuleAccess("nutrition_plan");
  return <ClientPortalMealPlanView />;
}

