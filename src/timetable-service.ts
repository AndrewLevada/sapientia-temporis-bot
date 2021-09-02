import axios from 'axios';
import { database } from 'firebase-admin';
import Reference = database.Reference;
import Database = database.Database;
import { getWeek } from './utils';

let db! : Database;
let hashedVersionRef!: Reference;
let subjectsRef!: Reference;
let roomsRef!: Reference;
let scheduleRef!: Reference;

let subjects: any | null;
let rooms: any | null;

const times: string[][] = [
	["8:00", "9:30"],
	["9:40", "11:10"],
	["11:25", "12:55"],
	["13:00", "14:30"],
	["14:40", "16:10"]
]

export function init() {
	db = database();
	hashedVersionRef = db.ref("hashed_version");
	subjectsRef = db.ref("subjects");
	roomsRef = db.ref("rooms");
	scheduleRef = db.ref("schedule");

	subjectsRef.on('value', snapshot => { subjects = snapshot.val() });
	roomsRef.on('value', snapshot => { rooms = snapshot.val() });
}

export function getTimetable(group: string, period: string, dateDelta: number) : Promise<string[]> {
	return new Promise<string[]>(resolve => {
		validateHashedData().then(() => constructTimetable(group, period, dateDelta)).then(resolve);
	});
}

function validateHashedData() : Promise<void> {
	return new Promise(resolve => {
		axios.get("http://raspisanie.nikasoft.ru/check/47307204.html").then(checkRes => {
			hashedVersionRef.once('value').then(data => {
				if (data.val() as string === checkRes.data as string) resolve();
				else updateHashedData(checkRes.data as string).then(resolve);
			});
		});
	});
}

function updateHashedData(version: string) : Promise<void> {
	return new Promise(resolve => {
		hashedVersionRef.set(version);

		axios.get(`http://raspisanie.nikasoft.ru/static/public/${version}`).then(res => {
			const rawData : string = (res.data as string).split("var NIKA=\r\n")[1].split(";")[0];
			const data = JSON.parse(rawData);

			Promise.all([
				subjectsRef.set(data['SUBJECTS']),
				roomsRef.set(data['ROOMS']),
				scheduleRef.set(data['CLASS_SCHEDULE'])])
				.then(() => resolve());
		});

		resolve();
	});
}

function constructTimetable(group: string, period: string, dateDelta: number) : Promise<string[]> {
	return new Promise<string[]>(resolve => {
		const day: number = (new Date()).getDay() + dateDelta;
		const isUpperWeek: boolean = getWeek(new Date()) % 2 === 1;

		scheduleRef.child(`${period}/${group}`).once('value').then(s => {
			const sVal = s.val();
			const result : string[] = [];
			for (let j = 5; j > 0; j--) {
				const index : string[] = [getLessonIndex(day, j * 2), getLessonIndex(day, j * 2 - 1)];
				const lesson : any | undefined = sVal[index[isUpperWeek ? 0 : 1]];

				if (lesson) result.push(getLessonText(lesson, j));
				else if (result.length > 0) result.push(`${j}) Окно`);
			}

			if (result.length === 0) resolve(["Сегодня нет пар"]);
			resolve(result.reverse());
		});
	});
}

function getLessonIndex(day: number, i: number) : string {
	return `${day}${i < 10 ? "0" : ''}${i}`;
}

function getLessonText(lesson: any, j: number) : string {
	const subject = subjects[lesson["s"][0]];
	const room = rooms[lesson["r"][0]];
	const roomMore = lesson["g"] ? ` и ${rooms[lesson["r"][1]]}` : '';
	const time = `${times[j - 1][0]} — ${times[j - 1][1]}`;

	let text = `${j}) ${subject}\n`;
	text += `🕐 ${time}\n`;
	text += `🚪 ${room}${roomMore}`;
	return text;
}
