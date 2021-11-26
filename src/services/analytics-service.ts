import axios from 'axios';

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
	logEvent({
		userId: e.userId,
		name: "page_view",
		params: {
			"page_title": e.title,
			"page_location": `https://t.me/sapientia_temporis_bot${e.url}`,
		},
	});
}

export function logEvent(event: Event): void {
	axios.post(gaUrl, {
		client_id: event.userId,
		user_id: event.userId,
		events: [event.params ? {
			name: event.name,
			params: event.params,
		} : { name: event.name }],
	}).catch(e => console.log(e));
}

export function logUserGroupChange(userId: string, group: string): void {
	axios.post(gaUrl, {
		client_id: userId,
		user_id: userId,
		user_properties: {
			group: { value: group }
		},
		events: [{
			name: "group_change",
			params: { group },
		}],
	}).catch(e => console.log(e));
}
