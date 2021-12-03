import { Markup, Telegraf } from "telegraf";
import { getUsersIdsByGroup } from "./user-service";
import { logAdminEvent } from "./analytics-service";
import { adminUserId } from "../env";

export type BroadcastGroupType = "section" | "grade" | "group" | "userId";
export interface BroadcastGroup {
  type: BroadcastGroupType;
  value: string;
}

export function broadcastMessage(bot: Telegraf, group: BroadcastGroup, text: string): Promise<string> {
  logAdminEvent("broadcast", { group, text });

  return getUsersIdsByGroup(group).then(ids => {
    const promises = [];
    let fails = 0;
    for (const id of ids) promises.push(bot.telegram.sendMessage(id, text, Markup.inlineKeyboard([
      [{ text: "🤍️", callback_data: "broadcast_response" }],
    ])).catch(onFail));
    return Promise.all(promises).then(() => `${ids.length - fails} / ${ids.length}`);

    function onFail() {
      fails++;
      return Promise.resolve();
    }
  });
}

export function sendMessageToAdmin(bot: Telegraf, text: string): Promise<void> {
  return bot.telegram.sendMessage(adminUserId, text).then();
}
