import { Markup } from "telegraf";
import { CallbackQuery } from "typegram/callback";
import { CustomContext, Telegraf } from "../app";

const minutesCycle = ["00", "15", "30", "45"];
const hoursCycle = [
  "00", "01", "02", "03", "04", "05", "06", "07", "08", "09",
  "10", "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "20", "21", "22", "23"];

export const userClocksStorage: Record<string, string> = {};

export function getTimePickerKeyboard(time: string[]) {
  return Markup.inlineKeyboard([
    getCycleButtons("up"),
    [{ text: time[0], callback_data: `ignore-${getRandomInt()}` }, { text: time[1], callback_data: `ignore-${getRandomInt()}` }],
    getCycleButtons("down"),
  ]);

  function getCycleButtons(dir: "up" | "down") {
    const arrow = dir === "up" ? "⬆️" : "⬇️️";
    const delta = dir === "up" ? 1 : -1;
    return [
      { text: arrow, callback_data: `tp--set-${cycleFromArray(hoursCycle, time[0], delta)}-${time[1]}` },
      { text: arrow, callback_data: `tp--set-${time[0]}-${cycleFromArray(minutesCycle, time[1], delta)}` },
    ];
  }
}

export function bindTimePicker(bot: Telegraf) {
  bot.on("callback_query", (ctx, next) => {
    const callbackData = (ctx.callbackQuery as CallbackQuery.DataCallbackQuery).data;
    if (!callbackData.startsWith("tp--")) next();
    else ctx.answerCbQuery()
      .then(() => ctx.editMessageReplyMarkup(adjustTimePickerKeyboard(ctx, callbackData).reply_markup));
  });
}

function adjustTimePickerKeyboard(ctx: CustomContext, action: string): ReturnType<typeof Markup.inlineKeyboard> {
  const time = action.split("--set-")[1].split("-");
  userClocksStorage[ctx.userId] = time.join(":");
  return getTimePickerKeyboard(time);
}

function cycleFromArray<T>(arr: T[], item: T, delta: number): T {
  const i = arr.indexOf(item);
  if (i === -1) return item;
  const n = i + delta;
  if (n === -1) return arr[arr.length - 1];
  if (n === arr.length) return arr[0];
  return arr[n];
}

function getRandomInt(): string {
  return Math.floor(Math.random() * 9999999).toString();
}
