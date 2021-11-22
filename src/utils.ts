import { Context } from 'telegraf';

export function getDayOfWeekWithDelta(dateDelta: number) {
	let day: number = new Date().getDay() + dateDelta;
	if (day === -1) day = 6;
	else if (day === 7) day = 0;
	return day;
}

export function dateToSimpleString(date: Date): string {
	return `${date.getDate() < 10 ? '0' : ''}${date.getDate()}\\.${date.getMonth() + 1 < 10 ? '0' : ''}${date.getMonth() + 1}`
}

export function getUserIdFromCtx(ctx: { message?: any } & { update?: { callback_query?: any }} & Context): string {
	return (ctx.message || ctx.update.callback_query.message).chat.id.toString();
}
