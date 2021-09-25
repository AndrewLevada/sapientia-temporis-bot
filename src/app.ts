import { Context, Markup, Telegraf } from 'telegraf';
import { init as initTimetableService, getTimetable } from './timetable-service';
import * as admin from 'firebase-admin';
import { getDayOfWeekWithDelta } from './utils';
import { groups } from './groups';
import { init as initUserService, getUserGroup, setUserGroup, getUsersCount } from './user-service';

const delta = ['Вчера','Сегодня','Завтра'];
const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];

admin.initializeApp({
	credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG as string, 'base64').toString('ascii'))),
	databaseURL: process.env.FIREBASE_DATABASE_URL as string,
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
	const defaultKeyboard = Markup.keyboard([['Сегодня'], ['Вчера', 'Завтра'], ['На день недели']]).resize();

	bot.start((ctx) => {
		ctx.reply('Привет! Я буду давать тебе актуальное расписание Лицея 50 при ДГТУ').then(() => changeGroup(ctx))
	});

	bot.help((ctx) => ctx.reply('Бот расписаний Лицея 50 при ДГТУ. Сделал @not_hello_world. Дополнительные команды: \n/changeGroup \n/population'));

	bot.on('text', (ctx, next) => {
		const userId: string = ctx.message.chat.id.toString();
		if (sessions[userId] && sessions[userId].state === "start") {
			const group = ctx.message.text.toLowerCase().replace(' ', '');
			if (groups[group]) setUserGroup(userId, groups[group]).then(() => {
				if (sessions[userId]) sessions[userId].state = 'normal';
				ctx.reply('Отлично! Расписание на сегодня:', defaultKeyboard);
				replyWithTimetable(ctx).then();
			});
			else ctx.reply('Некорректный класс! Повтори ввод');
		} else next();
	});

	bot.hears('Сегодня', (ctx) => replyWithTimetable(ctx));
	bot.hears('Завтра', (ctx) => replyWithTimetable(ctx, 1));
	bot.hears('Вчера', (ctx) => replyWithTimetable(ctx, -1));

	bot.command('changeGroup', (ctx) => changeGroup(ctx));

	bot.command('population', (ctx) => {
		getUsersCount().then(count => ctx.reply(`Население нашего королевства: ${count} humans`))
	});

	bot.on('text', ctx => {
		ctx.reply('Для получения информации /help', defaultKeyboard)
	});

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
