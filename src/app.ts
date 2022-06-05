import { Context, Telegraf as GenericTelegraf } from "telegraf";
import * as admin from "firebase-admin";
import * as Sentry from "@sentry/node";
import { CallbackQuery, Message } from "typegram";
import telegrafThrottler from "telegraf-throttler";
import Bottleneck from "bottleneck";
import express from "express";
import { initialFetchUsersTop } from "./services/user-service";
import { bindUserInfoChange } from "./bot/user-info-change";
import { bindTimetable } from "./bot/timetable";
import { bindAdmin } from "./bot/admin";
import { bindLeaderboard } from "./bot/leaderboard";
import { bindGeneral, defaultKeyboard } from "./bot/general";
import { bindFeedback } from "./bot/feedback";
import { logEvent } from "./services/analytics-service";
import "@sentry/tracing";
import { bindTimePicker } from "./bot/time-picker";
import { initDatabase } from "./services/db";
import { initTimetableService } from "./services/timetable-service";
import TextMessage = Message.TextMessage;
import { initGroupsService } from "./services/groups-service";
import texts from "./bot/texts";
import { bindNotifications } from "./bot/notifications";
import { initNotificationsService } from "./services/notifications-service";
import { isProduction, productionUrl } from "./env";

console.time("Initialization");

type SessionState = "section-change" | "group-change" | "normal" | "feedback" | "notifications" | "settings" | "notifications_time";
const sessionsStorage: Record<string, SessionState> = {};
export class CustomContext extends Context {
  public userId!: string;

  public getSessionState(): SessionState {
    return sessionsStorage[this.userId] || "normal";
  }

  public setSessionState(state: SessionState): void {
    if (!sessionsStorage[this.userId]) sessionsStorage[this.userId] = state;
    else sessionsStorage[this.userId] = state;
  }
}

export type Telegraf = GenericTelegraf<CustomContext>;

console.time("Sentry Init");

if (process.env.NODE_ENV !== "development") Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.8,
  integrations: [new Sentry.Integrations.Http({ tracing: true })],
});

console.timeEnd("Sentry Init");

process.env.TZ = "Europe/Moscow";

console.time("Firebase Init");

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG as string, "base64").toString("ascii"))),
  databaseURL: process.env.FIREBASE_DATABASE_URL as string,
});

console.timeEnd("Firebase Init");

console.time("Firebase Startup");
initDatabase();
initTimetableService();
initGroupsService();
console.timeEnd("Firebase Startup");
startBot()
  .then(bot => initNotificationsService(bot))
  .then(() => initialFetchUsersTop());

function startBot(): Promise<Telegraf> {
  console.time("Starting bot");
  const bot = new GenericTelegraf(process.env.TELEGRAM_API_KEY as string, { contextType: CustomContext });

  bot.use(telegrafThrottler({
    in: {
      highWater: 1,
      maxConcurrent: 1,
      minTime: 1200,
      strategy: Bottleneck.strategy.OVERFLOW,
    },
    out: {
      minTime: 20,
      reservoir: 200,
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 2000,
    },
    inThrottlerError: ctx => {
      console.log(`Message from ${(ctx.from || ctx.chat)?.id} dropped by throttler.`);
      return Promise.resolve();
    },
  }));

  startExpress(bot);
  bindBot(bot);

  console.timeEnd("Starting bot");

  return (isProduction()
    ? bot.telegram.setWebhook(`${productionUrl}/${bot.secretPathComponent()}`)
    : bot.launch())
    .then(() => {
      console.timeEnd("Initialization");
      console.log("Started bot!");
    })
    .then(() => bot);
}

function bindBot(bot: Telegraf) {
  bot.use((ctx, next) => {
    if (!ctx.from) {
      console.log(`Update without .from - ignoring (${JSON.stringify(ctx?.chat)})`);
      return;
    }

    const userId = ctx.from.id.toString();
    Sentry.setUser({ id: userId });
    ctx.userId = userId;

    if (ctx.message) console.log(`message from ${userId}: ${(ctx.message as TextMessage).text}`);
    else if (ctx.callbackQuery) console.log(`query from ${userId}: ${(ctx.callbackQuery as CallbackQuery).data}`);
    else console.log(`use from ${userId}`);

    next().then();
  });

  bindGeneral(bot);
  bindUserInfoChange(bot);
  bindTimetable(bot);
  bindLeaderboard(bot);
  bindFeedback(bot);
  bindTimePicker(bot);
  bindNotifications(bot);
  bindAdmin(bot);

  bot.on("text", ctx => {
    logEvent(ctx, "unrecognized", { text: ctx.message.text });
    ctx.reply(texts.res.general.unrecognised, defaultKeyboard);
  });

  bot.on("callback_query", ctx => {
    const text = (ctx.callbackQuery as CallbackQuery).data || "ignore";
    if (!text.startsWith("ignore")) logEvent(ctx, "unrecognized", { text });
    ctx.answerCbQuery();
  });
}

function startExpress(bot: Telegraf) {
  const app = express();

  app.get("/", (req, res) => {
    res.send("OK");
  });

  if (isProduction())
    app.use(bot.webhookCallback(`/${bot.secretPathComponent()}`));

  app.listen(process.env.PORT || 443);
}
