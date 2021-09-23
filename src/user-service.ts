import { database } from 'firebase-admin';
import Database = database.Database;
import Reference = database.Reference;

let usersRef!: Reference;

export function init() {
	const db: Database = database();
	usersRef = db.ref("users");
}

export function setUserGroup(userId: string, group: string): Promise<void> {
	return new Promise<void>(resolve => {
		usersRef.child(userId).set({group}).then(resolve);
	});
}

export function getUserGroup(userId: string): Promise<string> {
	return new Promise<string>(resolve => {
		usersRef.child(`${userId}/group`).get().then(snapshot => resolve(snapshot.val()));
	});
}
