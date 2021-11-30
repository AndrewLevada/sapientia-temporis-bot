import { Context, Markup, Telegraf } from "telegraf";
import { logEvent } from "../services/analytics-service";
import { dateToSimpleString,
  getDayOfWeekWithDelta,
  getUserIdFromCtx,
  weekStrings,
  workWeekStrings } from "../utils";
import { getUserInfo, setUserInfo, UserInfo } from "../services/user-service";
import { DateTimetable, getTimetable } from "../services/timetable-service";
import { changeUserInfo } from "./user-info-change";
import { defaultKeyboard } from "./general";
import { resetUserSession } from "./env";

const deltaDayStrings = ["Вчера", "Сегодня", "Завтра"];

export function bindTimetable(bot: Telegraf) {
  bot.hears("Сегодня", ctx => replyWithTimetableForDelta(ctx, 0));
  bot.hears("Завтра", ctx => replyWithTimetableForDelta(ctx, 1));
  bot.hears("Вчера", ctx => replyWithTimetableForDelta(ctx, -1));

  bot.hears("На день недели", ctx => ctx.reply("Выберите день недели", getDayAwareWeekKeyboard()));
  bot.hears(workWeekStrings.map(v => new RegExp(`${v}( (Сегодня))?`)), ctx => replyWithTimetableForDay(ctx, weekStrings.indexOf(ctx.message.text.split(" ")[0])));
}

export function replyWithTimetableForDelta(ctx: Context, dayDelta: number) {
  if (!ctx.message) return;

  const userId = getUserIdFromCtx(ctx);
  logEvent(userId, "timetable_view", { type: "delta", dayDelta });
  resetUserSession(userId);
  getUserInfo(userId).then(info => {
    if (!info || !info.type || !info.group) {
      ctx.reply("Бот обновился! Теперь требуются дополнительные данные")
        .then(() => changeUserInfo(ctx));
      return;
    }

    collectAdditionalUserData(ctx, userId, info);

    const now = new Date();
    const day = getDayOfWeekWithDelta(dayDelta);
    const date = new Date(now.valueOf() + (day - now.getDay()) * (24 * 60 * 60 * 1000));
    getTimetable(info, date).then((timetable: DateTimetable) => {
      ctx.replyWithMarkdownV2(`${deltaDayStrings[dayDelta + 1]} ${weekStrings[day]}: \n\n${timetable.lessons.join("\n\n")}`);
    });
  });
}

export function replyWithTimetableForDay(ctx: Context, day: number) {
  if (!ctx.message) return;

  const userId = getUserIdFromCtx(ctx);
  logEvent(userId, "timetable_view", { type: "week", day });
  resetUserSession(userId);
  getUserInfo(userId).then(info => {
    if (!info || !info.type || !info.group) {
      ctx.reply("Бот обновился! Теперь требуются дополнительные данные")
        .then(() => changeUserInfo(ctx));
      return;
    }

    collectAdditionalUserData(ctx, userId, info);

    const now = new Date();
    const date = new Date(now.valueOf()
      + (day - now.getDay()) * (24 * 60 * 60 * 1000)
      + (day < now.getDay() ? (7 * 24 * 60 * 60 * 1000) : 0));
    getTimetable(info, date).then((timetable: DateTimetable) => {
      ctx.replyWithMarkdownV2(`${weekStrings[day]} \\(${dateToSimpleString(timetable.date)}\\): \n\n${timetable.lessons.join("\n\n")}`, defaultKeyboard);
    });
  });
}

function getDayAwareWeekKeyboard(): any {
  const buttons = [["Понедельник", "Вторник"], ["Среда", "Четверг"], ["Пятница", "Суббота"]];
  const day = getDayOfWeekWithDelta(0) - 1;
  if (day === -1) return Markup.keyboard(buttons);
  buttons[Math.floor(day / 2)][day % 2] += " (Сегодня)";
  return Markup.keyboard(buttons);
}

function collectAdditionalUserData(ctx: Context, userId: string, userInfo: UserInfo): void {
  if (userInfo.username && userInfo.name) return;
  const additionalInfo: Partial<UserInfo> = {};
  if (ctx.from?.first_name || ctx.from?.last_name)
    additionalInfo.name = `${ctx.from?.first_name || ""} ${ctx.from?.last_name || ""}`;
  if (ctx.from?.username) additionalInfo.username = ctx.from?.username;
  if (additionalInfo !== {}) setUserInfo(userId, { ...userInfo, ...additionalInfo }).then();
}
