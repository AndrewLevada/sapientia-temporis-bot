// eslint-disable-next-line import/no-extraneous-dependencies
import { Parser } from "json2csv";
import { writeFileSync } from "fs";
import { usersRef } from "./users-query";
import { decodeGroup } from "../services/groups-service";

// eslint-disable-next-line import/prefer-default-export
export function createCSVForInterview(usersIds: string[]): void {
  const users: any[] = [];
  Promise.all(usersIds.map(userId => usersRef.child(userId).once("value")
    .then(snap => (snap.val() ? snap.val() : Promise.reject()))
    // eslint-disable-next-line max-len
    .then(user => users.push({ Name: user.name, Group: decodeGroup(user), Type: user.type, Username: user.username, userId }))
    .catch(() => Promise.resolve())))
    .then(() => writeFileSync("interview.csv", new Parser().parse(users)));
}
