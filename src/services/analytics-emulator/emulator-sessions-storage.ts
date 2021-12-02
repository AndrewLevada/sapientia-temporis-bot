import { BrowserContext, Page } from "puppeteer";
import { PageViewEvent } from "../analytics-service";

interface EmulatedSession {
  state: "idle" | "updating" | "finishing";
  context?: BrowserContext;
  page?: Page;
  timeout: ReturnType<typeof setTimeout> | null;
}

interface QueuedEmulationRequest {
  event: PageViewEvent;
  callback?: (page: Page)=> Promise<void>;
}

const sessions: Record<string, EmulatedSession> = {};
const queues: Record<string, QueuedEmulationRequest[]> = {};

export function getBrowserSession(userId: string): EmulatedSession | undefined {
  return sessions[userId];
}

export function setBrowserSession(userId: string, value: Partial<EmulatedSession>): void {
  if (value.timeout !== undefined && sessions[userId].timeout) clearTimeout(sessions[userId].timeout!);
  if (!sessions[userId]) sessions[userId] = { state: "updating", timeout: null };
  sessions[userId] = { ...sessions[userId], ...value };
}

export function removeBrowserSession(userId: string) {
  delete sessions[userId];
  delete queues[userId];
}

export function popFromEmulationRequestsQueue(userId: string): QueuedEmulationRequest | undefined {
  return queues[userId] ? queues[userId].shift() : undefined;
}

export function pushToEmulationRequestsQueue(request: QueuedEmulationRequest): void {
  const { userId } = request.event;
  if (!queues[userId]) queues[userId] = [];
  queues[userId].push(request);
}
