import { emulatePageView, emulateSendEvent, emulateUserPropertiesUpdate } from "./analytics-emulator/browser-emulator";
import { CustomContext } from "../app";
import { admins } from "../env";

const excludeRole = true;

export interface PageViewEvent {
  userId: string;
  url: string | null;
}

export interface Event {
  userId: string;
  name: string;
  params?: any;
}

export interface UserPropertyUpdated {
  userId: string;
  properties: Record<string, any>;
}

export function logPageView(ctx: CustomContext, url: string): void {
  if (isExcluded(ctx.userId) && excludeRole) return;
  emulatePageView({ userId: ctx.userId, url }).then();
}

export function logEvent(userIdProvider: CustomContext | string, name: string, params?: Record<string, any>): void {
  const userId = typeof userIdProvider === "string" ? userIdProvider : userIdProvider.userId;
  if (isExcluded(userId) && excludeRole) return;
  emulateSendEvent({ userId, name, params }).then();
}

export function logAdminEvent(name: string, params?: Record<string, any>): void {
  emulateSendEvent({ userId: "admin", name, params }).then();
}

export type UserProperty = "group" | "notifications" | "notifications_time";

// eslint-disable-next-line max-len
export function logUserPropChange(userId: string, property: UserProperty, value: string | boolean, onlyChangeProperty?: boolean): void {
  if (isExcluded(userId) && excludeRole) return;
  const o: Record<string, any> = {};
  o[property] = value;
  (onlyChangeProperty ? Promise.resolve() : emulateSendEvent({
    userId,
    name: `${property}_change`,
    params: o,
  })).then(() => emulateUserPropertiesUpdate({ userId, properties: o }));
}

function isExcluded(userId: string): boolean {
  const admin = admins.find(u => u.userId === userId);
  if (!admin) return false;
  return !!admin.analyticsExcluded;
}
