import { Context, Telegraf } from "telegraf";
import { logEvent } from "../services/analytics-service";
import { getUsersCount, getUsersLeaderboard } from "../services/user-service";
import { inverseGroups } from "../services/groups-service";
import { defaultKeyboard } from "./general";

const leaderboardPlaces = ["🥇", "🥈", "🥉"];

// eslint-disable-next-line import/prefer-default-export
export function bindLeaderboard(bot: Telegraf) {
  bot.hears("Рейтинг классов️", ctx => replyWithGroupsTop(ctx));
}

function replyWithGroupsTop(ctx: Context) {
  logEvent(ctx, "leaderboard_view");
  Promise.all([getUsersLeaderboard(), getUsersCount()]).then(([rawLeaderboard, count]) => {
    const leaderboard = rawLeaderboard.map(v => `*${inverseGroups[v[0]]}* \\- ${v[1]}`);

    let text = `Население нашего королевства: ${count} humans \n\n`;

    let delta = 0;
    for (let i = 0; i < leaderboardPlaces.length + delta; i++) {
      text += `${leaderboard[i]} ${leaderboardPlaces[i - delta]}\n`;
      if (rawLeaderboard.length > i + 1 && rawLeaderboard[i][1] === rawLeaderboard[i + 1][1]) delta++;
    }

    text += leaderboard.slice(leaderboardPlaces.length + delta).join("\n");

    ctx.replyWithMarkdownV2(text).then(() => ctx.reply("Обязательно показывай бота друзьям и однокласникам, чтобы им тоже было удобно смотреть расписание", defaultKeyboard));
  });
}
