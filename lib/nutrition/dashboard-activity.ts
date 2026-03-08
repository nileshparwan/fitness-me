import type { Json } from "@/types/database";

type NutritionActivityType = "meal" | "assignment" | "group" | "progress" | "client";

type NutritionActivityScope = {
  subject_user_id: string | null;
  subject_client_id: string | null;
  meal_group_id: string | null;
};

type NutritionSelectedScope = {
  subject_user_id?: string | null;
  subject_client_id?: string | null;
  meal_group_id?: string | null;
};

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export function activityMetadataObject(input: Json | null): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

export function activityMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeMealTypeLabel(input: string | null) {
  if (!input) return null;
  const normalized = input.replaceAll("_", " ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function classifyNutritionActivityType(eventName: string): NutritionActivityType {
  if (
    eventName.includes(".item.") ||
    eventName.includes(".meal-item.") ||
    eventName.includes(".favorite.") ||
    eventName.includes(".section.add") ||
    eventName.includes(".day.copy")
  ) {
    return "meal";
  }

  if (eventName.includes(".assign")) {
    return "assignment";
  }

  if (eventName.includes(".group") || eventName.includes(".meal-groups")) {
    return "group";
  }

  if (eventName.includes(".client")) {
    return "client";
  }

  return "progress";
}

function activityMetadataDayLabel(metadata: Record<string, unknown>) {
  const day = activityMetadataString(metadata, "day_of_week") || activityMetadataString(metadata, "day");
  if (!day) return null;
  return DAY_LABELS[day.toLowerCase()] || null;
}

function todayIsoDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return value;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function relativeDateLabel(value: string | null) {
  if (!value) return null;
  const today = todayIsoDate();
  if (value === today) return "today";

  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${`${y.getMonth() + 1}`.padStart(2, "0")}-${`${y.getDate()}`.padStart(2, "0")}`;
  if (value === yesterday) return "yesterday";
  return dateLabel(value);
}

function itemNameFromMetadata(metadata: Record<string, unknown>) {
  return activityMetadataString(metadata, "item_name") || activityMetadataString(metadata, "title");
}

function mealTypeFromMetadata(metadata: Record<string, unknown>) {
  return normalizeMealTypeLabel(activityMetadataString(metadata, "meal_type") || activityMetadataString(metadata, "type"));
}

function activityDateContext(metadata: Record<string, unknown>) {
  const dayLabel = activityMetadataDayLabel(metadata);
  if (dayLabel) return ` for ${dayLabel}`;

  const rawDate =
    activityMetadataString(metadata, "performed_on") ||
    activityMetadataString(metadata, "planned_date") ||
    activityMetadataString(metadata, "date");

  const relativeDate = relativeDateLabel(rawDate);
  return relativeDate ? ` for ${relativeDate}` : "";
}

function withName(base: string, name: string | null) {
  if (!name) return base;
  return `${base} ${name}`;
}

export function describeNutritionActivity(eventName: string, metadata: Record<string, unknown>) {
  const mealType = mealTypeFromMetadata(metadata);
  const itemName = itemNameFromMetadata(metadata);
  const dateContext = activityDateContext(metadata);
  const groupName = activityMetadataString(metadata, "group_name") || activityMetadataString(metadata, "meal_group_name");
  const planName = activityMetadataString(metadata, "plan_name");
  const favoriteAction = activityMetadataString(metadata, "favorite_action");

  if (eventName === "nutrition.manual.item.add") {
    if (itemName && mealType) return `Added ${itemName} to ${mealType}${dateContext}`;
    if (itemName) return `Added ${itemName}${dateContext}`;
    if (mealType) return `Added item to ${mealType}${dateContext}`;
    return `Added meal item${dateContext}`;
  }
  if (eventName === "nutrition.manual.item.update") {
    if (itemName) return `Updated ${itemName}${dateContext}`;
    return `Updated meal item${dateContext}`;
  }
  if (eventName === "nutrition.manual.item.remove") {
    if (itemName) return `Removed ${itemName}${dateContext}`;
    return `Removed meal item${dateContext}`;
  }
  if (eventName === "nutrition.manual.section.add") {
    if (mealType) return `Added ${mealType} section${dateContext}`;
    return `Added meal section${dateContext}`;
  }
  if (eventName === "nutrition.manual.day.copy") {
    const source = relativeDateLabel(activityMetadataString(metadata, "source_date")) || "another day";
    const target = relativeDateLabel(activityMetadataString(metadata, "target_date"));
    if (target) return `Copied meals from ${source} to ${target}`;
    return `Copied meals from ${source}`;
  }
  if (eventName === "nutrition.manual.favorite.toggle") {
    if (favoriteAction === "added") return withName("Added", itemName || "item") + " to favorites";
    if (favoriteAction === "removed") return withName("Removed", itemName || "item") + " from favorites";
    return itemName ? `Updated favorite for ${itemName}` : "Updated favorite item";
  }

  if (eventName === "nutrition.meal-item.create") {
    if (itemName && mealType) return `Added ${itemName} to ${mealType}${dateContext}`;
    if (itemName) return `Added ${itemName}${dateContext}`;
    if (mealType) return `Added planner item to ${mealType}${dateContext}`;
    return `Added planner item${dateContext}`;
  }
  if (eventName === "nutrition.meal-item.update") {
    if (itemName) return `Updated ${itemName}${dateContext}`;
    return `Updated planner item${dateContext}`;
  }
  if (eventName === "nutrition.meal-item.delete") {
    if (itemName) return `Deleted ${itemName}${dateContext}`;
    return `Deleted planner item${dateContext}`;
  }
  if (eventName === "nutrition.meal-item.duplicate") {
    if (itemName) return `Duplicated ${itemName}${dateContext}`;
    return `Duplicated planner item${dateContext}`;
  }
  if (eventName === "nutrition.meal-plan.type.create") {
    if (mealType) return `Added meal type ${mealType}${dateContext}`;
    return `Added meal type${dateContext}`;
  }
  if (eventName === "nutrition.meal-plan.note.update") {
    return `Updated planner notes${dateContext}`;
  }

  if (eventName === "nutrition.meal-groups.create") return groupName ? `Created meal group ${groupName}` : "Created meal group";
  if (eventName === "nutrition.meal-groups.update") return groupName ? `Updated meal group ${groupName}` : "Updated meal group";
  if (eventName === "nutrition.meal-groups.delete") return groupName ? `Deleted meal group ${groupName}` : "Deleted meal group";
  if (eventName === "nutrition.meal-groups.duplicate") return groupName ? `Duplicated meal group ${groupName}` : "Duplicated meal group";
  if (eventName === "nutrition.meal-groups.assign") return groupName ? `Assigned meal group ${groupName}` : "Assigned meal group";
  if (eventName === "nutrition.meal-groups.assignment.update") return "Updated meal group assignment";
  if (eventName === "nutrition.meal-groups.assignment.archive") return "Archived meal group assignment";

  if (eventName === "nutrition.manual.plan.create") return planName ? `Created nutrition plan ${planName}` : "Created nutrition plan";
  if (eventName === "nutrition.manual.plan.update") return planName ? `Updated nutrition plan ${planName}` : "Updated nutrition plan";
  if (eventName === "nutrition.manual.plan.archive") return "Archived nutrition plan";
  if (eventName === "nutrition.manual.plan.duplicate") return "Duplicated nutrition plan";
  if (eventName === "nutrition.manual.plan.assign") return planName ? `Assigned nutrition plan ${planName}` : "Assigned nutrition plan";
  if (eventName === "nutrition.manual.log.notes.update") return "Updated nutrition note";

  if (eventName === "nutrition.meal.create") return mealType ? `Created ${mealType} meal` : "Created meal";
  if (eventName === "nutrition.meal.update") return itemName ? `Updated ${itemName}` : "Updated meal";
  if (eventName === "nutrition.meal.delete") return "Deleted meal";
  if (eventName === "nutrition.meal.copy") return "Copied meal";
  if (eventName === "nutrition.meal.move") return "Moved meal";
  if (eventName === "nutrition.meal.positions.update") return "Reordered meals";
  if (eventName === "nutrition.meal.status.update") return "Updated meal status";
  if (eventName === "nutrition.program.status.update") return "Updated nutrition program status";
  if (eventName === "nutrition.program.notes.update") return "Updated nutrition program notes";

  return eventName
    .replace(/^nutrition\./, "")
    .replaceAll(".", " ")
    .replaceAll("-", " ")
    .trim();
}

export function shouldIncludeNutritionActivityForScope(eventScope: NutritionActivityScope, selectedScope: NutritionSelectedScope) {
  const hasExplicitEventScope = Boolean(eventScope.subject_user_id || eventScope.subject_client_id || eventScope.meal_group_id);

  if (!hasExplicitEventScope) {
    return true;
  }

  if (selectedScope.meal_group_id && eventScope.meal_group_id === selectedScope.meal_group_id) {
    return true;
  }

  if (!selectedScope.subject_client_id && !selectedScope.subject_user_id) {
    return true;
  }

  if (selectedScope.subject_client_id) {
    return eventScope.subject_client_id === selectedScope.subject_client_id;
  }

  return eventScope.subject_user_id === selectedScope.subject_user_id;
}
