import { Markup } from "telegraf";
import texts from "./texts";
import { logPageView, logUserPropChange } from "../services/analytics-service";
import { sessions, setUserSessionState } from "./env";
import { setUserInfo } from "../services/user-service";
import { settingsKeyboard } from "./general";
import { CustomContext, Telegraf } from "../app";

export const onOffKeyboard = Markup.keyboard([
  [texts.keys.exchangeNotifications.on], [texts.keys.exchangeNotifications.off],
]).resize();

// eslint-disable-next-line import/prefer-default-export
export function bindExchangeNotifications(bot: Telegraf) {
  bot.hears(texts.keys.settings.scheduledNotifications, ctx => {
    logPageView(ctx, "/exchange_notifications");
    setUserSessionState(ctx.userId, "exchange-notifications");
    ctx.reply(texts.res.exchangeNotifications.intro, onOffKeyboard);
  });

  bot.on("text", (ctx, next) => {
    if (!sessions[ctx.userId] || sessions[ctx.userId].state !== "exchange-notifications") {
      next();
      return;
    }

    if (ctx.message.text === "Хочу") changeExchangeNotifications(ctx, ctx.userId, true);
    else if (ctx.message.text === "Не хочу") changeExchangeNotifications(ctx, ctx.userId, false);
  });
}

function changeExchangeNotifications(ctx: CustomContext, userId: string, state: boolean): void {
  setUserInfo(userId, { doNotifyAboutExchanges: state })
    .then(() => {
      ctx.reply(texts.res.exchangeNotifications[state ? "on" : "off"], settingsKeyboard).then();
      logUserPropChange(userId, "exchange_notifications", state);
    });
}
