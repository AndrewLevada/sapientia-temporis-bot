import { Context, Markup, Telegraf } from "telegraf";
import { sessions, setUserSessionState } from "./env";
import { reportFeedback } from "../services/feedback-service";
import { defaultKeyboard } from "./general";
import { logEvent } from "../services/analytics-service";
import { getUserIdFromCtx } from "../utils";
import texts from "./texts";

const feedbackKeyboard = Markup.keyboard([[texts.keys.feedback.cancel]]).resize();

// eslint-disable-next-line import/prefer-default-export
export function bindFeedback(bot: Telegraf) {
  bot.hears(texts.keys.settings.feedback, ctx => {
    const userId = getUserIdFromCtx(ctx as Context);
    logEvent(userId, "feedback_open");
    setUserSessionState(userId, "feedback");
    ctx.reply(texts.res.feedback.intro, feedbackKeyboard);
  });

  bot.on("text", (ctx, next) => {
    const userId: string = ctx.message.chat.id.toString();
    if (!sessions[userId] || sessions[userId].state !== "feedback") next();
    else if (ctx.message.text.toLowerCase().trim() === "отмена") {
      setUserSessionState(userId, "normal");
      ctx.reply(texts.res.feedback.cancel, defaultKeyboard);
    } else reportFeedback(bot, userId, ctx.message.from.first_name, ctx.message.text).then(() => {
      logEvent(userId, "feedback_sent");
      setUserSessionState(userId, "normal");
      ctx.reply(texts.res.feedback.thanks, defaultKeyboard);
    });
  });
}
