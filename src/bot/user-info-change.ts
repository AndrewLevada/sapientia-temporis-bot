import { Context, Markup, Telegraf } from "telegraf";
import { decodeGroupFromUserInfo, groups, searchForTeacher } from "../services/groups-service";
import { logUserGroupChange } from "../services/analytics-service";
import { getUserIdFromCtx, isTodaySunday, TextContext } from "../utils";
import { getUserInfo, setUserInfo } from "../services/user-service";
import { sessions, resetUserSession, setUserSessionState } from "./env";
import { replyWithTimetableForDelta } from "./timetable";
import { defaultKeyboard } from "./general";
import texts from "./texts";

const userSectionKeyboard = Markup.keyboard([["1", "2", "3", "4"], ["5", "6", "7", "8"], ["9", "10", "11"], ["Я преподаю"]]).resize();

export function bindUserInfoChange(bot: Telegraf): void {
  bot.hears(texts.keys.settings.changeGroup, ctx => changeUserInfo(ctx));

  bot.on("text", (ctx, next) => {
    const userId: string = ctx.message.chat.id.toString();
    if (!sessions[userId] || sessions[userId].state === "normal") next();
    else if (sessions[userId].state === "section-change") processSectionChange(ctx, userId);
    else if (sessions[userId].state === "group-change") processGroupChange(ctx, userId);
    else next();
  });
}

function processSectionChange(ctx: TextContext, userId: string) {
  const type = ctx.message.text.toLowerCase().trim();

  if (type === "я преподаю") {
    sessions[userId].type = "teacher";
    setUserSessionState(userId, "group-change");
    ctx.reply("Введите вашу фамилию", Markup.removeKeyboard()).then();
    return;
  }

  const typeAsNumber: number = parseInt(type);
  if (!Number.isNaN(typeAsNumber) && typeAsNumber > 0 && typeAsNumber <= 11) {
    sessions[userId].type = "student";
    sessions[userId].grade = type;
    setUserSessionState(userId, "group-change");
    ctx.reply("Теперь уточни букву класса", Markup.keyboard(getLetteredKeyboardOfLength(lettersInGrades[typeAsNumber - 1])).resize()).then();
    return;
  }

  ctx.reply("Некорректное значение! Повторите ввод", userSectionKeyboard).then();
}

const lettersInGrades = [5, 5, 7, 6, 5, 4, 4, 3, 3, 5, 5];

function getLetteredKeyboardOfLength(n: number): string[][] {
  if (n === 3) return [["А"], ["Б"], ["В"]];
  if (n === 4) return [["А", "Б"], ["В", "Г"]];
  if (n === 5) return [["А", "Б"], ["В", "Г"], ["Д"]];
  if (n === 6) return [["А", "Б", "В"], ["Г", "Д", "Е"]];
  if (n === 7) return [["А", "Б", "В"], ["Г", "Д", "Е"], ["Ж"]];
  return [];
}

function processGroupChange(ctx: TextContext, userId: string) {
  const group = ctx.message.text.toLowerCase().trim();

  if (sessions[userId].type === "student")
    if (groups[sessions[userId].grade + group]) {
      logUserGroupChange(getUserIdFromCtx(ctx as Context), group);
      setUserInfo(userId, {
        type: "student",
        group: groups[sessions[userId].grade + group],
        name: ctx.from?.first_name,
      }).then(() => {
        resetUserSession(userId);
        ctx.reply("Отлично! Вот твоё расписание:", defaultKeyboard)
          .then(() => replyWithTimetableForDelta(ctx, isTodaySunday() ? 1 : 0));
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
        ctx.reply(`Отлично! Распознаю вас как ${t.fullName} Вот ваше расписание:`, defaultKeyboard)
          .then(() => replyWithTimetableForDelta(ctx, isTodaySunday() ? 1 : 0));
      });
    } else ctx.reply("Преподаватель не найден! Повторите ввод").then();
  }
}

export function changeUserInfo(ctx: Context): void {
  const userId: string = getUserIdFromCtx(ctx);
  getUserInfo(userId).then(userInfo => {
    if (userInfo && userInfo.isLimitedInGroupChange === true)
      ctx.reply(`Оу! Вы изменили группу расписания слишком много раз. Теперь она зафиксирована как ${decodeGroupFromUserInfo(userInfo)}`).then();
    else {
      ctx.reply("В каком классе вы учитесь?", userSectionKeyboard).then();
      setUserSessionState(userId, "section-change");
    }
  });
}
