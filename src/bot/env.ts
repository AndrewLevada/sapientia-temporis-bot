import { UserType } from "../services/user-service";

export const sessions: Record<string, SessionData> = {};

type SessionState = "change-type" | "change-group" | "normal" | "feedback";
interface SessionData {
  state?: SessionState;
  type?: UserType;
}

export function setUserSessionState(userId: string, newState: SessionState) {
  if (!sessions[userId]) sessions[userId] = { state: newState };
  else sessions[userId].state = newState;
}

export function resetUserSession(userId: string) {
  if (sessions[userId]) sessions[userId] = { state: "normal" };
}
