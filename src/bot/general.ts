import { Context, Markup, Telegraf } from "telegraf";
import { logEvent, logPageView } from "../services/analytics-service";
import { changeUserInfo } from "./user-info-change";
import texts from "./texts";

export const defaultKeyboard = Markup.keyboard([
  [texts.keys.default.today],
  [texts.keys.default.yesterday, texts.keys.default.tomorrow],
  [texts.keys.default.weekDay, texts.keys.default.more],
]).resize();

export const settingsKeyboard = Markup.keyboard([
  [texts.keys.settings.back],
  [texts.keys.settings.leaderboard],
  [texts.keys.settings.changeGroup],
  [texts.keys.settings.feedback],
]).resize();

export function bindGeneral(bot: Telegraf) {
  bot.start((ctx: Context) => {
    logEvent(ctx, "start_command");
    ctx.reply(texts.res.general.start).then(() => changeUserInfo(ctx as any));
  });

  bot.help(ctx => {
    logEvent(ctx, "help_command");
    ctx.reply(texts.res.general.help);
  });

  bot.hears(texts.keys.default.oldMore, ctx => replyWithSettings(ctx, true)); // Temp
  bot.hears(texts.keys.default.more, ctx => replyWithSettings(ctx, false));
  bot.hears(texts.keys.settings.back, ctx => ctx.reply("ОК", defaultKeyboard));
}

function replyWithSettings(ctx: Context, isOldCall: boolean) {
  logPageView(ctx, "/settings");
  if (isOldCall) ctx.reply(texts.res.general.settingsOld, settingsKeyboard).then();
  else ctx.reply(texts.res.general.settings, settingsKeyboard).then();
}
