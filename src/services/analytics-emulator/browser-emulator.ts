import puppeteer, { Browser, Page } from "puppeteer";
import { Event, PageViewEvent, UserPropertyUpdated } from "../analytics-service";
import { analyticsServerPort } from "./server";
import { getUserCookies, setUserCookies } from "./emulator-cookies-service";
import { getBrowserSession, popFromEmulationRequestsQueue,
  pushToEmulationRequestsQueue,
  removeBrowserSession,
  setBrowserSession } from "./emulator-sessions-storage";

const debugLog = false;
const sessionIdleTime = 14000;
let browser!: Browser;

export function startAnalyticsBrowserEmulator(): Promise<void> {
  return puppeteer.launch({ headless: true, args: ["--no-sandbox"] }).then(v => {
    browser = v;
  });
}

export function emulateSendEvent(e: Event): Promise<void> {
  return emulatePageView(
    { userId: e.userId, url: `/${e.name}` },
    page => page.evaluate((v: string) => new Promise(resolve => {
      const event = JSON.parse(v);
      event.params.event_callback = resolve;
      gtag("event", event.name, event.params);
    }), JSON.stringify({ params: {}, ...e })).then(),
  );
}

export function emulateUserPropertiesUpdate(e: UserPropertyUpdated): Promise<void> {
  return emulatePageView({ userId: e.userId, url: null }, page => {
    e.properties = { ...e.properties, crm_id: e.userId };
    return page.evaluate((v: string) => {
      const event = JSON.parse(v);
      gtag("set", "user_properties", event.properties);
    }, JSON.stringify(e)).then();
  });
}

export function emulatePageView(e: PageViewEvent, callback?: (page: Page)=> Promise<void>): Promise<void> {
  const checkHash = Math.floor(Math.random() * 1000);
  if (debugLog) console.log(`emulatePageView start ${checkHash} ${e.url}`);

  const session = getBrowserSession(e.userId);
  if (session && session.state !== "idle") {
    if (debugLog) console.log("as queue");
    pushToEmulationRequestsQueue({ callback, event: e });
    return Promise.resolve();
  }
  if (debugLog) console.log("as now");

  setBrowserSession(e.userId, { state: "updating" });
  return (session ? continueSession(e) : createNewPage(e)).then(() => {
    (callback ? callback(getBrowserSession(e.userId)!.page!) : Promise.resolve()).then(() => {
      setBrowserSession(e.userId, { state: "idle" });
      if (debugLog) console.log(`emulatePageView done ${checkHash} ${e.url}`);
      if (!tryRunQueuedViews(e.userId))
        setBrowserSession(e.userId, { timeout: setTimeout(() => {
          if (getBrowserSession(e.userId)?.state !== "idle") return;
          setBrowserSession(e.userId, { state: "finishing" });
          if (debugLog) console.log(`emulatePageView timeout ${checkHash} ${e.url}`);
          getBrowserSession(e.userId)!.page!.cookies()
            .then(cookies => Promise.all([
              setUserCookies(e.userId, cookies),
              getBrowserSession(e.userId)!.context!.close(),
            ]).then(() => removeBrowserSession(e.userId)));
        }, sessionIdleTime) });
    });
  });
}

function createNewPage(e: PageViewEvent): Promise<void> {
  return browser.createIncognitoBrowserContext()
    .then(context => context.newPage()
      .then(page => page.emulate(puppeteer.devices["Pixel 4"])
        .then(() => getUserCookies(e.userId))
        .then(cookies => (cookies ? Promise.all(cookies.map(c => page.setCookie(c))) : Promise.resolve()).then())
        .then(() => {
          setBrowserSession(e.userId, { context, page });
          return loadPage(page, e);
        })));
}

function continueSession(e: PageViewEvent): Promise<void> {
  return loadPage(getBrowserSession(e.userId)!.page!, e);
}

function loadPage(page: Page, e: PageViewEvent): Promise<void> {
  if (page.url() === "about:blank" && e.url === null) e.url = "/";
  if (!shouldPageNavigate(e, page)) return page.click("body");
  return page.goto(constructEmulatedUrl(e))
    .then(() => page.evaluate((userId: string) => {
      gtag("config", "G-HYFTVXK74M", { user_id: userId, transport_type: "beacon" });
      gtag("set", "user_properties", { crm_id: userId });
    }, e.userId))
    .then(() => page.click("body"));
}

function shouldPageNavigate(e: PageViewEvent, page: Page): boolean {
  return e.url !== null && page.url() !== constructEmulatedUrl(e);
}

function constructEmulatedUrl(e: PageViewEvent): string {
  return `http://localhost:${analyticsServerPort}${e.url}`;
}

function tryRunQueuedViews(userId: string): boolean {
  if (debugLog) console.log("test queue");
  const request = popFromEmulationRequestsQueue(userId);
  if (!request) return false;
  if (debugLog) console.log("queue pop");
  emulatePageView(request.event, request.callback).then();
  return true;
}

declare function gtag(...args: any[]): void;
