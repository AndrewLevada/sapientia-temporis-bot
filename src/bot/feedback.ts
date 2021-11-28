import { Markup, Telegraf } from "telegraf";
import { CallbackQuery } from "typegram/callback";
import { sessions, setUserSessionState } from "./env";
import { reportFeedback } from "../services/feedback-service";
import { defaultKeyboard } from "./general";

const feedbackKeyboard = Markup.keyboard([["Отмена"]]).resize();

// eslint-disable-next-line import/prefer-default-export
export function bindFeedback(bot: Telegraf) {
  bot.on("callback_query", (ctx, next) => {
    if ((ctx.callbackQuery as CallbackQuery.DataCallbackQuery).data === "feedback") {
      setUserSessionState(ctx.callbackQuery.from.id.toString(), "feedback");
      ctx.reply("Спасибо, что решили оставить обратную связь. Опишите впечатления от использования, проблемы или предложения новых функций. Чтобы отменить отправку обратной связи напишите \"Отмена\"", feedbackKeyboard);
    } else next();
  });

  bot.on("text", (ctx, next) => {
    const userId: string = ctx.message.chat.id.toString();
    if (!sessions[userId] || sessions[userId].state !== "feedback") next();
    else if (ctx.message.text.toLowerCase().trim() === "отмена") {
      setUserSessionState(userId, "normal");
      ctx.reply("Отменяю отправку обратной связи", defaultKeyboard);
    } else reportFeedback(userId, ctx.message.text).then(() => {
      setUserSessionState(userId, "normal");
      ctx.reply("Ок, ваша обратная связь сохранена. Спасибо за уделённое время :)", defaultKeyboard);
    });
  });
}
