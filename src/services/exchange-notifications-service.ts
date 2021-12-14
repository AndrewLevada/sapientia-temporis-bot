import schedule from "node-schedule";
import { Telegraf } from "telegraf";
import { db } from "./db";
import { getUsersCount, UserInfo } from "./user-service";
import { getTimetableForDelta } from "./timetable-service";
import { broadcastMessage, sendMessageToAdmin } from "./broadcast-service";

// eslint-disable-next-line import/prefer-default-export
export function initExchangeNotificationsService(bot: Telegraf): void {
  if (process.env.NODE_ENV === "development") return;
  schedule.scheduleJob("0 15 * * *", () => sendAllExchangeNotifications(bot)); // Shift by -3 hours because server is at UTC
}

function sendAllExchangeNotifications(bot: Telegraf): void {
  let mutatedNum = 0;
  db("users").orderByChild("doNotifyAboutExchanges").equalTo(true).once("value")
    .then(snap => Object.entries<UserInfo>(snap.val()).map(v => ({ userId: v[0], ...v[1] })))
    .then(users => Promise.all(users.map<Promise<void>>(user => getTimetableForDelta(user, 1).then(({ wasMutated }) => {
      if (wasMutated) {
        mutatedNum++;
        return broadcastMessage(bot, { type: "userId", value: user.userId }, "Проверьте расписание, завтра у вас замена!", false).then();
      }
      return Promise.resolve();
    }))).then(getUsersCount).then(totalUsers => sendMessageToAdmin(bot, `Отправка уведомлений о заменах окончена. Статус: ${totalUsers}/${users.length}/${mutatedNum}`)));
}
