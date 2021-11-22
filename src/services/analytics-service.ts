import axios from 'axios';

export interface Event {
	userId: string,
	name: string,
	params?: any,
}

export function logEvent(event: Event): void {
	axios.post(`https://google-analytics.com/mp/collect?api_secret=${process.env.GA_API_KEY}&measurement_id=G-HYFTVXK74M`, {
		client_id: event.userId,
		user_id: event.userId,
		events: [event.params ? {
			name: event.name,
			params: event.params,
		} : { name: event.name }],
	}).then().catch(e => console.log(e));
}
