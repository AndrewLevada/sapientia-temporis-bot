import { Context, Telegraf } from "telegraf";
import * as admin from "firebase-admin";
import { init as initTimetableService } from "./services/timetable-service";
import { init as initFeedbackService } from "./services/feedback-service";
import { getUserIdFromCtx } from "./utils";
import { init as initUserService } from "./services/user-service";
import { logPageView } from "./services/analytics-service";
import { bindUserInfoChange } from "./bot/user-info-change";
import { adminUsername } from "./bot/env";
import { bindTimetable } from "./bot/timetable";
import { bindAdmin } from "./bot/admin";
import { bindLeaderboard } from "./bot/leaderboard";
import { bindGeneral, defaultKeyboard } from "./bot/general";
import { bindFeedback } from "./bot/feedback";

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG as string, "base64").toString("ascii"))),
  databaseURL: process.env.FIREBASE_DATABASE_URL as string,
});

initTimetableService();
initUserService();
initFeedbackService();

const bot = new Telegraf(process.env.API_KEY as string);
bindBot();
bot.launch().then();

function bindBot() {
  bindTextAnalytics();
  bindGeneral(bot);
  bindUserInfoChange(bot);
  bindTimetable(bot);
  bindLeaderboard(bot);
  bindFeedback(bot);
  bindAdmin(bot);
  bot.on("text", ctx => ctx.reply("Для получения информации /help", defaultKeyboard));
}

function bindTextAnalytics() {
  bot.on("text", (ctx, next) => {
    if (ctx.message.from.username !== adminUsername) logPageView({
      userId: getUserIdFromCtx(ctx as Context),
      title: ctx.message.text,
      url: "/text",
    });
    next();
  });
}
