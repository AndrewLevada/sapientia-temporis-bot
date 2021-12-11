import { Telegraf } from "telegraf";
import * as admin from "firebase-admin";
import * as Sentry from "@sentry/node";
import { CallbackQuery } from "typegram";
import { init as initTimetableService } from "./services/timetable-service";
import { init as initFeedbackService } from "./services/feedback-service";
import { init as initErrorReportingService } from "./services/error-reporting-service";
import { init as initEmulatorCookiesService } from "./services/analytics-emulator/emulator-cookies-service";
import { init as initUserService } from "./services/user-service";
import { init as initScheduledNotificationsService } from "./services/scheduled-notifications-service";
import { bindUserInfoChange } from "./bot/user-info-change";
import { bindTimetable } from "./bot/timetable";
import { bindAdmin } from "./bot/admin";
import { bindLeaderboard } from "./bot/leaderboard";
import { bindGeneral, defaultKeyboard } from "./bot/general";
import { bindFeedback } from "./bot/feedback";
import { startAnalyticsPageServer } from "./services/analytics-emulator/server";
import { startAnalyticsBrowserEmulator } from "./services/analytics-emulator/browser-emulator";
import { logEvent } from "./services/analytics-service";
import "@sentry/tracing";
import { getUserIdFromCtx } from "./utils";
import { bindScheduledNotifications } from "./bot/scheduledNotifications";
import { bindTimePicker } from "./bot/time-picker";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.8,
});

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG as string, "base64").toString("ascii"))),
  databaseURL: process.env.FIREBASE_DATABASE_URL as string,
});

initErrorReportingService();
initTimetableService();
initUserService();
initFeedbackService();
initEmulatorCookiesService();
initScheduledNotificationsService();
startAnalyticsPageServer()
  .then(startAnalyticsBrowserEmulator)
  .then(startBot);

function startBot() {
  const bot = new Telegraf(process.env.API_KEY as string);
  bindBot(bot);
  bot.launch().then(() => {
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  });
}

function bindBot(bot: Telegraf) {
  bot.use((ctx, next) => {
    Sentry.setUser({ id: getUserIdFromCtx(ctx) });
    next().then();
  });

  bindGeneral(bot);
  bindUserInfoChange(bot);
  bindTimetable(bot);
  bindLeaderboard(bot);
  bindFeedback(bot);
  bindTimePicker(bot);
  bindScheduledNotifications(bot);
  bindAdmin(bot);

  bot.on("text", ctx => {
    logEvent(ctx, "unrecognized", { text: ctx.message.text });
    ctx.reply("Для получения информации /help", defaultKeyboard);
  });

  bot.on("callback_query", ctx => {
    const text = (ctx.callbackQuery as CallbackQuery.DataCallbackQuery).data;
    if (text !== "ignore") logEvent(ctx, "unrecognized", { text });
    ctx.answerCbQuery();
  });
}
