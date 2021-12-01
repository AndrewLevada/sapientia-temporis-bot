import puppeteer, { Browser, Page } from "puppeteer";
import { Event, PageViewEvent, UserPropertyUpdated } from "../analytics-service";
import { analyticsServerPort } from "./server";
import { getEmulatorCookies, setEmulatorCookies } from "./emulator-cookies-service";

let browser!: Browser;
const sessions: Record<string, EmulatedSession> = {};

interface EmulatedSession {
  page: Page;
  timeout?: ReturnType<typeof setTimeout>;
  queue?: { callback: ((page: Page)=> void), event: PageViewEvent }[];
}

export function startAnalyticsBrowserEmulator(): Promise<void> {
  return puppeteer.launch({ headless: true, args: ["--no-sandbox"] }).then(v => {
    browser = v;
  });
}

export function emulateSendEvent(e: Event): Promise<void> {
  return emulatePageView({ userId: e.userId, url: `/${e.name}` })
    .then(page => page.evaluate((v: string) => {
      const event = JSON.parse(v);
      gtag("event", event.name, event.params || {});
    }, JSON.stringify(e)))
    .then(() => runQueuedViews(e.userId));
}

export function emulateUserPropertiesUpdate(e: UserPropertyUpdated): Promise<void> {
  return emulatePageView({ userId: e.userId, url: null }).then(page => {
    e.properties = { ...e.properties, crm_id: e.userId };
    return page.evaluate((v: string) => {
      const event = JSON.parse(v);
      gtag("set", "user_properties", event.properties);
    }, JSON.stringify(e));
  }).then(() => runQueuedViews(e.userId));
}

export function safeEmulatePageView(e: PageViewEvent): Promise<void> {
  return emulatePageView(e).then(() => runQueuedViews(e.userId));
}

function emulatePageView(e: PageViewEvent): Promise<Page> {
  const session = sessions[e.userId];
  const checkHash = Math.floor(Math.random() * 1000);
  console.log(`emulatePageView start ${checkHash} ${e.url}`);
  if (shouldQueueViewEmulation(session)) {
    console.log("as queue");
    return new Promise<Page>(resolve => {
      if (!session.queue) sessions[e.userId].queue = [];
      sessions[e.userId].queue!.push({ callback: resolve, event: e });
    });
  }
  console.log("as now");

  return (session ? continueSession(session, e) : createNewPage(e)).then(page => {
    console.log(`emulatePageView done ${checkHash} ${e.url}`);
    sessions[e.userId]!.timeout = setTimeout(() => {
      if (sessions[e.userId]) delete sessions[e.userId];
      page.cookies().then(cookies => { // Issue here (page is closed sometimes)
        setEmulatorCookies(e.userId, cookies);
        page.close();
      });
    }, 14000);
    return page;
  });
}

function shouldQueueViewEmulation(session: EmulatedSession): boolean {
  return session && (!session.timeout || (!!session.queue && session.queue.length !== 0));
}

function createNewPage(e: PageViewEvent): Promise<Page> {
  sessions[e.userId] = { page: null as unknown as Page };
  return browser.newPage().then(page => {
    sessions[e.userId] = { page };
    return page.emulate(puppeteer.devices["Pixel 4"])
      .then(() => getEmulatorCookies(e.userId))
      .then(cookies => (cookies ? Promise.all(cookies.map(c => page.setCookie(c))) : Promise.resolve()).then())
      .then(() => loadPage(page, e))
      .then(() => page);
  });
}

function continueSession(session: EmulatedSession, e: PageViewEvent): Promise<Page> {
  sessions[e.userId].timeout = undefined;
  if (session.timeout) clearTimeout(session.timeout);
  return loadPage(session.page, e).then(() => session.page);
}

function loadPage(page: Page, e: PageViewEvent): Promise<void> {
  if (page.url() === "about:blank" && e.url === null) e.url = "/";
  if (!shouldPageNavigate(e, page)) return page.click("body");
  return page.goto(constructEmulatedUrl(e))
    .then(() => page.evaluate((userId: string) => {
      gtag("config", "G-HYFTVXK74M", { user_id: userId, debug_mode: true });
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

function runQueuedViews(userId: string): void {
  const queue = sessions[userId]?.queue;
  console.log(`runQueuedViews ${queue?.length}`);
  if (!queue || queue.length === 0) return;
  const o = queue.shift()!;
  emulatePageView(o.event).then(page => o.callback(page))
    .then(() => runQueuedViews(userId));
}

declare function gtag(...args: any[]): void;
