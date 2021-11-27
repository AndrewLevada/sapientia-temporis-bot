import { database } from 'firebase-admin';
import Database = database.Database;
import Reference = database.Reference;

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
}

export type UserType = "student" | "teacher";

export function setUserInfo(userId: string, info: UserInfo): Promise<void> {
	const userRef = usersRef.child(userId);
	return userRef.once("value").then(snap => {
		const user: UserInfo = snap.val();
		if (user && user.group && user.type === "student") removeUserSnapFromTop(user.group);
		if (info.type === "student") addUserSnapToTop(info.group);
	}).then(() => userRef.set(info));
}

export function getUserInfo(userId: string): Promise<UserInfo> {
	return usersRef.child(`${userId}`).get().then(snapshot => snapshot.val());
}

export function getUsersCount(): Promise<number> {
	return usersRef.once('value').then(snapshot => snapshot.numChildren());
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
