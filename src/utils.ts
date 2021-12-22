import { Context } from "telegraf";
import { UserInfo } from "./services/user-service";
import { inverseGroups, inverseTeachers } from "./services/groups-service";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getUserIdFromCtx(ctx: Context): string {
  return ctx.from!.id.toString();
}

export function decodeGroupInUserInfo(userInfo: UserInfo): UserInfo {
  return { ...userInfo, group: userInfo.type === "student" ? inverseGroups[userInfo.group] : inverseTeachers[userInfo.group] };
}

export type TextContext = Context & { message: { text: string } };

export function sanitizeTextForMD(text: string): string {
  return text
    .replace(/\./g, "\\.")
    .replace(/-/g, "\\-")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_");
}
