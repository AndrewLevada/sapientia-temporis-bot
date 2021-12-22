import { Telegraf } from "telegraf";
import * as admin from "firebase-admin";
import * as Sentry from "@sentry/node";
import { CallbackQuery } from "typegram";
import telegrafThrottler from "telegraf-throttler";
import Bottleneck from "bottleneck";
import { initialFetchUsersTop } from "./services/user-service";
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
import { bindExchangeNotifications } from "./bot/exchange-notifications";
import { bindTimePicker } from "./bot/time-picker";
import { initDatabase } from "./services/db";
import { initTimetableService } from "./services/timetable-service";
import { initExchangeNotificationsService } from "./services/exchange-notifications-service";

if (process.env.NODE_ENV !== "development") Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.8,
  integrations: [new Sentry.Integrations.Http({ tracing: true })],
});

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG as string, "base64").toString("ascii"))),
  databaseURL: process.env.FIREBASE_DATABASE_URL as string,
});

initDatabase();
initTimetableService();
startAnalyticsPageServer()
  .then(startAnalyticsBrowserEmulator)
  .then(initialFetchUsersTop)
  .then(startBot)
  .then(bot => initExchangeNotificationsService(bot));

function startBot(): Promise<Telegraf> {
  const bot = new Telegraf(process.env.API_KEY as string);

  bot.use(telegrafThrottler({
    in: {
      highWater: 1,
      maxConcurrent: 1,
      minTime: 1200,
      strategy: Bottleneck.strategy.OVERFLOW,
    },
    out: {
      minTime: 20,
      reservoir: 100,
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 2000,
    },
    inThrottlerError: ctx => {
      console.log(`Throttle drop of ${getUserIdFromCtx(ctx)}`);
      return Promise.resolve();
    },
  }));

  bindBot(bot);
  return bot.launch().then(() => {
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  }).then(() => bot);
}

function bindBot(bot: Telegraf) {
  bot.use((ctx, next) => {
    if (ctx) Sentry.setUser({ id: getUserIdFromCtx(ctx) });
    else Sentry.setUser({ id: "no-ctx" });
    next().then();
  });

  bindGeneral(bot);
  bindUserInfoChange(bot);
  bindTimetable(bot);
  bindLeaderboard(bot);
  bindFeedback(bot);
  bindTimePicker(bot);
  bindExchangeNotifications(bot);
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
