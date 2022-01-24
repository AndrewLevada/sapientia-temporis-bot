import { Markup } from "telegraf";
import { CallbackQuery } from "typegram/callback";
import { encodeGroup } from "../services/groups-service";
import { BroadcastGroup, BroadcastGroupType, broadcastMessage } from "../services/broadcast-service";
import { adminUsername } from "../env";
import { logEvent } from "../services/analytics-service";
import texts from "./texts";
import { getExchangeNotificationsReport, getStudentsReport, getTeachersReport } from "../services/reports-service";
import { CustomContext, Telegraf } from "../app";
import { TextContext } from "../utils";

type BroadcastStatus = "none" | "group" | "message" | "confirmation";
const broadcastState: {
  status: BroadcastStatus,
  group: BroadcastGroup | null,
  text: string | null
} = { status: "none", group: null, text: null };

export const adminKeyboard = Markup.keyboard([
  [texts.keys.settings.back],
  ["/broadcast"],
  ["/students_report"],
  ["/teachers_report", "/exchange_notifications_report"],
]).resize();

// eslint-disable-next-line import/prefer-default-export
export function bindAdmin(bot: Telegraf) {
  bot.hears(texts.keys.settings.adminSettings, ctx => ctx.reply("Admin", adminKeyboard));

  bot.command("/students_report", ctx => {
    if (ctx.message.from.username !== adminUsername) return;
    getStudentsReport().then(report => ctx.reply(report));
  });

  bot.command("/teachers_report", ctx => {
    if (ctx.message.from.username !== adminUsername) return;
    getTeachersReport().then(report => ctx.reply(report));
  });

  bot.command("/exchange_notifications_report", ctx => {
    if (ctx.message.from.username !== adminUsername) return;
    getExchangeNotificationsReport().then(report => ctx.reply(report));
  });

  bot.command("/broadcast", ctx => {
    if (ctx.message.from.username !== adminUsername) return;
    broadcastState.status = "group";
    ctx.reply("Хорошо, Перехожу в режим трансляции. Введите название группы для трансляции (10a, 10, students, teachers, all, userId, userIdList), cancel для отмены.");
  });

  bot.on("text", (ctx, next) => {
    if (ctx.message.from.username !== adminUsername || broadcastState.status === "none") next();
    else if (broadcastState.status === "group") processBroadcastGroup(ctx);
    else if (broadcastState.status === "message") processBroadcastMessage(ctx);
    else if (broadcastState.status === "confirmation") processBroadcastConfirmation(bot, ctx);
    else next();
  });

  bot.on("callback_query", (ctx, next) => {
    if ((ctx.callbackQuery as CallbackQuery.DataCallbackQuery).data === "broadcast_response") {
      logEvent(ctx, "broadcast_response");
      ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
        [{ text: "❤️", callback_data: "ignore" }],
      ]).reply_markup);
    } else next();
  });
}

function processBroadcastGroup(ctx: TextContext) {
  let group = ctx.message.text.toLowerCase();
  if (group === "cancel") {
    cancelBroadcast(ctx);
    return;
  }

  let groupType: BroadcastGroupType | null = null;
  if (["all", "students", "teachers"].includes(group)) groupType = "section";
  else if (["5", "6", "7", "8", "9", "10", "11"].includes(group)) groupType = "grade";
  else if (!Number.isNaN(parseInt(group)) && parseInt(group) > 10 ** 4) groupType = "userId";
  else if (group.startsWith("[") && group.endsWith("]")) {
    groupType = "userIdList";
    group = group.substring(1, group.length - 1);
  } else if (encodeGroup(group, "student")) groupType = "group";

  if (groupType) {
    broadcastState.status = "message";
    broadcastState.group = { type: groupType, value: group };
    ctx.reply(`Группа (${group} as ${groupType}) определена. Теперь введите сообщение для трансляции`).then();
  } else ctx.reply(`Некорректная группа (${group}). Повторите ввод`).then();
}

function processBroadcastMessage(ctx: TextContext) {
  const { text } = ctx.message;
  if (text.toLowerCase() === "cancel" || text.length === 0) {
    cancelBroadcast(ctx);
    return;
  }

  broadcastState.status = "confirmation";
  broadcastState.text = text;
  ctx.reply("Точно отправить сообщение? (Yes для подтверждения)");
}

function processBroadcastConfirmation(bot: Telegraf, ctx: TextContext) {
  const text = ctx.message.text.toLowerCase();
  if (text.toLowerCase() === "yes" && broadcastState.group && broadcastState.text) {
    broadcastState.status = "none";
    ctx.reply("Хорошо, отправляю сообщения...")
      .then(() => broadcastMessage(bot, broadcastState.group!, broadcastState.text!, true))
      .then(status => ctx.reply(`Готово, сообщения отправленны: ${status}`));
  } else cancelBroadcast(ctx);
}

function cancelBroadcast(ctx: CustomContext) {
  broadcastState.status = "none";
  broadcastState.group = null;
  broadcastState.text = null;
  ctx.reply("Выхожу из режима трансляции");
}
