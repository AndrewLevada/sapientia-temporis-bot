import { database } from "firebase-admin";
import Reference = database.Reference;
import Database = database.Database;
import { UserInfo } from "../services/user-service";

// eslint-disable-next-line import/no-mutable-exports
export let usersRef!: Reference;

export function init() {
  const db: Database = database();
  usersRef = db.ref("users");
}

export interface FullUserInfo extends UserInfo {
  userId: string;
}

export function queryUserData(userId: string): void {
  usersRef.child(userId).once("value")
    .then(snap => console.log(JSON.stringify(snap.val())));
}

export function queryUserInfoVersionsReport(): void {
  usersRef.once("value").then(snap => {
    const users: UserInfo[] = Object.values(snap.val());
    const missingData: Record<string, number> = {
      type: 0, group: 0, username: 0, name: 0,
    };

    for (const user of users) {
      if (!user.type) missingData.type++;
      if (!user.group) missingData.group++;
      if (!user.username) missingData.username++;
      if (!user.name) missingData.name++;
    }

    console.log(`Total users: ${users.length}`);
    console.log("Existing fields:");
    for (const i of Object.entries(missingData))
      console.log(`${i[0]}: ${users.length - i[1]}/${users.length}`);
  });
}

export function queryStudentsFromGroup(group: string): void {
  usersRef.once("value").then(snap => {
    const users: FullUserInfo[] = Object.entries<UserInfo>(snap.val()).map(v => ({ userId: v[0], ...v[1] }))
      .filter(v => v.group === group && v.type === "student");
    reportFullUserInfoList(users);
  });
}

export function queryTeacher(group: string): void {
  usersRef.once("value").then(snap => {
    const users: FullUserInfo[] = Object.entries<UserInfo>(snap.val()).map(v => ({ userId: v[0], ...v[1] }))
      .filter(v => v.group === group && v.type === "teacher");
    reportFullUserInfoList(users);
  });
}

function reportFullUserInfoList(users: FullUserInfo[]): void {
  console.log(`Total users: ${users.length}`);
  console.log("People:");
  for (const i of users)
    console.log(`${i.userId}: @${i.username} / ${i.name} ${i.isLimitedInGroupChange ? "limited" : ""}`);
}
