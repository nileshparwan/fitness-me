import { ClientNutritionWorkspace } from "@/components/nutrition/client-nutrition-workspace";

type ClientNutritionPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientNutritionPage({ params }: ClientNutritionPageProps) {
  const { clientId } = await params;
  return (
    <div className="page-shell">
      <ClientNutritionWorkspace clientId={clientId} />
    </div>
  );
}
