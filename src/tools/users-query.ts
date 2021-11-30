import { database } from "firebase-admin";
import Reference = database.Reference;
import Database = database.Database;

let usersRef!: Reference;

export function init() {
  const db: Database = database();
  usersRef = db.ref("users");
}

export function queryUserData(userId: string): void {
  usersRef.child(userId).once("value")
    .then(snap => console.log(JSON.stringify(snap.val())));
}
