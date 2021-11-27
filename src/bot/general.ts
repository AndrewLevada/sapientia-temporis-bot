import { Context, Markup, Telegraf } from 'telegraf';
import { logEvent } from '../services/analytics-service';
import { getUserIdFromCtx } from '../utils';
import { changeUserInfo } from './user-info-change';
import { adminUsername } from './env';

export const defaultKeyboard = Markup.keyboard([['Сегодня'], ['Вчера', 'Завтра'], ['На день недели', '✨ Дополнительно ✨']]).resize();
const settingsKeyboard = Markup.inlineKeyboard([[{ text: 'Рейтинг классов', callback_data: 'population' }], [{ text: 'Настроить расписание', callback_data: 'group' }]]);

export function bindGeneral(bot: Telegraf) {
	bot.start((ctx: Context) => {
		logEvent({ userId: getUserIdFromCtx(ctx), name: "start_command" });
		ctx.reply("✨ Доброе утро! Я умею показывать актуальное расписание Лицея 50 при ДГТУ")
			.then(() => changeUserInfo(ctx as any));
	});

	bot.help((ctx) => ctx.reply(`Бот расписаний Лицея 50 при ДГТУ. При возникновении проблем писать @${adminUsername}`));

	bot.hears('✨ Дополнительно ✨', (ctx) => ctx.reply('Настройки', settingsKeyboard));
}
