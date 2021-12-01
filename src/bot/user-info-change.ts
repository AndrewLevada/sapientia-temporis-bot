import { Context, Markup, Telegraf } from "telegraf";
import { CallbackQuery } from "typegram/callback";
import { groups, searchForTeacher } from "../services/groups-service";
import { logUserGroupChange } from "../services/analytics-service";
import { getUserIdFromCtx, TextContext } from "../utils";
import { setUserInfo } from "../services/user-service";
import { sessions, resetUserSession } from "./env";
import { replyWithTimetableForDelta } from "./timetable";
import { defaultKeyboard } from "./general";

const userTypeKeyboard = Markup.keyboard(["Учусь", "Преподаю"]).resize();

export function bindUserInfoChange(bot: Telegraf): void {
  bot.on("callback_query", (ctx, next) => {
    if ((ctx.callbackQuery as CallbackQuery.DataCallbackQuery).data === "group")
      changeUserInfo(ctx);
    else next();
  });

  bot.on("text", (ctx, next) => {
    const userId: string = ctx.message.chat.id.toString();
    if (!sessions[userId] || sessions[userId].state === "normal") next();
    else if (sessions[userId].state === "change-type") processTypeChange(ctx, userId);
    else if (sessions[userId].state === "change-group") processGroupChange(ctx, userId);
    else next();
  });
}

function processTypeChange(ctx: any, userId: string) {
  const type = ctx.message.text.toLowerCase();

  if (!["учусь", "преподаю"].includes(type)) {
    ctx.reply("Некорректное значение! Повтори ввод", userTypeKeyboard);
    return;
  }

  sessions[userId].state = "change-group";
  if (type === "учусь") {
    sessions[userId].type = "student";
    ctx.reply("В каком классе ты учишься?", Markup.removeKeyboard()).then();
  } else if (type === "преподаю") {
    sessions[userId].type = "teacher";
    ctx.reply("Введите вашу фамилию", Markup.removeKeyboard()).then();
  }
}

function processGroupChange(ctx: TextContext, userId: string) {
  const group = ctx.message.text.toLowerCase().replace(" ", "");

  if (sessions[userId].type === "student")
    if (groups[group]) {
      logUserGroupChange(getUserIdFromCtx(ctx as Context), group);
      setUserInfo(userId, {
        type: "student",
        group: groups[group],
        name: ctx.from?.first_name,
      }).then(() => {
        resetUserSession(userId);
        ctx.reply("Отлично! Расписание на сегодня:", defaultKeyboard)
          .then(() => replyWithTimetableForDelta(ctx, 0));
      });
    } else ctx.reply("Некорректный класс! Повтори ввод").then();
  else if (sessions[userId].type === "teacher") {
    const t = searchForTeacher(group);
    if (t) {
      logUserGroupChange(getUserIdFromCtx(ctx as Context), t.fullName);
      setUserInfo(userId, {
        type: "teacher",
        group: t.code,
        name: ctx.from?.first_name,
      }).then(() => {
        resetUserSession(userId);
        ctx.reply(`Отлично! Распознаю вас как ${t.fullName}. Вот расписание на сегодня:`, defaultKeyboard)
          .then(() => replyWithTimetableForDelta(ctx, 0));
      });
    } else ctx.reply("Преподаватель не найден! Повторите ввод").then();
  }
}

export function changeUserInfo(ctx: { message?: any } & { update?: { callback_query?: any }} & Context): void {
  const userId: string = getUserIdFromCtx(ctx);
  ctx.reply("Чем вы занимаетесь в лицее?", userTypeKeyboard).then();
  if (!sessions[userId]) sessions[userId] = { state: "change-type" };
  else sessions[userId].state = "change-type";
}
