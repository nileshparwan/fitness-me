export const nutritionDashboardKeys = {
  all: ["nutrition-dashboard"] as const,
  summary: () => [...nutritionDashboardKeys.all, "summary"] as const,
};
