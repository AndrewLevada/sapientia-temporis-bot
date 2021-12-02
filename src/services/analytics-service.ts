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

export function logUserGroupChange(userId: string, group: string, onlyChangeProperty?: boolean): void {
  if (userId === adminUserId && doIgnoreAdmin) return;
  emulateUserPropertiesUpdate({ userId, properties: { group } })
    .then(() => {
      if (onlyChangeProperty) return Promise.resolve();
      return emulateSendEvent({
        userId,
        name: "group_change",
        params: { group },
      }).then();
    });
}
