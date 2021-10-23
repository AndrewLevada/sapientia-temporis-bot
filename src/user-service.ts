import { database } from 'firebase-admin';
import Database = database.Database;
import Reference = database.Reference;

let usersRef!: Reference;

export function init() {
	const db: Database = database();
	usersRef = db.ref("users");
}

export interface UserInfo {
	type: UserType;
	group: string;
}

export type UserType = "student" | "teacher";

export function setUserInfo(userId: string, info: UserInfo): Promise<void> {
	return usersRef.child(userId).set(info);
}

export function getUserInfo(userId: string): Promise<UserInfo> {
	return usersRef.child(`${userId}`).get().then(snapshot => snapshot.val());
}

export function getUsersCount(): Promise<number> {
	return usersRef.once('value').then(snapshot => snapshot.numChildren());
}
