import schedule from "node-schedule";
import { getFullUserInfo,
  getUserInfo,
  getUsersCount,
  setUserInfo } from "./user-service";
import { getTimetableForDelta } from "./timetable-service";
import { broadcastMessage, sendMessageToAdmin } from "./broadcast-service";
import { logAdminEvent } from "./analytics-service";
import { Telegraf } from "../app";
import { db } from "./db";

// eslint-disable-next-line import/prefer-default-export
export function initNotificationsService(bot: Telegraf): void {
  if (process.env.NODE_ENV === "development") return;
  schedule.scheduleJob({ minute: [0, 15, 30, 45] },
    fireTime => sendNotifications(bot, `${timeToString(fireTime.getHours())}:${timeToString(fireTime.getMinutes())}`));
}

function timeToString(v: number): string {
  if (v === 0) return "00";
  if (v < 10) return `0${v}`;
  return v.toString();
}

export function setUserNotificationTime(userId: string, newTime: string): Promise<void> {
  return getUserInfo(userId).then(userInfo => (userInfo.notificationsTime
    ? db("notifications_heap").child(`${userInfo.notificationsTime}/${userId}`).remove()
    : Promise.resolve())
    .then(() => db("notifications_heap").child(`${newTime}/${userId}`).set(true))
    .then(() => setUserInfo(userId, { notificationsTime: newTime })));
}

function sendNotifications(bot: Telegraf, time: string): void {
  let mutatedNum = 0;
  console.log(`Sending timed notifications (at ${time})`);
  getUsersFromTimeHeap(time)
    .then(userIds => Promise.all(userIds.map(userId => getFullUserInfo(userId))))
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

function getUsersFromTimeHeap(time: string): Promise<string[]> {
  return db("notifications_heap").child(time).once("value")
    .then(snap => (snap.val() ? Object.keys(snap.val()) : []));
}
