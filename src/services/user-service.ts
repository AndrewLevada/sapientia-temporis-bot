import { BroadcastGroup } from "./broadcast-service";
import { groups, inverseGroups } from "./groups-service";
import { db } from "./db";

let top: Record<string, number> = {};

export interface UserInfo {
  type: UserType;
  group: string;
  name?: string;
  username?: string;
  isLimitedInGroupChange?: boolean;
  doNotifyAboutExchanges?: boolean;
}

export type UserType = "student" | "teacher";

export function setUserInfo(userId: string, info: Partial<UserInfo>): Promise<void> {
  const userRef = db("users").child(userId);

  if (info.name === undefined) delete info.name;
  if (info.username === undefined) delete info.username;

  return userRef.once("value").then(snap => {
    const oldInfo: UserInfo = snap.val();
    if (info.group) {
      if (oldInfo && oldInfo.group && oldInfo.type === "student") removeUserSnapFromTop(oldInfo.group);
      if (info.type === "student") addUserSnapToTop(info.group);
    }
    return userRef.set({ ...oldInfo, ...info });
  });
}

export function getUserInfo(userId: string): Promise<UserInfo> {
  return db("users").child(`${userId}`).get().then(snapshot => snapshot.val());
}

export function getUsersIdsByGroup(group: BroadcastGroup): Promise<string[]> {
  if (group.type === "section") {
    if (group.value === "all") return db("users").once("value").then(v => Object.keys(v.val()));
    return db("users").orderByChild("type").equalTo(group.value.slice(0, -1)).once("value")
      .then(v => Object.keys(v.val()));
  }

  if (group.type === "grade") return db("users").orderByChild("type").equalTo("student").once("value")
    .then(v => Object.entries(v.val())
      .filter(o => inverseGroups[(o[1] as any).group]?.startsWith(group.value))
      .map(o => o[0]));

  if (group.type === "userId") return Promise.resolve([group.value]);

  return db("users").orderByChild("type").equalTo("student").once("value")
    .then(v => Object.entries(v.val()).filter(o => (o[1] as any).group === groups[group.value]).map(o => o[0]));
}

export function getUsersCount(userType?: UserType): Promise<number> {
  if (!userType) return db("users").once("value").then(snapshot => snapshot.numChildren());
  return db("users").orderByChild("type").equalTo(userType).once("value")
    .then(snapshot => snapshot.numChildren());
}

export function getTeachersList(): Promise<string[]> {
  return db("users").orderByChild("type")
    .equalTo("teacher")
    .once("value")
    .then(s => Object.values(s.val()).map(v => (v as UserInfo).group));
}

export function getUsersLeaderboard(): [string, number][] {
  return Object.entries(top).sort((a, b) => b[1] - a[1]);
}

export function getUsersWithExchangeNotificationsOn(): Promise<Record<string, UserInfo>> {
  return db("users").orderByChild("doNotifyAboutExchanges").equalTo(true).once("value")
    .then(snap => snap.val());
}

export function initialFetchUsersTop(): Promise<void> {
  return db("users").orderByChild("type").equalTo("student").once("value")
    .then(snapshot => {
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
