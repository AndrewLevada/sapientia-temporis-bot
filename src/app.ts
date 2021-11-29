import { Context, Telegraf } from "telegraf";
import * as admin from "firebase-admin";
import { init as initTimetableService } from "./services/timetable-service";
import { init as initFeedbackService } from "./services/feedback-service";
import { init as initEmulatorCookiesService } from "./services/analytics-reporter/emulator-cookies-service";
import { getUserIdFromCtx } from "./utils";
import { init as initUserService } from "./services/user-service";
import { logPageView } from "./services/analytics-service";
import { bindUserInfoChange } from "./bot/user-info-change";
import { bindTimetable } from "./bot/timetable";
import { bindAdmin } from "./bot/admin";
import { bindLeaderboard } from "./bot/leaderboard";
import { bindGeneral, defaultKeyboard } from "./bot/general";
import { bindFeedback } from "./bot/feedback";
import { startAnalyticsPageServer } from "./services/analytics-reporter/server";
import { startAnalyticsBrowserEmulator } from "./services/analytics-reporter/browser-emulator";
import { adminUsername } from "./env";
import { sendMessageToAdmin } from "./services/broadcast-service";

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG as string, "base64").toString("ascii"))),
  databaseURL: process.env.FIREBASE_DATABASE_URL as string,
});

initTimetableService();
initUserService();
initFeedbackService();
initEmulatorCookiesService();
startAnalyticsPageServer()
  .then(startAnalyticsBrowserEmulator)
  .then(startBot);

function startBot() {
  const bot = new Telegraf(process.env.API_KEY as string);
  bindBot(bot);
  bot.launch().then(() => {
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
    process.on("unhandledRejection", reason => sendMessageToAdmin(bot, `⚠️ Unhandled Rejection: \n\n${reason}`));
    process.on("uncaughtException", err => sendMessageToAdmin(bot, `⚠️ Unhandled Exception: \n\n${err}`));
  });
}

function bindBot(bot: Telegraf) {
  bindTextAnalytics(bot);
  bindGeneral(bot);
  bindUserInfoChange(bot);
  bindTimetable(bot);
  bindLeaderboard(bot);
  bindFeedback(bot);
  bindAdmin(bot);
  bot.on("text", ctx => ctx.reply("Для получения информации /help", defaultKeyboard));
}

function bindTextAnalytics(bot: Telegraf) {
  bot.on("text", (ctx, next) => {
    if (ctx.message.from.username !== adminUsername) logPageView({
      userId: getUserIdFromCtx(ctx as Context),
      title: ctx.message.text,
      url: "/text",
    });
    next();
  });
}
