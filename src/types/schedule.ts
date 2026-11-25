import type { ActivityItem } from "./wallet";

export const REPEAT_OPTIONS = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
} as const;

export type Schedule = {
  id: string;
  title: string;
  amount: number;
  direction: "expense" | "income";
  category: string;
  walletLocalId: string;
  firstDue: string;
  repeat: keyof typeof REPEAT_OPTIONS;
  reminder: boolean;
};

export type DueSchedule = Schedule & { dueDate: string; daysAway: number };

export function localDateKey(date = new Date()): string {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
}

function dateNumber(key: string): number {
  return Date.parse(`${key}T00:00:00Z`);
}

export function isDateKey(key: string): boolean {
  const time = dateNumber(key);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && key >= "1900-01-01" && key <= "2099-12-31" &&
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === key;
}

export function displayDueDate(key: string): string {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(dateNumber(key));
}

export function occurrenceId(scheduleId: string, dueDate: string): string {
  return `scheduled-${scheduleId}-${dueDate}`;
}

function dayStep(repeat: Exclude<Schedule["repeat"], "monthly">): number {
  return repeat === "daily" ? 1 : repeat === "weekly" ? 7 : 14;
}

function occurrenceDate(schedule: Pick<Schedule, "firstDue" | "repeat">, index: number): string {
  const date = new Date(dateNumber(schedule.firstDue));
  if (schedule.repeat === "monthly") {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + index);
    const endOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
    date.setUTCDate(Math.min(day, endOfMonth.getUTCDate()));
  } else {
    date.setUTCDate(date.getUTCDate() + index * dayStep(schedule.repeat));
  }
  return date.toISOString().slice(0, 10);
}

function monthsBetween(start: string, end: string): number {
  const from = new Date(dateNumber(start));
  const to = new Date(dateNumber(end));
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth();
}

export function firstFutureMonthlyDate(firstDue: string, today: string): string {
  const index = Math.max(1, monthsBetween(firstDue, today));
  const pattern = { firstDue, repeat: "monthly" } as const;
  const date = occurrenceDate(pattern, index);
  return date > today ? date : occurrenceDate(pattern, index + 1);
}

export function getReminderOccurrences(
  schedules: Schedule[], activities: ActivityItem[], now = new Date(),
): { id: string; date: Date; direction: Schedule["direction"] }[] {
  const today = localDateKey(now);
  const recorded = new Set(activities.map(({ localId }) => localId));
  return schedules.filter(({ reminder }) => reminder).flatMap((schedule) => {
    const indexNearToday = schedule.repeat === "monthly"
      ? monthsBetween(schedule.firstDue, today)
      : Math.floor((dateNumber(today) - dateNumber(schedule.firstDue)) / (dayStep(schedule.repeat) * 86_400_000));
    const future = [];
    for (let i = Math.max(0, indexNearToday); future.length < 8; i++) {
      const due = occurrenceDate(schedule, i);
      const date = new Date(`${due}T09:00:00`);
      const id = occurrenceId(schedule.id, due);
      if (date > now && !recorded.has(id)) future.push({ id, date, direction: schedule.direction });
    }
    return future;
  }).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 50);
}

export function getDueSchedules(
  schedules: Schedule[], activities: ActivityItem[], today: string
): DueSchedule[] {
  const recorded = new Set(activities.map(({ localId }) => localId));
  return schedules.map((schedule) => {
    let index = 0;
    let dueDate = schedule.firstDue;
    while (recorded.has(occurrenceId(schedule.id, dueDate))) {
      dueDate = occurrenceDate(schedule, ++index);
    }
    const daysAway = (dateNumber(dueDate) - dateNumber(today)) / 86_400_000;
    return { ...schedule, dueDate, daysAway };
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function dueLabel(daysAway: number): string {
  if (daysAway === 0) return "Due today";
  if (daysAway === 1) return "Due tomorrow";
  if (daysAway < 0) return `${-daysAway} ${daysAway === -1 ? "day" : "days"} overdue`;
  return `Due in ${daysAway} days`;
}
