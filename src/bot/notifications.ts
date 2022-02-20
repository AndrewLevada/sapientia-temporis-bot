import { Markup } from "telegraf";
import texts from "./texts";
import { logPageView, logUserPropChange } from "../services/analytics-service";
import { getUserInfo, setUserInfo } from "../services/user-service";
import { Telegraf } from "../app";
import { getSettingsKeyboard } from "./general";
import { sanitizeTextForMD } from "../utils";
import { getTimePickerKeyboard, userClocksStorage } from "./time-picker";

const defaultNotificationTime = "18:00";

const notificationsKeyboard = Markup.keyboard([
  [texts.keys.general.back],
  [texts.keys.notifications.time],
  [texts.keys.notifications.disable],
]).resize();

// eslint-disable-next-line import/prefer-default-export
export function bindNotifications(bot: Telegraf) {
  bot.hears(texts.keys.settings.enableNotifications, ctx => {
    setUserInfo(ctx.userId, { doNotifyAboutExchanges: true, notificationsTime: defaultNotificationTime }).then(() => {
      ctx.reply(texts.res.notifications.enabled, notificationsKeyboard);
      ctx.setSessionState("notifications");
      logPageView(ctx, "/notifications");
    });
  });

  bot.hears(texts.keys.settings.configNotifications, ctx => {
    getUserInfo(ctx.userId).then(userInfo => {
      ctx.replyWithMarkdownV2(`${sanitizeTextForMD(texts.res.notifications.info)} *${userInfo.notificationsTime || defaultNotificationTime}*`, notificationsKeyboard);
      ctx.setSessionState("notifications");
      logPageView(ctx, "/notifications");
    });
  });

  bot.hears(texts.keys.notifications.time, ctx => getUserInfo(ctx.userId)
    .then(userInfo => {
      ctx.reply(texts.res.notifications.time, getTimePickerKeyboard((userInfo.notificationsTime || defaultNotificationTime).split(":")))
        .then(() => ctx.reply("Когда выберите время, нажмите 'Готово'", Markup.keyboard([[texts.keys.notifications.timeSave]]).resize()));
      ctx.setSessionState("notifications_time");
    }));

  bot.on("text", (ctx, next) => {
    if (ctx.getSessionState() !== "notifications_time") next();
    else {
      const time = userClocksStorage[ctx.userId] || defaultNotificationTime;
      setUserInfo(ctx.userId, { notificationsTime: time }).then();
      ctx.replyWithMarkdownV2(`${sanitizeTextForMD(texts.res.notifications.timeSave)} *${time}*`, notificationsKeyboard);
      ctx.setSessionState("notifications");
      logPageView(ctx, "/notifications");
      logUserPropChange(ctx.userId, "notifications_time", time);
    }
  });

  bot.hears(texts.keys.notifications.disable, ctx => {
    setUserInfo(ctx.userId, { doNotifyAboutExchanges: false, notificationsTime: defaultNotificationTime }).then(() => {
      getSettingsKeyboard(ctx).then(keyboard => ctx.reply(texts.res.notifications.disable, keyboard));
      ctx.setSessionState("settings");
      logPageView(ctx, "/settings");
    });
  });
}
