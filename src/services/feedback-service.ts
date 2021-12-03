import { Telegraf } from "telegraf";
import { database } from "firebase-admin";
import Reference = database.Reference;
import Database = database.Database;
import { getUserInfo, UserType } from "./user-service";
import { inverseGroups, inverseTeachers } from "./groups-service";
import { adminUserId } from "../env";

let feedbackRef!: Reference;

interface FeedbackReport {
  userId: string;
  userFirstName: string;
  userType: UserType;
  userGroup: string;
  userAlias: string | undefined;
  text: string;
  timestamp: string;
}

export function init() {
  const db: Database = database();
  feedbackRef = db.ref("feedback");
}

export function reportFeedback(bot: Telegraf, userId: string, firstName: string, text: string): Promise<void> {
  const now = new Date();
  return getUserInfo(userId).then(userInfo => {
    const report: FeedbackReport = {
      userId,
      text,
      userFirstName: firstName,
      userGroup: userInfo.type === "student" ? inverseGroups[userInfo.group] : inverseTeachers[userInfo.group],
      userType: userInfo.type,
      userAlias: userInfo.username,
      timestamp: now.toString(),
    };

    return Promise.all([recordFeedback(report), sendFeedbackToAdmin(bot, report)]).catch(e => console.log(e)).then();
  });
}

function recordFeedback(report: FeedbackReport): Promise<void> {
  return feedbackRef.child(`${new Date().valueOf()}_${report.userId}`).set(report);
}

function sendFeedbackToAdmin(bot: Telegraf, report: FeedbackReport): Promise<void> {
  let text = "🧾 Новый отзыв! \n";
  text += `Отправитель ${report.userFirstName} (@${report.userAlias}, userId-${report.userId}) из группы ${report.userType} ${report.userGroup} \n`;
  text += "Текст: \n\n";
  text += report.text;
  return bot.telegram.sendMessage(adminUserId, text).then();
}
