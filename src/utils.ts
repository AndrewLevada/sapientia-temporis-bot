export function getDayOfWeekWithDelta(dateDelta: number) {
	let day: number = new Date().getDay() + dateDelta;
	if (day === -1) day = 6;
	else if (day === 7) day = 0;
	return day;
}
