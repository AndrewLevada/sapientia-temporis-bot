import { Context, Telegraf } from 'telegraf';
import { init as initTimetableService, getTimetable } from './timetable-service';
import * as admin from 'firebase-admin';
import { getDayOfWeekWithDelta } from './utils';
import { groups } from './groups';
import { init as initUserService, getUserGroup, setUserGroup } from './user-service';

const delta = ['Вчера','Сегодня','Завтра'];
const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];

const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: "https://sapientia-temporis-bot-default-rtdb.europe-west1.firebasedatabase.app"
});

interface SessionData {
	state?: 'start' | 'normal';
}

const sessions: Record<string, SessionData> = {};

initTimetableService();
initUserService();
run();

function run() {
	const bot = new Telegraf(process.env.API_KEY as string);

	bot.start((ctx) => {
		ctx.reply('Привет! Я буду давать тебе актуальное расписание Лицея 50 при ДГТУ').then(() => changeGroup(ctx))
	});

	bot.help((ctx) => ctx.reply('Бот расписаний Лицея 50 при ДГТУ. Сделал @not_hello_world. Команды: /yesterday , /today , /tomorrow'));

	bot.on('text', (ctx, next) => {
		const userId: string = ctx.message.chat.id.toString();
		if (sessions[userId] && sessions[userId].state === "start") {
			const group = ctx.message.text.toLowerCase().replace(' ', '');
			if (groups[group]) setUserGroup(userId, groups[group]).then(() => {
				if (sessions[userId]) sessions[userId].state = 'normal';
				ctx.reply('Отлично! Расписание на сегодня:');
				replyWithTimetable(ctx).then();
			});
			else ctx.reply('Некорректный класс! Повтори ввод');
		} else next();
	});

	bot.command('today', (ctx) => replyWithTimetable(ctx));
	bot.command('tomorrow', (ctx) => replyWithTimetable(ctx, 1));
	bot.command('yesterday', (ctx) => replyWithTimetable(ctx, -1));
	bot.command('changeGroup', (ctx) => changeGroup(ctx));

	bot.launch().then(() => {});
}

async function replyWithTimetable(ctx : Context, dayDelta?: number) {
	if (!dayDelta) dayDelta = 0;

	if (!ctx.message) return;

	getUserGroup(ctx.message.chat.id.toString()).then(group => {
		if (!group) {
			changeGroup(ctx);
			return;
		}

		getTimetable(group, process.env.PERIOD_ID as string, dayDelta!).then((lessons : string[]) => {
			ctx.reply(`${delta[dayDelta! + 1]} ${days[getDayOfWeekWithDelta(dayDelta!)]}: \n\n${lessons.join("\n\n")}`);
		})
	});
}

function changeGroup(ctx: { message: any } & Context): void {
	const userId: string = ctx.message.chat.id.toString();
	ctx.reply('В каком классе ты учишься?').then();
	if (!sessions[userId]) sessions[userId] = { state: 'start' };
	else sessions[userId].state = 'start';
}
