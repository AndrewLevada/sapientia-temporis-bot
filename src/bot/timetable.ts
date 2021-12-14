import { Context, Markup, Telegraf } from "telegraf";
import { logEvent, logUserGroupChange } from "../services/analytics-service";
import { dateToSimpleString,
  getDayOfWeekWithDelta,
  getUserIdFromCtx,
  weekStrings,
  workWeekStrings } from "../utils";
import { getUserInfo, setUserInfo, UserInfo } from "../services/user-service";
import { DateTimetable, getTimetable, getTimetableForDelta } from "../services/timetable-service";
import { changeUserInfo } from "./user-info-change";
import { defaultKeyboard } from "./general";
import { resetUserSession } from "./env";
import { inverseGroups, inverseTeachers } from "../services/groups-service";
import texts from "./texts";

const deltaDayStrings = [texts.keys.default.yesterday, texts.keys.default.today, texts.keys.default.tomorrow];

export function bindTimetable(bot: Telegraf) {
  bot.hears(texts.keys.default.today, ctx => replyWithTimetableForDelta(ctx, 0));
  bot.hears(texts.keys.default.tomorrow, ctx => replyWithTimetableForDelta(ctx, 1));
  bot.hears(texts.keys.default.yesterday, ctx => replyWithTimetableForDelta(ctx, -1));

  bot.hears(texts.keys.default.weekDay, ctx => ctx.reply(texts.res.timetable.pickWeekDay, getDayAwareWeekKeyboard()));
  bot.hears(
    workWeekStrings.map(v => new RegExp(`${v}( (Сегодня))?`)),
    ctx => replyWithTimetableForDay(ctx, weekStrings.indexOf(ctx.message.text.split(" ")[0])),
  );
}

export function replyWithTimetableForDelta(ctx: Context, dayDelta: number) {
  if (!ctx.message) return;

  const userId = getUserIdFromCtx(ctx);
  resetUserSession(userId);
  getUserInfo(userId).then(info => {
    if (!info || !info.type || !info.group) {
      ctx.reply(texts.res.timetable.updateRequired).then(() => changeUserInfo(ctx));
      return;
    }

    logEvent(userId, "timetable_view", { type: "delta", dayDelta });
    collectAdditionalUserData(ctx, userId, info);

    getTimetableForDelta(info, dayDelta).then((timetable: DateTimetable) => {
      ctx.replyWithMarkdownV2(`${deltaDayStrings[dayDelta + 1]} ${weekStrings[getDayOfWeekWithDelta(dayDelta)]}: \n\n${timetable.lessons.join("\n\n")}`, defaultKeyboard);
    });
  });
}

export function replyWithTimetableForDay(ctx: Context, day: number) {
  if (!ctx.message) return;

  const userId = getUserIdFromCtx(ctx);
  resetUserSession(userId);
  getUserInfo(userId).then(info => {
    if (!info || !info.type || !info.group) {
      ctx.reply(texts.res.timetable.updateRequired).then(() => changeUserInfo(ctx));
      return;
    }

    logEvent(userId, "timetable_view", { type: "week", day });
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
  const additionalInfo: Partial<UserInfo> = {};
  const name = `${ctx.from?.first_name || ""} ${ctx.from?.last_name || ""}`;
  if (userInfo.name !== name) additionalInfo.name = name;
  if (userInfo.username !== ctx.from?.username) additionalInfo.username = ctx.from?.username;
  if (additionalInfo !== {}) setUserInfo(userId, additionalInfo).then();

  logUserGroupChange(
    userId,
    userInfo.type === "student" ? inverseGroups[userInfo.group] : inverseTeachers[userInfo.group],
    true,
  );
}
