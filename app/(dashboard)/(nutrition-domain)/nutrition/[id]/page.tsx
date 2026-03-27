import { MealGroupDetail } from "@/components/nutrition/meal-groups/meal-group-detail";

type NutritionGroupAliasPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NutritionGroupAliasPage({ params }: NutritionGroupAliasPageProps) {
  const { id } = await params;
  return (
    <div className="page-shell">
      <MealGroupDetail mealGroupId={id} />
    </div>
  );
}
