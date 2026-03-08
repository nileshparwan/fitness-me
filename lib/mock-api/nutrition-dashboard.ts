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

const MOCK_DASHBOARD_DATA: NutritionDashboardData = {
  greetingName: "John",
  greetingSubtitle: "Track your nutrition and manage your clients",
  dateLabel: "Mar 5, 2026",
  consumedCalories: 1820,
  targetCalories: 2400,
  macros: [
    { key: "protein", label: "Protein", grams: 142, targetGrams: 180, percent: 79 },
    { key: "carbs", label: "Carbs", grams: 185, targetGrams: 260, percent: 71 },
    { key: "fat", label: "Fat", grams: 58, targetGrams: 75, percent: 77 },
  ],
  quickActions: [
    { id: "log", label: "Log Meal", href: "/nutrition/diary", icon: "log" },
    { id: "plans", label: "Meal Planner", href: "/nutrition/meal-planner", icon: "plans" },
    { id: "clients", label: "Clients", href: "/clients", icon: "clients" },
    { id: "progress", label: "Progress", href: "/progress/nutrition", icon: "progress" },
  ],
  recentActivity: [
    { id: "a1", type: "meal", text: "Logged lunch — Chicken & Rice", timeLabel: "2h ago" },
    { id: "a2", type: "assignment", text: "Assigned meal plan to Sarah M.", timeLabel: "4h ago" },
    { id: "a3", type: "group", text: "Created new meal group 'Bulk Phase'", timeLabel: "Yesterday" },
    { id: "a4", type: "progress", text: "Updated daily macro targets", timeLabel: "Yesterday" },
  ],
};

function withLatency<T>(value: T, delayMs = 360): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delayMs);
  });
}

export async function fetchNutritionDashboardMockData(): Promise<NutritionDashboardData> {
  return withLatency(MOCK_DASHBOARD_DATA, 380);
}
