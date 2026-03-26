export type UnitSystem = "metric" | "imperial";

export const KG_TO_LBS = 2.2046226218;
export const CM_PER_INCH = 2.54;
export const KM_PER_MILE = 1.609344;
export const WEIGHT_UNIT_VALUES = ["kg", "lbs"] as const;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function round4(value: number) {
  return Math.round(value * 10000) / 10000;
}

// Weight is stored in kg.
export function displayWeight(kg: number | null | undefined, system: UnitSystem) {
  if (kg == null) return null;
  return system === "imperial" ? round2(kg * KG_TO_LBS) : round2(kg);
}

export function storageWeight(value: number, system: UnitSystem) {
  return system === "imperial" ? round4(value / KG_TO_LBS) : value;
}

export const weightUnit = (system: UnitSystem) => (system === "imperial" ? "lbs" : "kg");

export function isWeightUnit(unit: string | null | undefined): unit is (typeof WEIGHT_UNIT_VALUES)[number] {
  return unit != null && WEIGHT_UNIT_VALUES.includes(unit as (typeof WEIGHT_UNIT_VALUES)[number]);
}

// Height is stored in cm.
export function displayHeight(cm: number | null | undefined, system: UnitSystem) {
  if (cm == null) return null;
  return system === "imperial" ? round2(cm / CM_PER_INCH) : round2(cm);
}

export function storageHeight(value: number, system: UnitSystem) {
  return system === "imperial" ? round4(value * CM_PER_INCH) : value;
}

export function formatHeight(cm: number | null | undefined, system: UnitSystem) {
  if (cm == null) return "—";
  if (system === "imperial") {
    const totalInches = cm / CM_PER_INCH;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  }
  return `${Math.round(cm)} cm`;
}

export const heightUnit = (system: UnitSystem) => (system === "imperial" ? "in" : "cm");

// Circumference is stored in cm.
export function displayCircumference(cm: number | null | undefined, system: UnitSystem) {
  if (cm == null) return null;
  return system === "imperial" ? round2(cm / CM_PER_INCH) : round2(cm);
}

export function storageCircumference(value: number, system: UnitSystem) {
  return system === "imperial" ? round4(value * CM_PER_INCH) : value;
}

export const circumferenceUnit = (system: UnitSystem) => (system === "imperial" ? "in" : "cm");

// Distance is stored in km.
export function displayDistance(km: number | null | undefined, system: UnitSystem) {
  if (km == null) return null;
  return system === "imperial" ? round2(km / KM_PER_MILE) : round2(km);
}

export function storageDistance(value: number, system: UnitSystem) {
  return system === "imperial" ? round4(value * KM_PER_MILE) : value;
}

export const distanceUnit = (system: UnitSystem) => (system === "imperial" ? "mi" : "km");

// Speed is stored in km/h.
export function displaySpeed(kmh: number | null | undefined, system: UnitSystem) {
  if (kmh == null) return null;
  return system === "imperial" ? round2(kmh / KM_PER_MILE) : round2(kmh);
}

export function storageSpeed(value: number, system: UnitSystem) {
  return system === "imperial" ? round4(value * KM_PER_MILE) : value;
}

export const speedUnit = (system: UnitSystem) => (system === "imperial" ? "mph" : "km/h");

export function formatPace(distanceKm: number, durationMinutes: number, system: UnitSystem) {
  if (distanceKm <= 0 || durationMinutes <= 0) return "—";
  const displayDistance = system === "imperial" ? distanceKm / KM_PER_MILE : distanceKm;
  const paceMinutes = durationMinutes / displayDistance;
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  const unit = distanceUnit(system);
  return `${mins}:${String(secs).padStart(2, "0")} /${unit}`;
}
