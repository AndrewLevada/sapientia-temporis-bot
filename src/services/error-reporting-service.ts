import { Context } from "telegraf";
import { database } from "firebase-admin";
import Reference = database.Reference;
import Database = database.Database;
import { getUserIdFromCtx } from "../utils";

let errorsRef!: Reference;

export function init() {
  const db: Database = database();
  errorsRef = db.ref("error_reports");
}

export function reportError(reason: any, ctx?: Context): Promise<void> {
  return errorsRef.child(`${new Date().valueOf()}`).set({
    reason: reason ? reason.toString() : "undefined",
    userId: ctx ? getUserIdFromCtx(ctx) : "no-context",
    contextMessage: ctx ? JSON.stringify(ctx.update) : "no-context",
    trace: new Error().stack,
  });
}
