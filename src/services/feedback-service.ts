import { database } from "firebase-admin";
import Reference = database.Reference;
import Database = database.Database;
import { getUserInfo } from "./user-service";
import { inverseGroups, inverseTeachers } from "./groups-service";

let feedbackRef!: Reference;

export function init() {
  const db: Database = database();
  feedbackRef = db.ref("feedback");
}

export function reportFeedback(userId: string, text: string): Promise<void> {
  const now = new Date();
  return getUserInfo(userId).then(userInfo => feedbackRef.child(`${now.valueOf()}_${userId}`)
    .set({
      userId,
      text,
      group: userInfo.type === "student" ? inverseGroups[userInfo.group] : inverseTeachers[userInfo.group],
      type: userInfo.type,
      timestamp: now.toString(),
    }));
}
