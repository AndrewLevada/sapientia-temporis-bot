import { getUserInfo, UserType } from "./user-service";
import { decodeGroup } from "./groups-service";
import { sendMessageToAdmin } from "./broadcast-service";
import { db } from "./db";
import { Telegraf } from "../app";

interface FeedbackReport {
  userId: string;
  userFirstName: string;
  userType: UserType;
  userGroup: string;
  userAlias: string | undefined;
  text: string;
  timestamp: string;
}

// eslint-disable-next-line import/prefer-default-export
export function reportFeedback(bot: Telegraf, userId: string, firstName: string, text: string): Promise<void> {
  const now = new Date();
  return getUserInfo(userId)
    .then(userInfo => {
      const report: FeedbackReport = {
        userId,
        text,
        userGroup: decodeGroup(userInfo) || "?",
        userFirstName: firstName || "?",
        userType: userInfo.type,
        userAlias: userInfo.username || "?",
        timestamp: now.toString(),
      };

      return Promise.all([recordFeedback(report), sendFeedbackToAdmin(bot, report)])
        .catch(e => console.log(e)).then();
    });
}

function recordFeedback(report: FeedbackReport): Promise<void> {
  return db("feedback").child(`${new Date().valueOf()}_${report.userId}`).set(report);
}

function sendFeedbackToAdmin(bot: Telegraf, report: FeedbackReport): Promise<void> {
  let text = "🧾 Новый отзыв! \n";
  text += `Отправитель ${report.userFirstName} (@${report.userAlias}, userId-${report.userId}) из группы ${report.userType} ${report.userGroup} \n`;
  text += "Текст: \n\n";
  text += report.text;
  return sendMessageToAdmin(bot, text);
}
