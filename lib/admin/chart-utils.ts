import { format, parseISO, subDays } from "date-fns";

type DateSeriesValue = Record<string, number>;

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildIsoDateRange(days: number): string[] {
  const safeDays = Math.max(1, days);
  const end = new Date();
  const start = subDays(end, safeDays - 1);
  const dates: string[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(toIsoDay(cursor));
  }

  return dates;
}

export function toShortDateLabel(isoDate: string): string {
  return format(parseISO(isoDate), "MMM d");
}

export function fillDailySeries<T extends DateSeriesValue>(
  dates: string[],
  source: Map<string, number>,
  valueKey: keyof T & string
): Array<{ isoDate: string; date: string } & T> {
  return dates.map((isoDate) => ({
    isoDate,
    date: toShortDateLabel(isoDate),
    [valueKey]: source.get(isoDate) ?? 0,
  })) as Array<{ isoDate: string; date: string } & T>;
}

export function incrementMapValue(map: Map<string, number>, key: string, incrementBy = 1) {
  map.set(key, (map.get(key) ?? 0) + incrementBy);
}

export function weekdayOrder() {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}

export function isoDateToWeekday(isoDate: string) {
  const day = parseISO(isoDate).getDay();
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return labels[day] ?? "Mon";
}
