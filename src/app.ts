import { Context, Markup, Telegraf } from 'telegraf';
import { init as initTimetableService, getTimetable, DateTimetable } from './timetable-service';
import * as admin from 'firebase-admin';
import { dateToSimpleString, getDayOfWeekWithDelta } from './utils';
import { groups, searchForTeacher } from './groups';
import { init as initUserService, getUsersCount, getUserInfo, setUserInfo, UserType } from './user-service';

const delta = ['Вчера','Сегодня','Завтра'];
const workWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const week = ['Воскресенье', ...workWeek];

admin.initializeApp({
	credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG as string, 'base64').toString('ascii'))),
	databaseURL: process.env.FIREBASE_DATABASE_URL as string,
});

interface SessionData {
	state?: 'change-type' | 'change-group' | 'normal';
	type?: UserType;
}

const sessions: Record<string, SessionData> = {};

const defaultKeyboard = Markup.keyboard([['Сегодня'], ['Вчера', 'Завтра'], ['На день недели']]).resize();
const userTypeKeyboard = Markup.keyboard(['Ученик', 'Преподаватель']).resize();

initTimetableService();
initUserService();
run();

function run() {
	const bot = new Telegraf(process.env.API_KEY as string);

	bot.start((ctx) => {
		ctx.reply('Доброе утро! Я умею показывать актуальное расписание Лицея 50 при ДГТУ').then(() => changeUserInfo(ctx))
	});

	bot.help((ctx) => ctx.reply('Бот расписаний Лицея 50 при ДГТУ. Сделал @not_hello_world. Дополнительные команды: \n/changeUserInfo \n/population'));

	bot.on('text', (ctx, next) => {
		const userId: string = ctx.message.chat.id.toString();

		if (sessions[userId] || sessions[userId].state === 'normal') {
			if (sessions[userId].state === 'change-type') {
				const type = ctx.message.text.toLowerCase();

				if (!["учусь", "преподаю"].includes(type)) {
					ctx.reply('Некорректное значение! Повтори ввод', userTypeKeyboard);
					return;
				}

				sessions[userId].state = "change-group";
				if (type === "учусь") {
					sessions[userId].type = "student";
					ctx.reply('В каком классе ты учишься?', Markup.removeKeyboard()).then();
				}
				else if (type === "преподаю") {
					sessions[userId].type = "teacher";
					ctx.reply('Введите вашу фамилию', Markup.removeKeyboard()).then();
				}
			}

			if (sessions[userId].state === 'change-group') {
				const group = ctx.message.text.toLowerCase().replace(' ', '');

				if (sessions[userId].type === "student") {
					if (groups[group])
						setUserInfo(userId, { type: "student", group: groups[group] }).then(() => {
							sessions[userId].state = 'normal';
							delete sessions[userId].type;
							ctx.reply('Отлично! Расписание на сегодня:', defaultKeyboard);
							replyWithTimetableForDelta(ctx, 0).then();
						});
					else ctx.reply('Некорректный класс! Повтори ввод');
				} else if (sessions[userId].type === "teacher") {
					const t = searchForTeacher(group);
					if (!t) {
						ctx.reply('Преподаватель не найден! Повторите ввод');
						return;
					}

					setUserInfo(userId, { type: "teacher", group: t.code }).then(() => {
						sessions[userId].state = 'normal';
						delete sessions[userId].type;
						ctx.reply(`Отлично! Распознал вас как ${t.fullName}`);
						ctx.reply('Вот расписание на сегодня:', defaultKeyboard);
						replyWithTimetableForDelta(ctx, 0).then();
					});
				}
			}
		} else next();
	});

	bot.hears('Сегодня', (ctx) => replyWithTimetableForDelta(ctx, 0));
	bot.hears('Завтра', (ctx) => replyWithTimetableForDelta(ctx, 1));
	bot.hears('Вчера', (ctx) => replyWithTimetableForDelta(ctx, -1));

	bot.hears('На день недели', (ctx) => ctx.reply('Выберите день недели', getDayAwareWeekKeyboard()));
	bot.hears(workWeek.map(v => new RegExp(`${v}( \(Сегодня\))?`)), (ctx) =>
		replyWithTimetableForDay(ctx, week.indexOf(ctx.message.text.split(' ')[0])));

	bot.hears('Титаник', (ctx) => ctx.replyWithPhoto("https://github.com/AndrewLevada/sapientia-temporis-bot/raw/main/assets/titanik.jpg"));

	bot.command('changeUserInfo', (ctx) => changeUserInfo(ctx));

	bot.command('population', (ctx) => {
		getUsersCount().then(count => ctx.reply(`Население нашего королевства: ${count} humans`))
	});

	bot.on('text', ctx => {
		ctx.reply('Для получения информации /help', defaultKeyboard)
	});

	bot.launch().then(() => {});
}

async function replyWithTimetableForDelta(ctx : Context, dayDelta: number) {
	if (!ctx.message) return;

	getUserInfo(ctx.message.chat.id.toString()).then(info => {
		if (!info || !info.type || !info.group) {
			ctx.reply("Бот обновился! Теперь мне нужны дополнительные данные :)");
			changeUserInfo(ctx);
			return;
		}

		const now = new Date();
		const day = getDayOfWeekWithDelta(dayDelta);
		const date = new Date(now.valueOf() + (day - now.getDay()) * (24 * 60 * 60 * 1000));
		getTimetable(info.group, process.env.PERIOD_ID as string, date).then((timetable: DateTimetable) => {
			ctx.reply(`${delta[dayDelta + 1]} ${week[day]}: \n\n${timetable.lessons.join("\n\n")}`);
		})
	});
}

async function replyWithTimetableForDay(ctx : Context, day: number) {
	if (!ctx.message) return;

	getUserInfo(ctx.message.chat.id.toString()).then(info => {
		if (!info || !info.type || !info.group) {
			ctx.reply("Бот обновился! Теперь мне нужны дополнительные данные :)");
			changeUserInfo(ctx);
			return;
		}

		const now = new Date();
		const date = new Date(now.valueOf() + (day - now.getDay()) * (24 * 60 * 60 * 1000) + (day < now.getDay() ? (7 * 24 * 60 * 60 * 1000) : 0));
		getTimetable(info.group, process.env.PERIOD_ID as string, date).then((timetable: DateTimetable) => {
			ctx.reply(`${week[day]} (${dateToSimpleString(timetable.date)}): \n\n${timetable.lessons.join("\n\n")}`, defaultKeyboard);
		})
	});
}

function getDayAwareWeekKeyboard(): any {
	const buttons = [['Понедельник', 'Вторник'], ['Среда', 'Четверг'], ['Пятница', 'Суббота']];
	const day = getDayOfWeekWithDelta(0) - 1;
	if (day === -1) return Markup.keyboard(buttons);
	buttons[Math.floor(day / 2)][day % 2] += ' (Сегодня)';
	return Markup.keyboard(buttons);
}

function changeUserInfo(ctx: { message: any } & Context): void {
	const userId: string = ctx.message.chat.id.toString();
	ctx.reply('Чем вы занимаетесь в лицее?', userTypeKeyboard).then();
	if (!sessions[userId]) sessions[userId] = { state: 'change-type' };
	else sessions[userId].state = 'change-type';
}
