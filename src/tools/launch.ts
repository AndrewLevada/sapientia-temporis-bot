import * as admin from "firebase-admin";
import { init } from "./users-query";
import { makeCsvForInterview } from "./csv-tools";

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG as string, "base64").toString("ascii"))),
  databaseURL: process.env.FIREBASE_DATABASE_URL as string,
});

init();

makeCsvForInterview([
  "879967537",
  "1091139353",
  "1101264795",
  "2045204942",
  "1263694665",
  "827359772",
  "1226773697",
  "1718977580",
  "692975559",
  "1361378845",
  "1285241455",
  "1653291225",
  "1381491635",
  "1917241757",
  "1843951102",
  "1310988554",
  "685154934",
  "1787125012",
  "1242269816",
  "2013925047",
  "1876188139",
  "454928921",
  "1398985706",
  "497835989",
  "2127051412",
]);
