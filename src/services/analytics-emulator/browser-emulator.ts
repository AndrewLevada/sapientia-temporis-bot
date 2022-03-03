import { JSDOM, DOMWindow } from "jsdom";
import { Event, PageViewEvent, UserPropertyUpdated } from "../analytics-service";
import { getUserCookies, setUserCookies } from "./emulator-cookies-service";
import { getBrowserSession,
  getStaleQueueUserId, GtagFunction,
  popFromEmulationRequestsQueue,
  pushToEmulationRequestsQueue,
  removeBrowserSession,
  setBrowserSession } from "./emulator-sessions-storage";

const debugLog = true;
const sessionIdleTime = 30000;

export function emulateSendEvent(event: Event): Promise<void> {
  return emulatePageView({ userId: event.userId, url: `/${event.name}` },
    gtag => new Promise(resolve => {
      if (event.params === undefined) event.params = {};
      event.params.event_callback = resolve;
      gtag("event", event.name, event.params);
    }));
}

export function emulateUserPropertiesUpdate(event: UserPropertyUpdated): Promise<void> {
  return emulatePageView({ userId: event.userId, url: null },
    gtag => new Promise(resolve => {
      event.properties = { ...event.properties, crm_id: event.userId };
      gtag("set", "user_properties", event.properties);
      gtag("get", "G-HYFTVXK74M", "user_properties", resolve);
    }));
}

export function emulatePageView(e: PageViewEvent, callback?: (gtag: GtagFunction)=> Promise<void>): Promise<void> {
  const checkHash = Math.floor(Math.random() * 10000);

  const session = getBrowserSession(e.userId);
  if ((session && session.state !== "idle") || isSessionLimitReached()) {
    if (debugLog) console.log(`emulate view QUEUE ${checkHash}`);
    pushToEmulationRequestsQueue({ callback, event: e });
    return Promise.resolve();
  }
  if (debugLog) console.log(`emulate view start NOW ${checkHash}`);

  setBrowserSession(e.userId, { state: "updating" });
  return (session ? loadPage(e, session.window!) : createNewPage(e)).then(() => {
    (callback ? callback(getBrowserSession(e.userId)!.gtag!) : Promise.resolve()).then(() => {
      setBrowserSession(e.userId, { state: "idle" });
      if (debugLog) console.log(`emulate view DONE ${checkHash}`);
      if (!tryRunQueuedViews(e.userId))
        setBrowserSession(e.userId, { timeout: setTimeout(() => {
          if (getBrowserSession(e.userId)?.state !== "idle") return;
          setBrowserSession(e.userId, { state: "finishing" });
          if (debugLog) console.log(`emulate view TO ${checkHash}`);
          const window = getBrowserSession(e.userId)!.window!;
          Promise.all([
            setUserCookies(e.userId, window.document.cookie), window!.close(),
          ]).then(() => {
            removeBrowserSession(e.userId);
            tryRunStaleQueuedViews();
          });
        }, sessionIdleTime) });
    });
  });
}

function createNewPage(event: PageViewEvent): Promise<void> {
  return getUserCookies(event.userId).then(cookies => {
    if (!event.url) event.url = "/";
    const { window } = new JSDOM(getHtml(titlesMap[event.url] || "404", cookies), {
      url: constructEmulatedUrl(event),
      resources: "usable",
      runScripts: "dangerously",
    });

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: any[]) { window.dataLayer.push(args); };
    window.gtag("js", new Date());

    setBrowserSession(event.userId, { window, gtag: window.gtag });
    return loadPage(event, window);
  });
}

function loadPage(event: PageViewEvent, window: DOMWindow): Promise<void> {
  if (!shouldPageNavigate(event, window.location.pathname)) return Promise.resolve();
  window.location.pathname = event.url!;
  window.gtag("config", "G-HYFTVXK74M", { user_id: event.userId, transport_type: "beacon" });
  window.gtag("set", "user_properties", { crm_id: event.userId });
  return new Promise(resolve => {
    window.gtag("get", "G-HYFTVXK74M", "session_id", resolve);
  });
}

function shouldPageNavigate(event: PageViewEvent, path: string): boolean {
  return event.url !== null && path !== constructEmulatedUrl(event);
}

function constructEmulatedUrl(event: PageViewEvent): string {
  return `https://bot.analytics${event.url}`;
}

function isSessionLimitReached(): boolean {
  return false; // TODO: Implement
}

function tryRunStaleQueuedViews(): void {
  if (isSessionLimitReached()) return;
  const userId = getStaleQueueUserId();
  if (!userId) return;
  tryRunQueuedViews(userId);
}

function tryRunQueuedViews(userId: string): boolean {
  if (isSessionLimitReached()) return false;
  const request = popFromEmulationRequestsQueue(userId);
  if (!request) return false;
  emulatePageView(request.event, request.callback).then();
  return true;
}

function getHtml(title: string, cookies: string | null) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script>
    // Set user cookies before analytics
    window.document.cookie = ${cookies}
  
    // Here are several hacky patches to make analytics work in JSDom
    Object.defineProperty(document, "visibilityState", {
      get: function() { return "visible"; }
    });

    window.self = window;

    navigator.sendBeacon = (a,b) => {
        console.log("beakon");
    }
  </script>
  <script src="https://www.googletagmanager.com/gtag/js?id=G-HYFTVXK74M"></script>
</head>
<body><p>OK</p></body>
</html>
`;
}

const titlesMap: Record<string, string> = {
  "/start_command": "Добро пожаловать",
  "/help_command": "Помощь",
  "/default": "Главный экран",
  "/settings": "Настройки",
  "/leaderboard_view": "Лидерборд",
  "/timetable_view": "Расписание",
  "/group_change": "Изменение группы",
  "/unrecognized": "Неопознаный текст",
  "/broadcast_response": "Ответ на трансляцию",
  "/feedback_open": "Обратная связь",
  "/feedback_send": "Отправка обратной связи",
  "/notifications": "Уведоиления о заменах",
  "/notifications_change": "Изменение уведомления о заменах",
  "/notifications_time_change": "Изменение времени уведомлений",
};
