const DASHBOARD_LOCALE = "en-US";

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function getTodayLabel(): string {
  return new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}
