import { Context, Markup, Telegraf } from "telegraf";
import { sessions, setUserSessionState } from "./env";
import { reportFeedback } from "../services/feedback-service";
import { defaultKeyboard } from "./general";
import { logEvent } from "../services/analytics-service";
import { getUserIdFromCtx } from "../utils";

const feedbackKeyboard = Markup.keyboard([["Отмена"]]).resize();

// eslint-disable-next-line import/prefer-default-export
export function bindFeedback(bot: Telegraf) {
  bot.hears("✉️ Оставить обратную связь", ctx => {
    const userId = getUserIdFromCtx(ctx as Context);
    logEvent(userId, "feedback_open");
    setUserSessionState(userId, "feedback");
    ctx.reply("Спасибо, что решили оставить обратную связь. Опишите впечатления от использования, проблемы или предложения новых функций. Чтобы отменить отправку обратной связи напишите \"Отмена\"", feedbackKeyboard);
  });

  bot.on("text", (ctx, next) => {
    const userId: string = ctx.message.chat.id.toString();
    if (!sessions[userId] || sessions[userId].state !== "feedback") next();
    else if (ctx.message.text.toLowerCase().trim() === "отмена") {
      setUserSessionState(userId, "normal");
      ctx.reply("Отменяю отправку обратной связи", defaultKeyboard);
    } else reportFeedback(bot, userId, ctx.message.from.first_name, ctx.message.text).then(() => {
      logEvent(userId, "feedback_sent");
      setUserSessionState(userId, "normal");
      ctx.reply("Ок, ваша обратная связь сохранена. Спасибо за уделённое время :)", defaultKeyboard);
    });
  });
}
