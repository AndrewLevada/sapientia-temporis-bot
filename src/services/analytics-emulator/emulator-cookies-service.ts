import { db } from "../db";

export function getUserCookies(userId: string): Promise<any[] | null> {
  return db("emulatorCookies").child(userId).once("value").then(snap => (snap.val() ? JSON.parse(snap.val()) : null));
}

export function setUserCookies(userId: string, cookies: any): Promise<void> {
  return db("emulatorCookies").child(userId).set(JSON.stringify(cookies));
}
