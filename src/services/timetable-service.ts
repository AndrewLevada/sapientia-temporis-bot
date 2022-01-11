import axios from "axios";
import { inverseGroups, isGroupUpper, isGroupWithPairs } from "./groups-service";
import { UserInfo, UserType } from "./user-service";
import { getDayOfWeekWithDelta, sanitizeTextForMD } from "../utils";
import { db } from "./db";

let subjects: any | null;
let rooms: any | null;

const pairTimes: string[][] = [
  ["8:00", "9:30"],
  ["9:40", "11:10"],
  ["11:25", "12:55"],
  ["13:00", "14:30"],
  ["14:40", "16:10"],
  ["16:25", "17:50"],
];

const lessonTimes: string[][] = [
  ["8:00", "8:40"],
  ["8:50", "9:30"],
  ["9:45", "10:25"],
  ["10:35", "11:15"],
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
type Lesson = StudentLesson | TeacherLesson;

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
  wasMutated: boolean;
}

export function initTimetableService() {
  db("timetable/subjects").on("value", snapshot => { subjects = snapshot.val(); });
  db("timetable/rooms").on("value", snapshot => { rooms = snapshot.val(); });
}

export function getTimetableForDelta(info: UserInfo, delta: number): Promise<DateTimetable> {
  const now = new Date();
  const day = getDayOfWeekWithDelta(delta);
  const date = new Date(now.valueOf() + (day - now.getDay()) * (24 * 60 * 60 * 1000));
  return getTimetable(info, date);
}

export function getTimetable(info: UserInfo, date: Date): Promise<DateTimetable> {
  return validateHashedData().then(() => constructTimetable(info, date));
}

function validateHashedData(): Promise<void> {
  return Promise.all([
    axios.get("http://raspisanie.nikasoft.ru/check/47307204.html").then(res => res.data as string),
    db("timetable/hashed_version").once("value").then(snap => snap.val() as string),
  ]).then(([currentVersion, cachedVersion]) => {
    if (cachedVersion === currentVersion) return Promise.resolve();
    return updateHashedData(currentVersion);
  });
}

function updateHashedData(version: string): Promise<void> {
  const hashPromise = db("timetable/hashed_version").set(version);

  return axios.get(`http://raspisanie.nikasoft.ru/static/public/${version}`).then(res => {
    const rawData: string = (res.data as string).split("var NIKA=\r\n")[1].split(";")[0];
    const data = JSON.parse(rawData);
    const periods = Object.keys(data.CLASS_SCHEDULE).sort();
    const period = periods[periods.length - 1];

    return Promise.all([
      hashPromise,
      db("timetable/subjects").set(data.SUBJECTS),
      db("timetable/rooms").set(data.ROOMS),
      db("timetable/schedule").set(data.CLASS_SCHEDULE[period]),
      db("timetable/exchange").set(correctExchangeDatesFormat(data.CLASS_EXCHANGE)),
      db("timetable/teacher_schedule").set(data.TEACH_SCHEDULE[period]),
      db("timetable/teacher_exchange").set(correctExchangeDatesFormat(data.TEACH_EXCHANGE)),
    ]).then();
  });
}

function correctExchangeDatesFormat(data: any): any {
  const copy: any = {};
  for (const group of Object.keys(data)) {
    copy[group] = {};
    for (const [dateKey, dateValue] of Object.entries(data[group]))
      copy[group][dateKey.replace(/\./g, "-")] = dateValue;
  }
  return copy;
}

function constructTimetable(info: UserInfo, date: Date): Promise<DateTimetable> {
  const dateString: string = `${date.getDate() < 10 ? "0" : ""}${date.getDate()}-${date.getMonth() < 9 ? "0" : ""}${date.getMonth() + 1}-${date.getFullYear()}`;

  return Promise.all([
    (info.type === "teacher" ? db("timetable/teacher_schedule") : db("timetable/schedule")).child(`${info.group}`).once("value"),
    (info.type === "teacher" ? db("timetable/teacher_exchange") : db("timetable/exchange")).child(`${info.group}/${dateString}`).once("value"),
  ]).then(([scheduleSnapshot, exchangeSnapshot]) => {
    const timetable: Timetable = {
      schedule: scheduleSnapshot.val(),
      exchange: exchangeSnapshot.val(),
    };

    let result: string[];
    let wasMutated: boolean;

    if (info.type === "student") {
      if (isGroupWithPairs(info.group))
        [result, wasMutated] = getLessonsAsPairs(timetable, info.type, date);
      else [result, wasMutated] = getLessons(timetable, info.type, date);

      if (isGroupUpper(info.group) && result.length > 0)
        removeEmptyAtStart(result);
    } else
      [result, wasMutated] = getLessonsAsPairs(timetable, info.type, date);

    if (result.length === 0) return { lessons: ["Свободный день"], date, wasMutated };
    return { lessons: result.reverse(), date, wasMutated };
  });
}

