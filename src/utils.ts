import { CustomContext } from "./app";

export const workWeekStrings = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
export const weekStrings = ["Воскресенье", ...workWeekStrings];

export function getDayOfWeekWithDelta(dateDelta: number) {
  let day: number = new Date().getDay() + dateDelta;
  if (day === -1) day = 6;
  else if (day === 7) day = 0;
  return day;
}

export function dateToSimpleString(date: Date): string {
  return `${date.getDate() < 10 ? "0" : ""}${date.getDate()}\\.${date.getMonth() + 1 < 10 ? "0" : ""}${date.getMonth() + 1}`;
}

export function isTodaySunday(): boolean {
  return new Date().getDay() === 0;
}

export const getDefaultDict = <T>(defaultValue: T) => new Proxy({} as Record<string, T>, {
  get: (target, name: string) => (name in target ? target[name] : defaultValue),
});

export type TextContext = CustomContext & { message: { text: string } };

export function sanitizeTextForMD(text: string): string {
  return text
    .replace(/\./g, "\\.")
    .replace(/-/g, "\\-")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_");
}
