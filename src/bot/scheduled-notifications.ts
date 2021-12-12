import { Telegraf } from "telegraf";
import texts from "./texts";
import { getDefaultTimePickerKeyboard } from "./time-picker";
import { logEvent } from "../services/analytics-service";

// eslint-disable-next-line import/prefer-default-export
export function bindScheduledNotifications(bot: Telegraf) {
  bot.hears(texts.keys.settings.scheduledNotifications, ctx => {
    logEvent(ctx, "scheduled_notification_change");
    ctx.reply("Буду отправлять расписание каждый день!")
      .then(() => ctx.reply("Выберите время", getDefaultTimePickerKeyboard()));
  });
}
