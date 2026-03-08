export type NutritionDashboardMacro = {
  key: "protein" | "carbs" | "fat";
  label: string;
  grams: number;
  targetGrams: number;
  percent: number;
};

export type NutritionDashboardQuickAction = {
  id: string;
  label: string;
  href: string;
  icon: "log" | "plans" | "clients" | "progress";
};

export type NutritionDashboardActivity = {
  id: string;
  type: "meal" | "assignment" | "group" | "progress" | "client";
  text: string;
  timeLabel: string;
  createdAt: string;
  eventName: string;
  subjectUserId: string | null;
  subjectClientId: string | null;
};

export type NutritionDashboardData = {
  greetingName: string;
  greetingSubtitle: string;
  dateLabel: string;
  consumedCalories: number;
  targetCalories: number;
  macros: NutritionDashboardMacro[];
  quickActions: NutritionDashboardQuickAction[];
  recentActivity: NutritionDashboardActivity[];
};

export const NUTRITION_DASHBOARD_QUICK_ACTIONS: NutritionDashboardQuickAction[] = [
  { id: "log", label: "Log Meal", href: "/nutrition/diary", icon: "log" },
  { id: "plans", label: "Meal Planner", href: "/nutrition/meal-planner", icon: "plans" },
  { id: "clients", label: "Clients", href: "/clients", icon: "clients" },
  { id: "progress", label: "Progress", href: "/progress/nutrition", icon: "progress" },
];
