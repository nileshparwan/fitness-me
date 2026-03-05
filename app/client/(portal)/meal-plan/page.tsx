import { ClientPortalMealPlanView } from "@/components/client-portal/portal-modules";
import { requireClientModuleAccess } from "@/lib/client-portal/guards";

export default async function ClientPortalMealPlanPage() {
  await requireClientModuleAccess("meal_plan");
  return <ClientPortalMealPlanView />;
}

