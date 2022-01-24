import { getTeachersList,
  getUsersCount,
  getUsersLeaderboard,
  getUsersWithExchangeNotificationsOn } from "./user-service";
import { decodeGroup } from "./groups-service";

export interface StudentsSection {
  label: string;
  condition: (n: number)=> boolean;
}

export const studentReportSections: StudentsSection[] = [{
  label: "0 (1)",
  condition: n => n === 1,
}, {
  label: "1 (2 - 4)",
  condition: n => n >= 2 && n <= 4,
}, {
  label: "2 (5 - 10)",
  condition: n => n >= 5 && n <= 10,
}, {
  label: "3 (11 - 19)",
  condition: n => n >= 11 && n <= 19,
}, {
  label: "4 (20+)",
  condition: n => n >= 20,
}];

export function getStudentsReport(): Promise<string> {
  const top = getUsersLeaderboard();
  const sections: [string, number][][] = studentReportSections.map(() => []);

  for (const group of top)
    for (let i = 0; i < studentReportSections.length; i++)
      if (studentReportSections[i].condition(group[1])) sections[i].push(group);

  return Promise.all([getUsersCount(), getUsersCount("student")]).then(([usersCount, studentsCount]) => {
    let text = `Students report. Total count ${usersCount}/${studentsCount}\n\n`;
    text += sections.map((section, i) => `*️⃣ ${studentReportSections[i].label} \n${
      section.map(v => `${decodeGroup(v[0], "student")} - ${v[1]}`).join("\n")
    }`).join("\n\n");
    return text;
  });
}

export function getExchangeNotificationsReport(): Promise<string> {
  return getUsersWithExchangeNotificationsOn().then(users => Object.values(users))
    .then(users => {
      const students: Record<string, number> = {};
      const teachers: Record<string, number> = {};

      for (const user of users) {
        const heap = user.type === "student" ? students : teachers;
        if (heap[user.group]) heap[user.group]++;
        else heap[user.group] = 1;
      }

      let text = "*️⃣ Students\n";
      text += Object.entries(students).map(v => `${decodeGroup(v[0], "student")} - ${v[1]}`).join("\n");
      text += "\n\n*️⃣ Teachers\n";
      text += Object.entries(teachers).map(v => `${decodeGroup(v[0], "teacher")} - ${v[1]}`).join("\n");
      return text;
    });
}

export function getTeachersReport(): Promise<string> {
  return getTeachersList().then(l => l.map(v => decodeGroup(v, "teacher")).join("\n"));
}
