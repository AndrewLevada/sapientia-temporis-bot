import { database } from "firebase-admin";
import Reference = database.Reference;
import Database = database.Database;

let cookiesRef!: Reference;

export function init() {
  const db: Database = database();
  cookiesRef = db.ref("emulatorCookies");
}

export function getUserCookies(userId: string): Promise<any[] | null> {
  return cookiesRef.child(userId).once("value").then(snap => (snap.val() ? JSON.parse(snap.val()) : null));
}

export function setUserCookies(userId: string, cookies: any): Promise<void> {
  return cookiesRef.child(userId).set(JSON.stringify(cookies));
}
