import axios from "axios";
import { adminUserId } from "../env";
import { viewPage } from "./analytics-reporter/browser-emulator";

const gaUrl = `https://google-analytics.com/mp/collect?api_secret=${process.env.GA_API_KEY}&measurement_id=G-HYFTVXK74M`;

export interface Event {
  userId: string;
  name: string;
  params?: any;
}

export interface PageViewEvent {
  userId: string;
  title: string;
  url: string;
}

export function logPageView(e: PageViewEvent): void {
  if (e.userId === adminUserId) return;
  viewPage(e).then();
}

export function logEvent(event: Event): void {
  if (event.userId === adminUserId) return;
  axios.post(gaUrl, {
    client_id: event.userId,
    user_id: event.userId,
    events: [event.params ? {
      name: event.name,
      params: { ...event.params, user_id: event.userId },
    } : { name: event.name, params: { user_id: event.userId } }],
  }).catch(e => console.log(e));
}

export function logUserGroupChange(userId: string, group: string): void {
  if (userId === adminUserId) return;
  axios.post(gaUrl, {
    client_id: userId,
    user_id: userId,
    user_properties: {
      group: { value: group },
    },
    events: [{
      name: "group_change",
      params: { group, user_id: userId },
    }],
  }).catch(e => console.log(e));
}
