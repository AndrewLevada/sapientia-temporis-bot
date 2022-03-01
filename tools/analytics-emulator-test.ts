import { emulateSendEvent } from "../src/services/analytics-emulator/browser-emulator";
import { getBrowserSession } from "../src/services/analytics-emulator/emulator-sessions-storage";

const firstStageLag = 6 * 1000;
const secondStageLag = 10 * 1000;

// eslint-disable-next-line import/prefer-default-export
export function loadTestAnalyticsEmulator(loadFactor: number) {
  console.log("LOAD TEST STARTED");
  Promise.all(Array(loadFactor).fill(null).map((v, i) => emulateLoad(i)))
    .then(() => console.log("LOAD TEST DONE"))
    .then(() => later(40 * 1000))
    .then(() => getBrowserSession("test"));
}

function emulateLoad(i: number): Promise<void> {
  return Promise.all([
    later(getRandomDelay(firstStageLag)).then(() => emulateSendEvent({ userId: `loadtest-${i}`, name: "load" })),
    later(getRandomDelay(secondStageLag)).then(() => emulateSendEvent({ userId: `loadtest-${i}`, name: "load" })),
  ]).then();
}

function getRandomDelay(max: number): number {
  return Math.round(Math.random() * max);
}

function later(delay: number) {
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  });
}
