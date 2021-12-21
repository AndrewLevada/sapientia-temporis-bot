// eslint-disable-next-line import/no-extraneous-dependencies
import { Parser } from "json2csv";
import fs from "fs";
import { usersRef } from "./users-query";
import { UserInfo } from "../services/user-service";
import { decodeGroupInUserInfo } from "../utils";

export function createCSVForInterview(usersIds: string[]): void {
  const users: any[] = [];
  Promise.all(usersIds.map(userId => usersRef.child(userId).once("value")
    .then(snap => (snap.val() ? decodeGroupInUserInfo(snap.val() as UserInfo) : Promise.reject()))
    // eslint-disable-next-line max-len
    .then(user => users.push({ Name: user.name, Group: user.group, Type: user.type, Username: user.username, userId }))
    .catch(() => Promise.resolve())))
    .then(() => fs.writeFileSync("interview.csv", new Parser().parse(users)));
}

export function createCSVFromUsersDb(pathToJson: string): void {
  const db = Object.entries(JSON.parse(fs.readFileSync(pathToJson).toString()) as Record<string, UserInfo>);
  const forCsv = db
    .map(o => ([o[0], decodeGroupInUserInfo(o[1])]) as [string, UserInfo])
    .map(o => ({ userId: o[0], crmId: o[0], ...o[1] }));
  fs.writeFileSync("users_db.csv", new Parser().parse(forCsv));
}
