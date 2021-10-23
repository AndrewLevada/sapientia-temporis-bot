import axios from 'axios';
import { database } from 'firebase-admin';
import Reference = database.Reference;
import Database = database.Database;
import { groups, isGroupUpper, isGroupWithPairs } from './groups';
import { UserInfo, UserType } from './user-service';

let hashedVersionRef!: Reference;
let subjectsRef!: Reference;
let roomsRef!: Reference;
let scheduleRef!: Reference;
let exchangeRef!: Reference;
let teacherScheduleRef!: Reference;
let teacherExchangeRef!: Reference;

let subjects: any | null;
let rooms: any | null;

const pairTimes: string[][] = [
	["8:00", "9:30"],
	["9:40", "11:10"],
	["11:25", "12:55"],
	["13:00", "14:30"],
	["14:40", "16:10"],
];

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
	["15:40", "16:20"],
	["16:25", "17:05"],
	["17:10", "17:50"],
	["17:55", "18:35"],
];

type LessonType = "lesson" | "pair";

interface StudentLesson {
	s: string[];
	r: string[];
	g?: string[];
}

interface TeacherLesson {
	s: string;
	c?: string[];
	g?: string[];
	r?: string;
}

export interface Timetable {
	schedule: any;
	exchange?: any;
}

export interface DateTimetable {
	lessons: string[];
	date: Date;
}

export function init() {
	const db: Database = database();

	hashedVersionRef = db.ref("hashed_version");
	subjectsRef = db.ref("subjects");
	roomsRef = db.ref("rooms");
	scheduleRef = db.ref("student_schedule");
	exchangeRef = db.ref("student_exchange");
	teacherScheduleRef = db.ref("teacher_schedule");
	teacherExchangeRef = db.ref("teacher_exchange");

	subjectsRef.on('value', snapshot => { subjects = snapshot.val() });
	roomsRef.on('value', snapshot => { rooms = snapshot.val() });
}

export function getTimetable(info: UserInfo, date: Date): Promise<DateTimetable> {
	return validateHashedData().then(() => constructTimetable(info, date));
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

			Promise.all([
				hashPromise,
				subjectsRef.set(data["SUBJECTS"]),
				roomsRef.set(data["ROOMS"]),
				scheduleRef.set(data["CLASS_SCHEDULE"]),
				exchangeRef.set(makeCorrectCopyOfExchange(data["CLASS_EXCHANGE"])),
				teacherScheduleRef.set(data["TEACH_SCHEDULE"]),
				teacherExchangeRef.set(makeCorrectCopyOfExchange(data["TEACH_EXCHANGE"])),
			]).then(() => resolve());
		});

		resolve();
	});
}

function makeCorrectCopyOfExchange(data: any): any {
	let copy: any = {};
	for (const group of Object.keys(data)) {
		copy[group] = {};
		for (const [dateKey, dateValue] of Object.entries(data[group]))
			copy[group][dateKey.replace(/\./g, "-")] = dateValue;
	}
	return copy;
}

function constructTimetable(info: UserInfo, date: Date): Promise<DateTimetable> {
	return new Promise<DateTimetable>(resolve => {
		const dateString: string = `${date.getDate() < 10 ? "0" : ""}${date.getDate()}-${date.getMonth() < 9 ? "0" : ""}${date.getMonth() + 1}-${date.getFullYear()}`;

		Promise.all([
			(info.type === "teacher" ? teacherScheduleRef : scheduleRef).child(`${process.env.PERIOD_ID as string}/${info.group}`).once('value'),
			(info.type === "teacher" ? teacherExchangeRef : exchangeRef).child(`${info.group}/${dateString}`).once('value'),
		]).then(([scheduleSnapshot, exchangeSnapshot]) => {
			const timetable: Timetable = {
				schedule: scheduleSnapshot.val(),
				exchange: exchangeSnapshot.val()
			};

			let result : string[] = [];

			if (info.type === "student") {
				if (isGroupWithPairs(info.group))
					result = getLessonsAsPairs(timetable, info.type, date);
				else result = getLessons(timetable, info.type, date);

				if (isGroupUpper(info.group) && result.length > 0)
					removeEmptyAtStart(result);
			}

			if (info.type === "teacher") {

			}

			if (result.length === 0) resolve({ lessons: ["Свободный день"], date });
			resolve({ lessons: result.reverse(), date });
		});
	});
}

