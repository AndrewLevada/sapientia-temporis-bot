import { Markup } from "telegraf";
import { ReplyKeyboardMarkup } from "typegram";
import { logEvent, logPageView } from "../services/analytics-service";
import { changeUserInfo } from "./user-info-change";
import texts from "./texts";
import { getAdminRole } from "../env";
import { CustomContext, Telegraf } from "../app";
import { getUserInfo } from "../services/user-service";

export const defaultKeyboard = Markup.keyboard([
  [texts.keys.default.today],
  [texts.keys.default.yesterday, texts.keys.default.tomorrow],
  [texts.keys.default.weekDay, texts.keys.default.more],
]).resize();

// eslint-disable-next-line max-len
export function getSettingsKeyboard(ctx: CustomContext, noAdmin?: boolean): Promise<Markup.Markup<ReplyKeyboardMarkup>> {
  return getUserInfo(ctx.userId).then(userInfo => {
    const keys = [];
    keys.push([texts.keys.general.back], [texts.keys.settings.changeGroup]);

    keys.push(userInfo.doNotifyAboutExchanges
      ? [texts.keys.settings.configNotifications]
      : [texts.keys.settings.enableNotifications]);

    keys.push(getAdminRole(ctx.userId)?.adminSettings && !noAdmin
      ? [texts.keys.settings.adminSettings]
      : [texts.keys.settings.feedback]);

    return Markup.keyboard(keys).resize();
  });
}

export function bindGeneral(bot: Telegraf) {
  bot.start((ctx: CustomContext) => {
    logEvent(ctx, "start_command");
    ctx.reply(texts.res.general.start)
      .then(() => ctx.reply(texts.res.general.startTip))
      .then(() => changeUserInfo(ctx as any));
  });

  bot.help(ctx => {
    logEvent(ctx, "help_command");
    ctx.reply(texts.res.general.help);
  });

  bot.command("/settings", ctx => replyWithSettings(ctx, true)); // For debug
  bot.hears(texts.keys.default.oldMore, ctx => replyWithSettings(ctx));
  bot.hears(texts.keys.default.more, ctx => replyWithSettings(ctx));

  bot.hears(texts.keys.general.back, ctx => {
    if (ctx.getSessionState() === "notifications") replyWithSettings(ctx);
    else {
      ctx.setSessionState("normal");
      ctx.reply("ОК", defaultKeyboard);
      logPageView(ctx, "/default");
    }
  });
}

function replyWithSettings(ctx: CustomContext, noAdmin?: boolean) {
  ctx.setSessionState("settings");
  getSettingsKeyboard(ctx, noAdmin).then(keyboard => ctx.reply(texts.res.general.settings, keyboard));
  logPageView(ctx, "/settings");
}
