import axios from 'axios';
import { database } from 'firebase-admin';
import Reference = database.Reference;
import Database = database.Database;
import { getDayOfWeekWithDelta } from './utils';

let db! : Database;
let hashedVersionRef!: Reference;
let subjectsRef!: Reference;
let roomsRef!: Reference;
let scheduleRef!: Reference;
let exchangeRef!: Reference;

let subjects: any | null;
let rooms: any | null;

const pairTimes: string[][] = [
	["8:00", "9:30"],
	["9:40", "11:10"],
	["11:25", "12:55"],
	["13:00", "14:30"],
	["14:40", "16:10"],
]

const lessonTimes: string[][] = [
	["8:00", "8:40"],
	["8:50", "9:30"],
	["9:45", "10:25"],
	["10:30", "11:15"],
	["11:25", "12:05"],
	["12:20", "13:00"],
	["13:05", "13:45"],
	["13:55", "14:35"],
	["14:50", "15:30"],
	["15:35", "16:15"],
	["16:20", "17:00"],
	["17:05", "17:45"],
	["17:50", "18:30"],
]

export function init() {
	db = database();
	hashedVersionRef = db.ref("hashed_version");
	subjectsRef = db.ref("subjects");
	roomsRef = db.ref("rooms");
	scheduleRef = db.ref("schedule");
	exchangeRef = db.ref("exchange");

	subjectsRef.on('value', snapshot => { subjects = snapshot.val() });
	roomsRef.on('value', snapshot => { rooms = snapshot.val() });
}

export function getTimetable(group: string, period: string, dateDelta: number): Promise<string[]> {
	return new Promise<string[]>(resolve => {
		validateHashedData().then(() => constructTimetable(group, period, dateDelta)).then(resolve);
	});
}

function validateHashedData(): Promise<void> {
	return new Promise(resolve => {
		axios.get("http://raspisanie.nikasoft.ru/check/47307204.html").then(checkRes => {
			hashedVersionRef.once('value').then(data => {
				if (data.val() as string === checkRes.data as string) resolve();
				else updateHashedData(checkRes.data as string).then(resolve);
			});
		});
	});
}

function updateHashedData(version: string): Promise<void> {
	return new Promise(resolve => {
		const hashPromise = hashedVersionRef.set(version);

		axios.get(`http://raspisanie.nikasoft.ru/static/public/${version}`).then(res => {
			const rawData : string = (res.data as string).split("var NIKA=\r\n")[1].split(";")[0];
			const data = JSON.parse(rawData);

			let exchangeCopy: any = {};
			for (const group of Object.keys(data["CLASS_EXCHANGE"])) {
				exchangeCopy[group] = {};
				for (const [dateKey, dateValue] of Object.entries(data["CLASS_EXCHANGE"][group]))
					exchangeCopy[group][dateKey.replace(/\./g, "-")] = dateValue;
			}

			Promise.all([
				hashPromise,
				subjectsRef.set(data["SUBJECTS"]),
				roomsRef.set(data["ROOMS"]),
				scheduleRef.set(data["CLASS_SCHEDULE"]),
				exchangeRef.set(exchangeCopy)
			]).then(() => resolve());
		});

		resolve();
	});
}

function constructTimetable(group: string, period: string, dayDelta: number): Promise<string[]> {
	return new Promise<string[]>(resolve => {
		const now = new Date();
		const day = getDayOfWeekWithDelta(dayDelta);

		const date = new Date(now.valueOf() + dayDelta * (24 * 60 * 60 * 1000));
		const dateString: string = `${date.getDate() < 10 ? "0" : ""}${date.getDate()}-${date.getMonth() < 9 ? "0" : ""}${date.getMonth() + 1}-${date.getFullYear()}`;
		Promise.all([
			scheduleRef.child(`${period}/${group}`).once('value'),
			exchangeRef.child(`${group}/${dateString}`).once('value'),
		]).then(([scheduleSnapshot, exchangeSnapshot]) => {
			const schedule = scheduleSnapshot.val();
			const exchange = exchangeSnapshot.val();
			const result : string[] = [];

			for (let j = 6; j > 0; j--) {
				const index : string[] = [getLessonIndex(day, j * 2), getLessonIndex(day, j * 2 - 1)];
				const lessons : (Lesson | undefined)[] = [schedule[index[0]], schedule[index[1]]];

				if (exchange) {
					lessons[0] = mutateExchange(lessons[0], j * 2, exchange);
					lessons[1] = mutateExchange(lessons[1], j * 2 - 1, exchange);
				}

				if (lessons[0]?.s[0] === lessons[1]?.s[0]) {
					if (lessons[0] || result.length > 0)
						result.push(getLessonText(lessons[0], "pair", j * 2));
				} else {
					if (lessons[0] || lessons[1] || result.length > 0)
						result.push(getLessonText(lessons[0], "lesson", j * 2));
					if (lessons[1] || result.length > 0)
						result.push(getLessonText(lessons[1], "lesson", j * 2 - 1));
				}
			}

			if (result.length === 0) resolve(["Нет пар"]);
			resolve(result.reverse());
		});
	});
}

function getLessonIndex(day: number, i: number): string {
	return `${day}${i < 10 ? "0" : ""}${i}`;
}

function getLessonText(lesson: Lesson | undefined, type: LessonType, i: number): string {
	if (!lesson) return `${getLessonNumber(type, i)}) Окно`;

	const subject = subjects[lesson.s[0]];
	const room = rooms[lesson.r[0]];
	const roomMore = lesson.g ? ` и ${rooms[lesson.r[1]]}` : '';

	let timeArray: string[] = [];
	if (type === "pair")
		timeArray = pairTimes[Math.floor(i / 2) - 1];
	else if (type === "lesson")
		timeArray = lessonTimes[i - 1];

	let text = `${getLessonNumber(type, i)}) ${subject}\n`;
	text += `🕐 ${timeArray[0]} — ${timeArray[1]}\n`;
	text += `🚪 ${room}${roomMore}`;
	return text;
}

function getLessonNumber(type: LessonType, i: number): string {
	if (type === "pair") return `${Math.floor(i / 2)} пара` ;
	return `${i} урок`;
}

function mutateExchange(lesson: Lesson | undefined, index: number, exchange: any): Lesson | undefined {
	if (!lesson) return undefined;
	const rule: any = exchange[index.toString()];
	if (!rule) return lesson;
	if (rule.s === "F") return undefined;
	return rule;
}

type LessonType = "lesson" | "pair";

interface Lesson {
	s: string[];
	r: string[];
	g?: string[];
}
