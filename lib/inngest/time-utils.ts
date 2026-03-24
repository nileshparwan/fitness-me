export function toQuarterBucket(value: string): string {
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return "00:00";

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const quarterMinute = Math.floor(minute / 15) * 15;

  return `${String(hour).padStart(2, "0")}:${String(quarterMinute).padStart(2, "0")}`;
}

export function localQuarterBucket(now: Date, timezone: string): string {
  let formatter: Intl.DateTimeFormat;

  try {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  }

  const parts = formatter.formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const quarterMinute = Math.floor(minute / 15) * 15;

  return `${hour}:${String(quarterMinute).padStart(2, "0")}`;
}

