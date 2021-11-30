import { Context } from "telegraf";
import { emulateSendEvent, emulateUserPropertiesUpdate, emulatePageView } from "./analytics-emulator/browser-emulator";
import { getUserIdFromCtx } from "../utils";

// eslint-disable-next-line max-len
// const gaUrl = `https://google-analytics.com/mp/collect?api_secret=${process.env.GA_API_KEY}&measurement_id=G-HYFTVXK74M`;

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
  // if (e.userId === adminUserId) return;
  emulatePageView({ userId: getUserIdFromCtx(ctx), url }).then();
}

export function logEvent(userIdProvider: Context | string, name: string, params?: Record<string, any>): void {
  // if (event.userId === adminUserId) return;
  emulateSendEvent({
    userId: (typeof userIdProvider === "string" ? userIdProvider : getUserIdFromCtx(userIdProvider)),
    name,
    params,
  }).then();
}

export function logAdminEvent(name: string, params?: Record<string, any>): void {
  emulateSendEvent({ userId: "admin", name, params }).then();
}

export function logUserGroupChange(userId: string, group: string): void {
  // if (userId === adminUserId) return;
  emulateUserPropertiesUpdate({ userId, properties: { group } })
    .then(() => emulateSendEvent({
      userId,
      name: "group_change",
      params: { group },
    }));
}
