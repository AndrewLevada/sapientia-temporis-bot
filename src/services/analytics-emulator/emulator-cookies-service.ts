import { db } from "../db";

export function getUserCookies(userId: string): Promise<string | null> {
  return db("emulatorCookies").child(userId).once("value").then(snap => snap.val() || null);
}

export function setUserCookies(userId: string, cookies: any): Promise<void> {
  return db("emulatorCookies").child(userId).set(cookies);
}
