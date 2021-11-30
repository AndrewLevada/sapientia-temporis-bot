import { Context, Markup, Telegraf } from "telegraf";
import { logEvent, logPageView } from "../services/analytics-service";
import { changeUserInfo } from "./user-info-change";
import { adminUsername } from "../env";

export const defaultKeyboard = Markup.keyboard([["Сегодня"], ["Вчера", "Завтра"], ["На день недели", "✨ Дополнительно ✨"]]).resize();
const settingsKeyboard = Markup.inlineKeyboard([
  [{ text: "Рейтинг классов", callback_data: "population" }],
  [{ text: "Настроить расписание", callback_data: "group" }],
  [{ text: "Оставить обратную связь", callback_data: "feedback" }],
]);

export function bindGeneral(bot: Telegraf) {
  bot.start((ctx: Context) => {
    logEvent(ctx, "start_command");
    ctx.reply("Доброе утро! Я умею показывать актуальное расписание Лицея 50 при ДГТУ")
      .then(() => changeUserInfo(ctx as any));
  });

  bot.help(ctx => {
    logEvent(ctx, "help_command");
    ctx.reply(`Бот расписаний Лицея 50 при ДГТУ. При возникновении проблем писать @${adminUsername}`);
  });

  bot.hears("✨ Дополнительно", ctx => replyWithSettings(ctx, true)); // Temp
  bot.hears("✨ Дополнительно ✨", ctx => replyWithSettings(ctx, false));
}

function replyWithSettings(ctx: Context, isOldCall: boolean) {
  logPageView(ctx, "/settings");
  if (isOldCall) ctx.reply("Настройки. 🆕 Появилась возможность оставить обратную связь, жду ваш отзыв!", settingsKeyboard).then();
  else ctx.reply("Настройки", settingsKeyboard).then();
}
