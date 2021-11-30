import { Context } from "telegraf";
import { emulateSendEvent, emulateUserPropertiesUpdate, emulatePageView } from "./analytics-emulator/browser-emulator";
import { getUserIdFromCtx } from "../utils";
import { adminUserId } from "../env";

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
  if (userId === adminUserId) return;
  emulatePageView({ userId, url }).then();
}

export function logEvent(userIdProvider: Context | string, name: string, params?: Record<string, any>): void {
  const userId = typeof userIdProvider === "string" ? userIdProvider : getUserIdFromCtx(userIdProvider);
  if (userId === adminUserId) return;
  emulateSendEvent({ userId, name, params }).then();
}

export function logAdminEvent(name: string, params?: Record<string, any>): void {
  emulateSendEvent({ userId: "admin", name, params }).then();
}

export function logUserGroupChange(userId: string, group: string, onlyChangeProperty?: boolean): Promise<void> {
  if (userId === adminUserId) return Promise.resolve();
  return emulateUserPropertiesUpdate({ userId, properties: { group } })
    .then(() => {
      if (onlyChangeProperty) return Promise.resolve();
      return emulateSendEvent({
        userId,
        name: "group_change",
        params: { group },
      }).then();
    });
}
