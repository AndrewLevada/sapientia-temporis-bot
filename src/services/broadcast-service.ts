import { Telegraf } from "telegraf";
import { getUsersIdsByGroup } from "./user-service";
import { groups } from "./groups-service";
import { logEvent } from "./analytics-service";

export type SpecialBroadcastGroup = "students" | "teachers" | "all" | "5" | "6" | "7" | "8" | "9" | "10" | "11";
export const specialBroadcastGroupStrings = ["students", "teachers", "all", "5", "6", "7", "8", "9", "10", "11"];

export function broadcastMessage(bot: Telegraf, group: SpecialBroadcastGroup | string, text: string): Promise<string> {
  logEvent({
    userId: "admin",
    name: "broadcast",
    params: { group, text },
  });

  return getUsersIdsByGroup(specialBroadcastGroupStrings.includes(group) ? group : groups[group]).then(ids => {
    const promises = [];
    let fails = 0;
    for (const id of ids) promises.push(bot.telegram.sendMessage(id, text).catch(onFail));
    return Promise.all(promises).then(() => `${ids.length - fails} / ${ids.length}`);

    function onFail() {
      fails++;
      return Promise.resolve();
    }
  });
}
