import { Telegraf } from 'telegraf';
import { getTeachersList } from '../services/user-service';
import { inverseTeachers } from '../services/groups-service';

export function bindAdmin(bot: Telegraf) {
	bot.command("/teachers", ctx => {
		if (ctx.message.from.username !== "not_hello_world") return;
		getTeachersList().then(l => ctx.reply(l.map(v => inverseTeachers[v]).join("\n")));
	});
}