function getLessonsAsPairs(timetable: Timetable, type: UserType, date: Date): string[] {
	const result : string[] = [];

	for (let j = 6; j > 0; j--) {
		const index : string[] = [getLessonIndex(date.getDay(), j * 2), getLessonIndex(date.getDay(), j * 2 - 1)];
		const lessons : (StudentLesson | undefined)[] = [timetable.schedule[index[0]], timetable.schedule[index[1]]];

		if (timetable.exchange) {
			lessons[0] = mutateExchange(lessons[0], j * 2, timetable.exchange);
			lessons[1] = mutateExchange(lessons[1], j * 2 - 1, timetable.exchange);
		}

		if (lessons[0]?.s[0] === lessons[1]?.s[0]) {
			if (lessons[0] || result.length > 0)
				result.push(getLessonText(lessons[0], "pair", j * 2, type));
		} else {
			if (lessons[0] || lessons[1] || result.length > 0)
				result.push(getLessonText(lessons[0], "lesson", j * 2, type));
			if (lessons[1] || result.length > 0)
				result.push(getLessonText(lessons[1], "lesson", j * 2 - 1, type));
		}
	}

	return result;
}

function getLessons(timetable: Timetable, type: UserType, date: Date): string[] {
	const result : string[] = [];

	for (let i = 12; i > 0; i--) {
		const index : string = getLessonIndex(date.getDay(), i);
		let lesson : StudentLesson | undefined = timetable.schedule[index];

		if (timetable.exchange)
			lesson = mutateExchange(lesson, i, timetable.exchange);

		if (lesson || result.length > 0)
			result.push(getLessonText(lesson, "lesson", i, type));
	}

	return result;
}

function getLessonIndex(day: number, i: number): string {
	return `${day}${i < 10 ? "0" : ""}${i}`;
}

function mutateExchange(lesson: StudentLesson | undefined, index: number, exchange: any): StudentLesson | undefined {
	if (!lesson) return undefined;
	const rule: any = exchange[index.toString()];
	if (!rule) return lesson;
	if (rule.s === "F") return undefined;
	return rule;
}

function getLessonText(lesson: StudentLesson | TeacherLesson | undefined, lessonType: LessonType, i: number, userType: UserType): string {
	if (userType === "student") return getStudentLessonText(lesson as StudentLesson, lessonType, i);
	return getTeacherLessonText(lesson as TeacherLesson, lessonType, i);
}

function getStudentLessonText(lesson: StudentLesson | undefined, type: LessonType, i: number): string {
	if (!lesson) return `${getLessonNumber(type, i)}) Окно`;

	const subject = subjects[lesson.s[0]];
	const room = rooms[lesson.r[0]];
	const roomMore = lesson.g ? ` и ${rooms[lesson.r[1]]}` : '';
	const timeArray = getLessonTimeArray(i, type);

	let text = `${getLessonNumber(type, i)}) ${subject}\n`;
	text += `🕐 ${timeArray[0]} — ${timeArray[1]}\n`;
	text += `🚪 ${room}${roomMore}`;
	return text;
}

function getTeacherLessonText(lesson: TeacherLesson | undefined, type: LessonType, i: number): string {
	if (!lesson) return `${getLessonNumber(type, i)}) Окно`;
	if (lesson.s === "M") return `${getLessonNumber(type, i)}) Методический час`;

	const subject = subjects[lesson.s];
	const group = lesson.c ? groups[lesson.c[0]] : "неизвестный класс";
	const room = lesson.r ? rooms[lesson.r] : "Неопознано";
	const timeArray = getLessonTimeArray(i, type);

	let text = `${getLessonNumber(type, i)}) ${group} - ${subject}\n`;
	text += `🕐 ${timeArray[0]} — ${timeArray[1]}\n`;
	text += `🚪 ${room}`;
	return text;
}

function getLessonNumber(type: LessonType, i: number): string {
	if (type === "pair") return `${Math.floor(i / 2)} пара` ;
	return `${i} урок`;
}

function getLessonTimeArray(i: number, type: LessonType): string[] {
	let timeArray: string[] = [];
	if (type === "pair")
		timeArray = pairTimes[Math.floor(i / 2) - 1];
	else if (type === "lesson")
		timeArray = lessonTimes[i - 1];
	return timeArray;
}

function removeEmptyAtStart(lessons: string[]): void {
	while (lessons[lessons.length - 1].endsWith("Окно"))
		lessons.splice(lessons.length - 1, 1);
}
