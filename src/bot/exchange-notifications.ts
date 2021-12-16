import { Context, Markup, Telegraf } from "telegraf";
import texts from "./texts";
import { logPageView, logUserPropChange } from "../services/analytics-service";
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

    if (ctx.message.text === "Хочу") changeExchangeNotifications(ctx, userId, true);
    else if (ctx.message.text === "Не хочу") changeExchangeNotifications(ctx, userId, false);
  });
}

function changeExchangeNotifications(ctx: Context, userId: string, state: boolean): void {
  setUserInfo(userId, { doNotifyAboutExchanges: state })
    .then(() => {
      ctx.reply(texts.res.exchangeNotifications[state ? "on" : "off"], settingsKeyboard).then();
      logUserPropChange(userId, "exchange_notifications", state);
    });
}
