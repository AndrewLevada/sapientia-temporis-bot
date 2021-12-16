import { Context, Markup, Telegraf } from "telegraf";
import { logEvent, logPageView } from "../services/analytics-service";
import { changeUserInfo } from "./user-info-change";
import texts from "./texts";
import { getUserIdFromCtx } from "../utils";
import { adminUserId } from "../env";

export const defaultKeyboard = Markup.keyboard([
  [texts.keys.default.today],
  [texts.keys.default.yesterday, texts.keys.default.tomorrow],
  [texts.keys.default.weekDay, texts.keys.default.more],
]).resize();

export const settingsKeyboard = Markup.keyboard([
  [texts.keys.settings.back],
  [texts.keys.settings.changeGroup],
  [texts.keys.settings.scheduledNotifications],
  [texts.keys.settings.feedback, texts.keys.settings.leaderboard],
]).resize();

export const adminSettingsKeyboard = Markup.keyboard([
  [texts.keys.settings.back],
  [texts.keys.settings.changeGroup],
  [texts.keys.settings.scheduledNotifications],
  [texts.keys.settings.adminSettings],
]).resize();

export function bindGeneral(bot: Telegraf) {
  bot.start((ctx: Context) => {
    logEvent(ctx, "start_command");
    ctx.reply(texts.res.general.start)
      .then(() => ctx.reply(texts.res.general.startTip))
      .then(() => changeUserInfo(ctx as any));
  });

  bot.help(ctx => {
    logEvent(ctx, "help_command");
    ctx.reply(texts.res.general.help);
  });

  bot.command("/settings", ctx => replyWithSettings(ctx));
  bot.hears(texts.keys.default.oldMore, ctx => replyWithSettings(ctx)); // Temp
  bot.hears(texts.keys.default.more, ctx => replyWithSettings(ctx));
  bot.hears(texts.keys.settings.back, ctx => ctx.reply("ОК", defaultKeyboard));
}

function replyWithSettings(ctx: Context) {
  logPageView(ctx, "/settings");
  if (getUserIdFromCtx(ctx) === adminUserId) ctx.reply(texts.res.general.settings, adminSettingsKeyboard).then();
  else ctx.reply(texts.res.general.settings, settingsKeyboard).then();
}
