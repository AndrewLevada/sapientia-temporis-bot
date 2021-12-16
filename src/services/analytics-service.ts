import { Context } from "telegraf";
import { emulatePageView, emulateSendEvent,
  emulateUserPropertiesUpdate } from "./analytics-emulator/browser-emulator";
import { getUserIdFromCtx } from "../utils";
import { adminUserId } from "../env";

const doIgnoreAdmin = true;

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

export function logPageView(ctx: Context, url: string): void {
  const userId = getUserIdFromCtx(ctx);
  if (userId === adminUserId && doIgnoreAdmin) return;
  emulatePageView({ userId, url }).then();
}

export function logEvent(userIdProvider: Context | string, name: string, params?: Record<string, any>): void {
  const userId = typeof userIdProvider === "string" ? userIdProvider : getUserIdFromCtx(userIdProvider);
  if (userId === adminUserId && doIgnoreAdmin) return;
  emulateSendEvent({ userId, name, params }).then();
}

export function logAdminEvent(name: string, params?: Record<string, any>): void {
  emulateSendEvent({ userId: "admin", name, params }).then();
}

export type UserProperty = "group" | "exchange_notifications";

// eslint-disable-next-line max-len
export function logUserPropChange(userId: string, property: UserProperty, value: string | boolean, onlyChangeProperty?: boolean): void {
  if (userId === adminUserId && doIgnoreAdmin) return;
  const o: Record<string, any> = {};
  o[property] = value;
  (onlyChangeProperty ? Promise.resolve() : emulateSendEvent({
    userId,
    name: `${property}_change`,
    params: o,
  })).then(() => emulateUserPropertiesUpdate({ userId, properties: o }));
}
