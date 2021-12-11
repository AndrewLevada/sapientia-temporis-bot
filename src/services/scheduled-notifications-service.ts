import { database } from "firebase-admin";
import Database = database.Database;
import Reference = database.Reference;
import { usersRef } from "./user-service";

interface InnerScheduledNotification {
  timetableType: "today" | "tomorrow",
  isExchangesOnly: boolean;
}

export interface ScheduledNotification extends InnerScheduledNotification {
  userId: string;
  hour: string;
  minute: string;
}

let scheduledNotificationRef!: Reference;

export function init() {
  const db: Database = database();
  scheduledNotificationRef = db.ref("scheduledNotifications");
}

export function getScheduledNotificationsForTime(hour: string, minute: string): Promise<ScheduledNotification[]> {
  return scheduledNotificationRef.child(`${hour}_${minute}`).once("value")
    .then(snap => snap.val())
    .then(v => Object.entries(v))
    .then(arr => arr.map(o => ({ userId: o[0], hour, minute, ...o[1] as InnerScheduledNotification })));
}

export function getUserScheduledNotification(userId: string): Promise<ScheduledNotification> {
  return getScheduledNotificationLocation(userId)
    .then(location => scheduledNotificationRef.child(`${location}/${userId}`).once("value"))
    .then(snap => ({ userId, ...snap.val() }) as ScheduledNotification);
}

export function setScheduledNotification(config: ScheduledNotification): Promise<void> {
  const newLocation = `${config.hour}_${config.minute}`;
  return getScheduledNotificationLocation(config.userId)
    .then(location => Promise.all([
      scheduledNotificationRef.child(`${location}/${config.userId}`).remove(),
      usersRef.child(`${config.userId}/scheduledNotificationLocation`).set(newLocation),
    ]))
    .then(() => scheduledNotificationRef.child(`${newLocation}/${config.userId}`).set({
      timetableType: config.timetableType, isExchangesOnly: config.isExchangesOnly,
    }));
}

function getScheduledNotificationLocation(userId: string): Promise<string> {
  return usersRef.child(`${userId}/scheduledNotificationLocation`).once("value")
    .then(snap => snap.val());
}
