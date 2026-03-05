import { MealGroupDetail } from "@/components/nutrition/meal-groups/meal-group-detail";

type NutritionMealGroupDetailPageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function NutritionMealGroupDetailPage({ params }: NutritionMealGroupDetailPageProps) {
  const { groupId } = await params;
  return (
    <div className="page-shell">
      <MealGroupDetail mealGroupId={groupId} />
    </div>
  );
}
