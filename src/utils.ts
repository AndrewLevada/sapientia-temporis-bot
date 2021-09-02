export function getWeek(d: Date) {
	// Create a copy of this date object
	const target = new Date(d.valueOf());

	// ISO week date weeks start on monday
	// so correct the day number
	const dayNr = (d.getDay() + 6) % 7;

	// Set the target to the thursday of this week so the
	// target date is in the right year
	target.setDate(target.getDate() - dayNr + 3);

	// ISO 8601 states that week 1 is the week
	// with january 4th in it
	const jan4 = new Date(target.getFullYear(), 0, 4);

	// Number of days between target date and january 4th
	const dayDiff = (target.valueOf() - jan4.valueOf()) / 86400000;

	// Calculate week number: Week 1 (january 4th) plus the
	// number of weeks between target date and january 4th
	return 1 + Math.ceil(dayDiff / 7);

}
