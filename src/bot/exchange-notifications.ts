import { Context, Markup, Telegraf } from "telegraf";
import texts from "./texts";
import { logPageView } from "../services/analytics-service";
import { sessions, setUserSessionState } from "./env";
import { getUserIdFromCtx } from "../utils";
import { setUserInfo } from "../services/user-service";
import { settingsKeyboard } from "./general";

export const onOffKeyboard = Markup.keyboard([
  [texts.keys.exchangeNotifications.on], [texts.keys.exchangeNotifications.off],
]).resize();

// eslint-disable-next-line import/prefer-default-export
export function bindExchangeNotifications(bot: Telegraf) {
  bot.hears(texts.keys.settings.scheduledNotifications, ctx => {
    logPageView(ctx, "/exchange_notifications");
    setUserSessionState(getUserIdFromCtx(ctx as Context), "exchange-notifications");
    ctx.reply(texts.res.exchangeNotifications.intro, onOffKeyboard);
  });

  bot.on("text", (ctx, next) => {
    const userId = getUserIdFromCtx(ctx as Context);
    if (!sessions[userId] || sessions[userId].state !== "exchange-notifications") {
      next();
      return;
    }

    if (ctx.message.text === "Хочу") setUserInfo(userId, { doNotifyAboutExchanges: true })
      .then(() => ctx.reply(texts.res.exchangeNotifications.on, settingsKeyboard));
    else if (ctx.message.text === "Не хочу") setUserInfo(userId, { doNotifyAboutExchanges: false })
      .then(() => ctx.reply(texts.res.exchangeNotifications.off, settingsKeyboard));
  });
}
