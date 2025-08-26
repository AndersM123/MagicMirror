/* global module */
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
	start() {
		this.logPrefix = "[MMM-ATB]";
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "ATB_FETCH") {
			this.fetchDepartures(payload).catch(err => {
				this.sendSocketNotification("ATB_ERROR", { message: err.message });
			});
		}
	},

	async fetchDepartures({ stopId, lines = [], max = 8 }) {
		if (!stopId) throw new Error("Missing stopId");

		// TODO: Replace with the actual ATB/Entur endpoint you use.
		// Many ATB integrations use Entur’s Journey Planner GraphQL or REST.
		// Example (pseudo): GET https://api.entur.io/journey-planner/v3/... with headers incl. Client-Name
		const url = `https://mpolden.no/atb/v2/departures/${stopId}?direction=inbound`;

		console.log("[MMM-ATB] URL:", url);

		const res = await fetch(url, {
			headers: {
				"Accept": "application/json",
				// "ET-Client-Name": "your-app-id"   // Entur often requires this
			}
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);

		// helper: parse "YYYY-MM-DDTHH:mm:ss(.sss)" as LOCAL time -> ms since epoch
		function parseLocalISO(s) {
			if (!s) return NaN;
			const m = s.match(
				/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/
			);
			if (!m) return NaN;
			const [, Y, M, D, h, mnt, s2, ms = "0"] = m;
			return new Date(+Y, +M - 1, +D, +h, +mnt, +s2, +ms).getTime(); // local time
		}


		const data = await res.json();

		// Map the API response -> front-end friendly array
		// Adjust these paths to match the real payload structure.
		let list = (data.departures || []).map(d => {
			const ts = parseLocalISO(d.scheduledDepartureTime); // <-- use parser
			return {
				line: d.line,
				destination: d.destination,
				aimed: d.scheduledDepartureTime,
				realtime: !!d.isRealtimeData,
				_ts: ts
			};
		});

		if (lines.length) {
			list = list.filter(d => lines.includes(String(d.line)));
		}

		// Build display time (min or clock)

		const now = Date.now();
		list = list
			.filter(d => Number.isFinite(d._ts))
			.sort((a, b) => a._ts - b._ts)
			.slice(0, max)
			.map(d => {
				const diffMin = Math.max(0, Math.round((d._ts - now) / 60000));
				return {
					line: d.line,
					destination: d.destination,
					aimed: d.aimed,
					realtime: d.realtime,
					displayTime: diffMin <= 15
						? `${diffMin} min`
						: new Date(d._ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
				};
			});

		this.sendSocketNotification("ATB_DEPARTURES", list);
	}
});
