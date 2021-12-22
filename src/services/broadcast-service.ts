import { Markup, Telegraf } from "telegraf";
import { getUsersIdsByGroup } from "./user-service";
import { logAdminEvent } from "./analytics-service";
import { adminUserId } from "../env";

export type BroadcastGroupType = "section" | "grade" | "group" | "userId";
export interface BroadcastGroup {
  type: BroadcastGroupType;
  value: string;
}

export function broadcastMessage(bot: Telegraf, group: BroadcastGroup, text: string,
                                 withFeedback: boolean, dontLogAnalytics?: boolean): Promise<string> {
  if (!dontLogAnalytics) logAdminEvent("broadcast", { group, text });

  return getUsersIdsByGroup(group).then(ids => {
    const promises = [];
    let fails = 0;
    for (let i = 0; i < ids.length; i++) promises.push(sendMessage(ids[i], i).catch(onFail));
    return Promise.all(promises).then(() => `${ids.length - fails} / ${ids.length}`);

    function onFail() {
      fails++;
      return Promise.resolve();
    }

    function sendMessage(id: string, n: number): Promise<void> {
      if (withFeedback) return delay(n * 100)
        .then(() => bot.telegram.sendMessage(id, text, Markup.inlineKeyboard([
          [{ text: "🤍️", callback_data: "broadcast_response" }],
        ]))).then();
      return bot.telegram.sendMessage(id, text).then();
    }
  });
}

export function sendMessageToAdmin(bot: Telegraf, text: string): Promise<void> {
  return bot.telegram.sendMessage(adminUserId, text).then();
}

function delay(n: number) {
  return new Promise(resolve => {
    setTimeout(resolve, n);
  });
}
