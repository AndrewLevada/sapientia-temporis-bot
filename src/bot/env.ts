import { UserType } from '../services/user-service';

export const adminUsername = "not_hello_world";
export const sessions: Record<string, SessionData> = {};

interface SessionData {
	state?: 'change-type' | 'change-group' | 'normal';
	type?: UserType;
}