function getLessonsAsPairs(timetable: Timetable, type: UserType, date: Date): [string[], boolean] {
  const result: string[] = [];
  let wasMutated = false;

  for (let j = 6; j > 0; j--) {
    const index: string[] = [getLessonIndex(date.getDay(), j * 2), getLessonIndex(date.getDay(), j * 2 - 1)];
    const lessons: (Lesson | undefined)[] = [timetable.schedule[index[0]], timetable.schedule[index[1]]];
    let wasLessonMutated = false;

    if (timetable.exchange) {
      let wasAlsoMutated = false;
      [lessons[0], wasLessonMutated] = mutateExchange(lessons[0], j * 2, timetable.exchange);
      [lessons[1], wasAlsoMutated] = mutateExchange(lessons[1], j * 2 - 1, timetable.exchange);
      if (wasAlsoMutated) wasLessonMutated = true;
    }
    if (wasLessonMutated) wasMutated = true;

    if (isPair(type, lessons)) {
      if (lessons[0] || result.length > 0)
        result.push(getLessonText(lessons[0], "pair", j * 2, type, wasLessonMutated));
    } else {
      if (lessons[0] || lessons[1] || result.length > 0)
        result.push(getLessonText(lessons[0], "lesson", j * 2, type, wasLessonMutated));
      if (lessons[1] || result.length > 0)
        result.push(getLessonText(lessons[1], "lesson", j * 2 - 1, type, wasLessonMutated));
    }
  }

  return [result, wasMutated];
}

function isPair(type: UserType, lessons: (Lesson | undefined)[]): boolean {
  const [a, b] = [lessons[0], lessons[1]];
  if (type === "student") return a?.s[0] === b?.s[0];
  const [ac, bc] = [(a as TeacherLesson)?.c, (b as TeacherLesson)?.c];
  return ac === bc || (!!ac && !!bc && ac[0] === bc[0]);
}

function getLessons(timetable: Timetable, type: UserType, date: Date): [string[], boolean] {
  const result: string[] = [];
  let wasMutated = false;

  for (let i = 13; i > 0; i--) {
    const index: string = getLessonIndex(date.getDay(), i);
    let lesson: Lesson | undefined = timetable.schedule[index];
    let wasLessonMutated = false;

    if (timetable.exchange)
      [lesson, wasLessonMutated] = mutateExchange(lesson, i, timetable.exchange);
    if (wasLessonMutated) wasMutated = true;

    if (lesson || result.length > 0)
      result.push(getLessonText(lesson, "lesson", i, type, wasLessonMutated));
  }

  return [result, wasMutated];
}

function getLessonIndex(day: number, i: number): string {
  return `${day}${i < 10 ? "0" : ""}${i}`;
}

function mutateExchange(lesson: Lesson | undefined, index: number, exchange: any): [Lesson | undefined, boolean] {
  const rule: any = exchange[index.toString()];
  if (!rule) return [lesson, false];
  if (rule.s === "F") return [undefined, true];
  return [rule, true];
}

// eslint-disable-next-line max-len
function getLessonText(lesson: Lesson | undefined, lessonType: LessonType, i: number, userType: UserType, wasMutated: boolean): string {
  if (userType === "student") return decorateLine(getStudentLessonText(lesson as StudentLesson, lessonType, i), wasMutated);
  return decorateLine(getTeacherLessonText(lesson as TeacherLesson, lessonType, i), wasMutated);
}

function decorateLine(text: string, wasMutated?: boolean): string {
  return `${wasMutated ? "_" : ""}${text}${wasMutated ? "_" : ""}`;
}

function getStudentLessonText(lesson: StudentLesson | undefined, type: LessonType, i: number): string {
  if (!lesson) return `${getLessonNumber(type, i)}\\) Окно`;

  const subject = sanitizeTextForMD(subjects[lesson.s[0]]) || "?";
  const room = lesson.r ? rooms[lesson.r[0]] || "нет" : "нет";
  const roomMore = lesson.g ? ` и ${rooms[lesson.r[1]]}` : "";
  const timeArray = getLessonTimeArray(i, type);

  let text = `${getLessonNumber(type, i)}\\) ${subject}\n`;
  text += `🕐 ${timeArray[0]} — ${timeArray[1]}\n`;
  text += `🚪 ${room}${roomMore}`;
  return text;
}

function getTeacherLessonText(lesson: TeacherLesson | undefined, type: LessonType, i: number): string {
  if (!lesson) return `${getLessonNumber(type, i)}\\) Окно`;
  if (lesson.s === "M") return `${getLessonNumber(type, i)}\\) Методический час`;

  const subject = sanitizeTextForMD(subjects[lesson.s]) || "?";
  const group = lesson.c ? inverseGroups[lesson.c[0]].toUpperCase() : "?";
  const room = lesson.r ? rooms[lesson.r] || "нет" : "нет";
  const timeArray = getLessonTimeArray(i, type);

  let text = `${getLessonNumber(type, i)}\\) *${group}* \\- ${subject}\n`;
  text += `🕐 ${timeArray[0]} — ${timeArray[1]} в ${room} каб\\.`;
  return text;
}

function getLessonNumber(type: LessonType, i: number): string {
  if (type === "pair") return `${Math.floor(i / 2)} пара`;
  return `${i} урок`;
}

function getLessonTimeArray(i: number, type: LessonType): string[] {
  let timeArray: string[] = [];
  if (type === "pair")
    timeArray = pairTimes[Math.floor(i / 2) - 1] || ["?", "?"];
  else if (type === "lesson")
    timeArray = lessonTimes[i - 1] || ["?", "?"];
  return timeArray;
}

function removeEmptyAtStart(lessons: string[]): void {
  while (lessons[lessons.length - 1].endsWith("Окно"))
    lessons.splice(lessons.length - 1, 1);
}
