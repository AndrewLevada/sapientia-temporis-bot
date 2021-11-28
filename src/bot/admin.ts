import { Context, Telegraf } from "telegraf";
import { getTeachersList } from "../services/user-service";
import { groups, inverseTeachers } from "../services/groups-service";
import { broadcastMessage, SpecialBroadcastGroup, specialBroadcastGroupStrings } from "../services/broadcast-service";
import { adminUsername } from "../env";

type TextContext = Context & { message: { text: string } };

type BroadcastStatus = "none" | "group" | "message" | "confirmation";
const broadcastState: {
  status: BroadcastStatus,
  group: SpecialBroadcastGroup | string | null,
  text: string | null
} = { status: "none", group: null, text: null };

// eslint-disable-next-line import/prefer-default-export
export function bindAdmin(bot: Telegraf) {
  bot.command("/teachers", ctx => {
    if (ctx.message.from.username !== adminUsername) return;
    getTeachersList().then(l => ctx.reply(l.map(v => inverseTeachers[v]).join("\n")));
  });

  bot.command("/broadcast", ctx => {
    if (ctx.message.from.username !== adminUsername) return;
    broadcastState.status = "group";
    ctx.reply("Хорошо, Перехожу в режим трансляции. Введите название группы для трансляции (10a, 10, students, teachers, all), cancel для отмены.");
  });

  bot.on("text", (ctx, next) => {
    if (ctx.message.from.username !== adminUsername || broadcastState.status === "none") next();
    else if (broadcastState.status === "group") processBroadcastGroup(ctx);
    else if (broadcastState.status === "message") processBroadcastMessage(ctx);
    else if (broadcastState.status === "confirmation") processBroadcastConfirmation(bot, ctx);
  });
}

function processBroadcastGroup(ctx: TextContext) {
  const group = ctx.message.text.toLowerCase();
  if (group === "cancel") {
    cancelBroadcast(ctx);
    return;
  }

  if (specialBroadcastGroupStrings.includes(group) || groups[group]) {
    broadcastState.status = "message";
    broadcastState.group = group;
    ctx.reply(`Группа (${group}) определена. Теперь введите сообщение для трансляции`);
  } else ctx.reply(`Некорректная группа (${group}). Повторите ввод`);
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
      .then(() => broadcastMessage(bot, broadcastState.group!, broadcastState.text!))
      .then(status => ctx.reply(`Готово, сообщения отправленны: ${status}`));
  } else cancelBroadcast(ctx);
}

function cancelBroadcast(ctx: Context) {
  broadcastState.status = "none";
  broadcastState.group = null;
  broadcastState.text = null;
  ctx.reply("Выхожу из режима трансляции");
}
