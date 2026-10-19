import type { LifeTask } from "./protocol";

const chinaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Quota and archive dates follow the server's China Standard Time contract. */
export function lifeDate(seconds: number): string {
  const parts = chinaDate.formatToParts(seconds * 1000);
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join("-");
}

export function dateValue(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function moveDay(date: string, amount: number): string {
  const value = dateValue(date);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function moveMonth(date: string, amount: number): string {
  const value = dateValue(`${date.slice(0, 7)}-01`);
  value.setUTCMonth(value.getUTCMonth() + amount);
  return value.toISOString().slice(0, 7);
}

export function calendarDays(month: string): (string | null)[] {
  const first = `${month}-01`;
  const offset = (dateValue(first).getUTCDay() + 6) % 7;
  const next = `${moveMonth(first, 1)}-01`;
  const count = dateValue(moveDay(next, -1)).getUTCDate();
  const days: (string | null)[] = Array(offset).fill(null);
  for (let day = 0; day < count; day++) days.push(moveDay(first, day));
  while (days.length % 7) days.push(null);
  return days;
}

export function dailyQuota(tasks: LifeTask[], date: string, limit: number) {
  const day = tasks.filter((task) => task.date === date);
  const claimed = day.reduce(
    (total, task) => total + (task.status === "claimed" ? task.hours : 0),
    0,
  );
  const reserved = day.reduce(
    (total, task) => total + (task.status === "active" ? task.hours : 0),
    0,
  );
  return {
    claimed,
    reserved,
    remaining: Math.max(0, limit - claimed - reserved),
  };
}
