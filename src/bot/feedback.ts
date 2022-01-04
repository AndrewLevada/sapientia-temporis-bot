import { Markup } from "telegraf";
import { sessions, setUserSessionState } from "./env";
import { reportFeedback } from "../services/feedback-service";
import { defaultKeyboard } from "./general";
import { logEvent } from "../services/analytics-service";
import texts from "./texts";
import { Telegraf } from "../app";

const feedbackKeyboard = Markup.keyboard([[texts.keys.feedback.cancel]]).resize();

// eslint-disable-next-line import/prefer-default-export
export function bindFeedback(bot: Telegraf) {
  bot.hears(texts.keys.settings.feedback, ctx => {
    logEvent(ctx, "feedback_open");
    setUserSessionState(ctx.userId, "feedback");
    ctx.reply(texts.res.feedback.intro, feedbackKeyboard);
  });

  bot.on("text", (ctx, next) => {
    if (!sessions[ctx.userId] || sessions[ctx.userId].state !== "feedback") next();
    else if (ctx.message.text.toLowerCase().trim() === "отмена") {
      setUserSessionState(ctx.userId, "normal");
      ctx.reply(texts.res.feedback.cancel, defaultKeyboard);
    } else reportFeedback(bot, ctx.userId, ctx.message.from.first_name, ctx.message.text).then(() => {
      logEvent(ctx, "feedback_sent");
      setUserSessionState(ctx.userId, "normal");
      ctx.reply(texts.res.feedback.thanks, defaultKeyboard);
    });
  });
}
