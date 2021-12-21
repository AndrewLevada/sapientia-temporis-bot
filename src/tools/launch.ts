import * as admin from "firebase-admin";
import { init } from "./users-query";

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG as string, "base64").toString("ascii"))),
  databaseURL: process.env.FIREBASE_DATABASE_URL as string,
});

init();

// Execute tool here
