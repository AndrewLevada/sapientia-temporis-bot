/* eslint-disable function-call-argument-newline */
import schedule from "node-schedule";
import { getFullUserInfo,
  getUserInfo,
  getUsersCount, getUsersWithNotificationsOn,
  setUserInfo } from "./user-service";
import { getTimetableForDelta } from "./timetable-service";
import { broadcastMessage, sendMessageToAdmins } from "./broadcast-service";
import { Telegraf } from "../app";
import { db } from "./db";
import { defaultNotificationTime } from "../bot/notifications";
import texts from "../bot/texts";
import { admins } from '../env';

// eslint-disable-next-line import/prefer-default-export
export function initNotificationsService(bot: Telegraf): void {
  if (process.env.NODE_ENV === "development") return;
  schedule.scheduleJob({ minute: [0, 15, 30, 45], tz: "Europe/Moscow" },
    fireTime => sendNotifications(bot, `${timeToString(fireTime.getHours())}:${timeToString(fireTime.getMinutes())}`));
}

function timeToString(v: number): string {
  if (v === 0) return "00";
  if (v < 10) return `0${v}`;
  return v.toString();
}

export function setUserNotificationTime(userId: string, newTime: string | null): Promise<void> {
  return getUserInfo(userId).then(userInfo => (userInfo.notificationsTime
    ? db("notifications_heap").child(`${userInfo.notificationsTime}/${userId}`).remove()
    : Promise.resolve())
    .then(() => {
      // eslint-disable-next-line max-len
      if (!newTime) return setUserInfo(userId, { doNotifyAboutExchanges: false, notificationsTime: defaultNotificationTime });
      return db("notifications_heap").child(`${newTime}/${userId}`).set(true)
        .then(() => setUserInfo(userId, { doNotifyAboutExchanges: true, notificationsTime: newTime }));
    }));
}

function sendNotifications(bot: Telegraf, time: string): void {
  let mutatedNum = 0;
  getUsersFromTimeHeap(time)
    .then(userIds => Promise.all(userIds.map(userId => getFullUserInfo(userId))))
    .then(users => {
      if (users.length === 0) return;
      Promise.all(users.map<Promise<void>>(user => getTimetableForDelta(user, getDeltaFromTime(time))
        .then(({ wasMutated }) => {
          if (wasMutated) {
            mutatedNum++;
            return broadcastMessage(bot,
              { type: "userId", value: user.userId },
              texts.res.notifications.exchangeMessage[getDeltaFromTime(time) === 0 ? "today" : "tomorrow"], false, true).then();
          }
          return Promise.resolve();
        }))).then(() => getUsersCount()).then(totalUsers => {
        console.log(`Sent timed notifications (at ${time}) with ${totalUsers}/${users.length}/${mutatedNum}`);
        if (mutatedNum === 0) return;
        sendMessageToAdmins(bot, texts.res.notifications.adminUpdate(
          time,
          [totalUsers, users.length, mutatedNum]),
          admins.filter(u => !!u.notificationsPing).map(u => u.userId),
        ).then();
      });
    });
}

function getUsersFromTimeHeap(time: string): Promise<string[]> {
  return db("notifications_heap").child(time).once("value")
    .then(snap => (snap.val() ? Object.keys(snap.val()) : []))
    .then(heap => {
      if (time === defaultNotificationTime)
        return getUsersWithNotificationsOn().then(users => Object.entries(users)
          .filter(v => !v[1].notificationsTime)
          .map(v => v[0]).concat(heap));
      return heap;
    });
}

function getDeltaFromTime(time: string): number {
  return Number.parseInt(time.split(":")[0]) >= 12 ? 1 : 0;
}
