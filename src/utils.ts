import { Context } from "telegraf";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getUserIdFromCtx(ctx: { message?: unknown } & { update?: { callback_query?: any }} & Context): string {
  return (ctx.message || ctx.update.callback_query.message).chat.id.toString();
}

export type TextContext = Context & { message: { text: string } };
