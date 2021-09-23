import Context, { Telegraf } from 'telegraf';
import { init, getTimetable } from './timetable-service';
import * as admin from 'firebase-admin';
import { getDayOfWeekWithDelta } from './utils';

const delta = ['Вчера','Сегодня','Завтра'];
const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];

const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: "https://sapientia-temporis-bot-default-rtdb.europe-west1.firebasedatabase.app"
});

init();
run();

function run() {
	const bot = new Telegraf(process.env.API_KEY as string);

	bot.start((ctx) => ctx.reply('Привет! Я буду давать тебе актуальное расписание Лицея 50 при ДГТУ. Для списка команд напиши /help'));
	bot.help((ctx) => ctx.reply('Бот расписаний Лицея 50 при ДГТУ. Сделал @not_hello_world. Команды: /yesterday , /today , /tomorrow'));

	bot.command('today', (ctx) => replyWithTimetable(ctx));
	bot.command('tomorrow', (ctx) => replyWithTimetable(ctx, 1));
	bot.command('yesterday', (ctx) => replyWithTimetable(ctx, -1));
	bot.on('text', (ctx) => replyWithTimetable(ctx));

	bot.launch().then(() => {});
}

async function replyWithTimetable(ctx : Context.Context, dayDelta?: number) {
	if (!dayDelta) dayDelta = 0;

	getTimetable(process.env.GROUP_ID as string, process.env.PERIOD_ID as string, dayDelta!).then((lessons : string[]) => {
		ctx.reply(`${delta[dayDelta! + 1]} ${days[getDayOfWeekWithDelta(dayDelta!)]}: \n\n${lessons.join("\n\n")}`);
	});
}
