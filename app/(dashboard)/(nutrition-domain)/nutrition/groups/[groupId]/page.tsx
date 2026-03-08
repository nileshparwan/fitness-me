import { MealGroupDetail } from "@/components/nutrition/meal-groups/meal-group-detail";

type NutritionGroupsDetailPageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function NutritionGroupsDetailPage({ params }: NutritionGroupsDetailPageProps) {
  const { groupId } = await params;
  return (
    <div className="page-shell">
      <MealGroupDetail mealGroupId={groupId} />
    </div>
  );
}
