import puppeteer, { Browser, Page } from "puppeteer";
import { PageViewEvent } from "../analytics-service";
import { analyticsServerPort } from "./server";
import { getEmulatorCookies, setEmulatorCookies } from "./emulator-cookies-service";

let browser!: Browser;
const sessions: Record<string, EmulatedSession> = {};

interface EmulatedSession {
  page: Page;
  timeout?: ReturnType<typeof setTimeout>;
}

export function startAnalyticsBrowserEmulator(): Promise<void> {
  return puppeteer.launch({ headless: true, args: ["--no-sandbox"] }).then(v => {
    browser = v;
  });
}

export async function viewPage(e: PageViewEvent): Promise<void> {
  const session = sessions[e.userId];
  if (session && !session.timeout) return;
  const page = session ? await continueSession(session, e) : await createNewPage(e);
  sessions[e.userId]!.timeout = setTimeout(() => {
    if (sessions[e.userId]) delete sessions[e.userId];
    page.cookies().then(cookies => {
      setEmulatorCookies(e.userId, cookies);
      page.close();
    });
  }, 14000);
}

async function createNewPage(e: PageViewEvent): Promise<Page> {
  const page = await browser.newPage();
  sessions[e.userId] = { page };
  await page.emulate(puppeteer.devices["Pixel 4"]);
  const cookies = await getEmulatorCookies(e.userId);
  // eslint-disable-next-line no-await-in-loop
  if (cookies) for (const c of cookies) await page.setCookie(c);
  await loadPage(page, e);
  return page;
}

async function continueSession(session: EmulatedSession, e: PageViewEvent): Promise<Page> {
  if (session.timeout) clearTimeout(session.timeout);
  await loadPage(session.page, e);
  return session.page;
}

async function loadPage(page: Page, e: PageViewEvent): Promise<void> {
  await page.goto(`http://localhost:${analyticsServerPort}/${e.url}?pageTitle=${encodeURI(e.title)}`);
  await page.evaluate((userId: string) => {
    gtag("config", "G-HYFTVXK74M", { user_id: userId });
    gtag("set", "user_properties", { crm_id: userId });
  }, e.userId);
  await page.click("body");
}

declare function gtag(...args: any[]): void;
