import { Markup } from "telegraf";
import { decodeGroup, encodeGroup, searchForTeacher } from "../services/groups-service";
import { logUserPropChange } from "../services/analytics-service";
import { isTodaySunday, TextContext } from "../utils";
import { getUserInfo, setUserInfo, UserType } from "../services/user-service";
import { replyWithTimetableForDelta } from "./timetable";
import { defaultKeyboard } from "./general";
import texts from "./texts";
import { CustomContext, Telegraf } from "../app";

const userSectionKeyboard = Markup.keyboard([["1", "2", "3", "4"], ["5", "6", "7", "8"], ["9", "10", "11"], ["Я преподаю"]]).resize();

const tempInfoStorage: Record<string, {
  type: UserType,
  grade?: string,
}> = {};

export function bindUserInfoChange(bot: Telegraf): void {
  bot.hears(texts.keys.settings.changeGroup, ctx => changeUserInfo(ctx));

  bot.on("text", (ctx, next) => {
    if (!["section-change", "group-change"].includes(ctx.getSessionState())) next();
    else if (ctx.getSessionState() === "section-change") processSectionChange(ctx);
    else if (ctx.getSessionState() === "group-change") processGroupChange(ctx);
  });
}

function processSectionChange(ctx: TextContext) {
  const type = ctx.message.text.toLowerCase().trim();

  if (type === "я преподаю") {
    tempInfoStorage[ctx.userId] = { type: "teacher" };
    ctx.setSessionState("group-change");
    ctx.reply("Введите вашу фамилию", Markup.removeKeyboard()).then();
    return;
  }

  const typeAsNumber: number = parseInt(type);
  if (!Number.isNaN(typeAsNumber) && typeAsNumber > 0 && typeAsNumber <= 11) {
    tempInfoStorage[ctx.userId] = { type: "student", grade: type };
    ctx.setSessionState("group-change");
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

function processGroupChange(ctx: TextContext) {
  let group = ctx.message.text.toLowerCase().trim();

  if (tempInfoStorage[ctx.userId].type === "student") {
    group = tempInfoStorage[ctx.userId].grade + group;
    if (encodeGroup(group, "student")) {
      logUserPropChange(ctx.userId, "group", group);
      setUserInfo(ctx.userId, {
        type: "student",
        group: encodeGroup(group, "student"),
        name: ctx.from?.first_name,
      }).then(() => {
        ctx.setSessionState("normal");
        ctx.reply("Отлично! Вот твоё расписание:", defaultKeyboard)
          .then(() => replyWithTimetableForDelta(ctx, isTodaySunday() ? 1 : 0));
      });
    } else ctx.reply("Некорректный класс! Повтори ввод").then();
  } else if (tempInfoStorage[ctx.userId].type === "teacher") {
    const t = searchForTeacher(group);
    if (t) {
      logUserPropChange(ctx.userId, "group", t.fullName);
      setUserInfo(ctx.userId, {
        type: "teacher",
        group: t.code,
        name: ctx.from?.first_name,
      }).then(() => {
        ctx.setSessionState("normal");
        ctx.reply(`Отлично! Распознаю вас как ${t.fullName} Вот ваше расписание:`, defaultKeyboard)
          .then(() => replyWithTimetableForDelta(ctx, isTodaySunday() ? 1 : 0));
      });
    } else ctx.reply("Преподаватель не найден! Повторите ввод").then();
  }
}

export function changeUserInfo(ctx: CustomContext): void {
  getUserInfo(ctx.userId).then(userInfo => {
    if (userInfo && userInfo.isLimitedInGroupChange === true)
      ctx.reply(`Оу! Вы изменили группу расписания слишком много раз. Теперь она зафиксирована как ${decodeGroup(userInfo)}`).then();
    else {
      ctx.reply("В каком классе вы учитесь?", userSectionKeyboard).then();
      ctx.setSessionState("section-change");
    }
  });
}
