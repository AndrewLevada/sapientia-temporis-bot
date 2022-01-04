import schedule from "node-schedule";
import { getUsersCount, getUsersWithExchangeNotificationsOn, UserInfo } from "./user-service";
import { getTimetableForDelta } from "./timetable-service";
import { broadcastMessage, sendMessageToAdmin } from "./broadcast-service";
import { logAdminEvent } from "./analytics-service";
import { Telegraf } from "../app";

// eslint-disable-next-line import/prefer-default-export
export function initExchangeNotificationsService(bot: Telegraf): void {
  if (process.env.NODE_ENV === "development") return;
  schedule.scheduleJob("0 15 * * *", () => sendAllExchangeNotifications(bot)); // Shift by -3 hours because server is at UTC
}

function sendAllExchangeNotifications(bot: Telegraf): void {
  let mutatedNum = 0;
  getUsersWithExchangeNotificationsOn()
    .then(users => Object.entries<UserInfo>(users).map(v => ({ userId: v[0], ...v[1] })))
    .then(users => Promise.all(users.map<Promise<void>>(user => getTimetableForDelta(user, 1).then(({ wasMutated }) => {
      if (wasMutated) {
        mutatedNum++;
        return broadcastMessage(bot, { type: "userId", value: user.userId }, "Проверьте расписание, завтра у вас замена!", false, true).then();
      }
      return Promise.resolve();
    }))).then(() => getUsersCount()).then(totalUsers => {
      if (mutatedNum !== 0) logAdminEvent("broadcast", { text: "Уведомления о заменах" });
      return sendMessageToAdmin(bot, `Отправка уведомлений о заменах окончена. Статус: ${totalUsers}/${users.length}/${mutatedNum}`);
    }));
}
