import { database } from "firebase-admin";
import Database = database.Database;
import Reference = database.Reference;

type Ref = "feedback" | "users" | "emulatorCookies" |
  "timetable/hashed_version" | "timetable/subjects" |
  "timetable/rooms" | "timetable/schedule" | "timetable/exchange" |
  "timetable/teacher_schedule" | "timetable/teacher_exchange" |
  "timetable/teachers" | "timetable/classes" | "notifications_heap";
let dbInstance!: Database;

export function initDatabase() {
  dbInstance = database();
}

export function db(ref: Ref): Reference {
  return dbInstance.ref(ref);
}
