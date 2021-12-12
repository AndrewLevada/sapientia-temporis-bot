import { Markup, Telegraf } from "telegraf";
import { CallbackQuery } from "typegram/callback";

// NOT USED NOW
// Also not quite really (minutes work, hours don't)

const minutesCycle = ["00", "15", "30", "45"];

export function getDefaultTimePickerKeyboard() {
  return Markup.inlineKeyboard([
    [{ text: "⬆️", callback_data: "tp--up-hours" }, { text: "⬆️", callback_data: "tp--up-minutes" }],
    [{ text: "16", callback_data: "ignore" }, { text: "00", callback_data: "ignore" }],
    [{ text: "⬇️️", callback_data: "tp--down-hours" }, { text: "⬇️️", callback_data: "tp--down-minutes" }],
  ]);
}

export function bindTimePicker(bot: Telegraf) {
  bot.on("callback_query", (ctx, next) => {
    const callbackData = (ctx.callbackQuery as CallbackQuery.DataCallbackQuery).data;
    if (!callbackData.startsWith("tp--")) next();
    else ctx.editMessageReplyMarkup(adjustTimePickerKeyboard(ctx, callbackData).reply_markup)
      .then(() => ctx.answerCbQuery());
  });
}

function adjustTimePickerKeyboard(ctx: any, action: string): ReturnType<typeof Markup.inlineKeyboard> {
  const keyboard = getDefaultTimePickerKeyboard();
  const time = ctx.callbackQuery.message.reply_markup.inline_keyboard[1];
  const delta: number = action.split("--")[1].split("-")[0] === "up" ? 1 : -1;
  const type: "hours" | "minutes" = action.split("--")[1].split("-")[1] as "hours" | "minutes";
  if (type === "minutes") keyboard.reply_markup.inline_keyboard[1][1].text = adjustFromArray(minutesCycle, time[1].text, delta);
  return keyboard;
}

function adjustFromArray<T>(arr: T[], item: T, delta: number): T {
  const i = arr.indexOf(item);
  if (i === -1) return item;
  const n = i + delta;
  if (n >= 0 && n < arr.length) return arr[n];
  if (n === -1) return arr[arr.length - 1];
  if (n === arr.length) return arr[0];
  return item;
}
