import { differenceInCalendarDays, addDays, isAfter } from "date-fns";
import type { CyclePhase } from "@/types/health";

type CyclePhaseInfo = {
  phase: CyclePhase;
  day: number;
  tip: string;
};

function normalizeDate(date: Date | string) {
  return typeof date === "string" ? new Date(date) : date;
}

export function getCyclePhase(lastPeriodStart: Date | string, cycleLength: number): CyclePhaseInfo {
  const start = normalizeDate(lastPeriodStart);
  const today = new Date();
  const day = Math.max(1, differenceInCalendarDays(today, start) + 1);
  const phaseDay = ((day - 1) % Math.max(1, cycleLength)) + 1;

  if (phaseDay <= 5) {
    return {
      phase: "menstrual",
      day: phaseDay,
      tip: "Rest and restore. Prioritise low-intensity movement.",
    };
  }
  if (phaseDay <= 13) {
    return {
      phase: "follicular",
      day: phaseDay,
      tip: "Energy is rising. Good window for strength and high-intensity work.",
    };
  }
  if (phaseDay <= 17) {
    return {
      phase: "ovulatory",
      day: phaseDay,
      tip: "Peak energy. Ideal for PR attempts and competitive training.",
    };
  }
  return {
    phase: "luteal",
    day: phaseDay,
    tip: "Fatigue may increase. Focus on moderate training and nutrition quality.",
  };
}

export function getNextPeriodDate(lastPeriodStart: Date | string, cycleLength: number) {
  const start = normalizeDate(lastPeriodStart);
  return addDays(start, Math.max(1, cycleLength));
}

export function getDaysUntilNextPeriod(lastPeriodStart: Date | string, cycleLength: number) {
  const nextPeriod = getNextPeriodDate(lastPeriodStart, cycleLength);
  const today = new Date();
  if (isAfter(today, nextPeriod)) {
    return 0;
  }
  return Math.max(0, differenceInCalendarDays(nextPeriod, today));
}
