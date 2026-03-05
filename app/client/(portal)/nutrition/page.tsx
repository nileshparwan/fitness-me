import { ClientPortalNutritionView } from "@/components/client-portal/portal-modules";
import { requireClientModuleAccess } from "@/lib/client-portal/guards";

export default async function ClientPortalNutritionPage() {
  const { readOnly } = await requireClientModuleAccess("meal_logging");
  return <ClientPortalNutritionView readOnly={readOnly} />;
}

