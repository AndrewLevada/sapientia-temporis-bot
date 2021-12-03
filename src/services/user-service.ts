import { database } from "firebase-admin";
import Database = database.Database;
import Reference = database.Reference;
import { SpecialBroadcastGroup } from "./broadcast-service";
import { inverseGroups } from "./groups-service";

let usersRef!: Reference;

let top: Record<string, number> = {};

export function init() {
  const db: Database = database();
  usersRef = db.ref("users");
  fetchUsersTop().then();
}

export interface UserInfo {
  type: UserType;
  group: string;
  name?: string;
  username?: string;
  isLimitedInGroupChange?: boolean;
}

export type UserType = "student" | "teacher";

export function setUserInfo(userId: string, info: UserInfo): Promise<void> {
  const userRef = usersRef.child(userId);

  if (info.name === undefined) delete info.name;
  if (info.username === undefined) delete info.username;

  return userRef.once("value").then(snap => {
    const oldInfo: UserInfo = snap.val();
    if (oldInfo && oldInfo.group && oldInfo.type === "student") removeUserSnapFromTop(oldInfo.group);
    if (info.type === "student") addUserSnapToTop(info.group);
    return userRef.set({ ...oldInfo, ...info });
  });
}

export function getUserInfo(userId: string): Promise<UserInfo> {
  return usersRef.child(`${userId}`).get().then(snapshot => snapshot.val());
}

export function getUsersIdsByGroup(group: SpecialBroadcastGroup | string): Promise<string[]> {
  if (group === "all") return usersRef.once("value").then(v => Object.keys(v.val()));

  if (group === "students" || group === "teachers")
    return usersRef.orderByChild("type").equalTo(group.slice(0, -1))
      .once("value").then(v => Object.keys(v.val()));

  if (["5", "6", "7", "8", "9", "10", "11"].includes(group))
    return usersRef.orderByChild("type").equalTo("student").once("value")
      .then(v => Object.entries(v.val())
        .filter(o => inverseGroups[(o[1] as any).group]?.startsWith(group))
        .map(o => o[0]));

  return usersRef.orderByChild("type").equalTo("student").once("value")
    .then(v => Object.entries(v.val()).filter(o => (o[1] as any).group === group).map(o => o[0]));
}

export function getUsersCount(): Promise<number> {
  return usersRef.once("value").then(snapshot => snapshot.numChildren());
}

export function getTeachersList(): Promise<string[]> {
  return usersRef.orderByChild("type")
    .equalTo("teacher")
    .once("value")
    .then(s => Object.values(s.val()).map(v => (v as UserInfo).group));
}

export function getUsersLeaderboard(): [string, number][] {
  return Object.entries(top).sort((a, b) => b[1] - a[1]);
}

function fetchUsersTop(): Promise<void> {
  return usersRef.orderByChild("type").equalTo("student").once("value").then(snapshot => {
    top = {};
    snapshot.forEach(s => addUserSnapToTop(s.val().group));
  });
}

function addUserSnapToTop(group: string): void {
  if (top[group]) top[group] += 1;
  else top[group] = 1;
}

function removeUserSnapFromTop(group: string): void {
  if (top[group]) top[group] -= 1;
  if (top[group] === 0) delete top[group];
}
