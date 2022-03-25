// Use node-fetch v2
const fetch = require("node-fetch");

module.exports.handler = async function (event, context) {
	if (await shouldWakeUp())
		await fetch(process.env.SERVER_URL);
	return { statusCode: 200 };
};

async function shouldWakeUp() {
	process.env.TZ = "Europe/Moscow";
	const now = new Date();
	const timeMark = `${timeToString(now.getHours())}:${timeToString(now.getMinutes())}`;
	const res = await fetch(`${process.env.HEAP_URL}/${timeMark}.json`);
	const data = await res.json();
	return !!data && !!data.length;
}

function timeToString(v) {
	if (v === 0) return "00";
	if (v < 10) return `0${v}`;
	return v.toString();
}

// Non-secret env:
// SERVER_URL: https://sapientia-temporis-bot.herokuapp.com
// HEAP_URL: https://sapientia-temporis-bot-default-rtdb.europe-west1.firebasedatabase.app/notifications_heap
