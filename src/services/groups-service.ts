import { UserInfo, UserType } from "./user-service";
import { db } from "./db";

interface GroupMaps {
  decode: Record<string, string>;
  encode: Record<string, string>;
}

const classesMaps: GroupMaps = { encode: {}, decode: {} };
const teachersMaps: GroupMaps = { encode: {}, decode: {} };

export function initGroupsService() {
  db("timetable/classes").on("value", snap => {
    if (!snap.val()) return;
    classesMaps.decode = snap.val();
    classesMaps.encode = {};
    Object.entries(classesMaps.decode).forEach(([code, name]) => { classesMaps.encode[name] = code; });
  });

  db("timetable/teachers").on("value", snap => {
    if (!snap.val()) return;
    teachersMaps.decode = snap.val();
    teachersMaps.encode = {};
    Object.entries(teachersMaps.decode).forEach(([code, name]) => { teachersMaps.encode[name] = code; });
  });
}

export function isGroupWithPairs(group: string): boolean {
  // Only 10th and 11th
  return +group >= 42;
}

export function isGroupUpper(group: string): boolean {
  // Only 6th and 7th
  return +group >= 28 && +group <= 35;
}

export function searchForTeacher(s: string): { fullName: string; code: string; } | null {
  const a = Object.entries(getGroupMap("encode", "teacher"));
  for (const t of a)
    if (t[0].toLowerCase().includes(s.toLowerCase()))
      return {
        fullName: t[0],
        code: t[1],
      };

  return null;
}

function getGroupMap(mapType: "decode" | "encode", userType: UserType): Record<string, string> {
  return (userType === "student" ? classesMaps : teachersMaps)[mapType];
}

// Two methods below could be merged, but export should stay the same

export function decodeGroup(value: string | UserInfo, type?: UserType): string | undefined {
  if (typeof value === "object") {
    type = value.type;
    value = value.group;
  }

  return getGroupMap("decode", type!)[value];
}

export function encodeGroup(value: string, type: UserType): string | undefined {
  return getGroupMap("encode", type)[value];
}
