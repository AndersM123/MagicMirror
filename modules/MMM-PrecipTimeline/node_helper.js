"use strict";
const NodeHelper = require("node_helper");
const https = require("https");

module.exports = NodeHelper.create({
	start () {
		// nothing to init
	},

	socketNotificationReceived (notification, payload) {
		if (notification !== "PT_FETCH") return;
		this.fetchSeries(payload)
			.then(series => {
				this.sendSocketNotification("PT_DATA", { id: payload.instanceId, series });
			})
			.catch(err => {
				this.sendSocketNotification("PT_ERROR", { id: payload.instanceId, error: (err && err.message) || String(err) });
			});
	},

	fetchSeries (cfg) {
		const { lat, lon, altitude, hours = 24, forecastApiVersion = "2.0" } = cfg;
		const ua = cfg.userAgent || "MagicMirror-PrecipTimeline/1.0 (set-your-contact@example.com)";
		const base = `https://api.met.no/weatherapi/locationforecast/${forecastApiVersion}/compact?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}` +
			(altitude != null ? `&altitude=${encodeURIComponent(altitude)}` : "");

		return httpGetJson(base, {
			"Accept": "application/json",
			"User-Agent": ua
		}).then(json => buildHourlySeries(json, hours));
	}
});

/** Simple HTTPS GET -> JSON */
function httpGetJson (url, headers = {}) {
	return new Promise((resolve, reject) => {
		const req = https.get(url, { headers }, (res) => {
			let data = "";
			res.on("data", (chunk) => (data += chunk));
			res.on("end", () => {
				if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
					try {
						resolve(JSON.parse(data));
					} catch (e) {
						reject(new Error("Invalid JSON from MET Norway"));
					}
				} else if (res.statusCode === 304) {
					resolve({ properties: { timeseries: [] } });
				} else {
					reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
				}
			});
		});
		req.on("error", reject);
		req.end();
	});
}

/**
 * Build hourly series [{ time: momentISO, mm, prob, type }]
 * - mm is precipitation in mm/hour
 * - prob is % 0..100 or null
 * - type is "rain" | "snow" | "mix" | null (simple heuristic)
 */
function buildHourlySeries (payload, hours) {
	const out = [];
	const ts = (payload && payload.properties && Array.isArray(payload.properties.timeseries))
		? payload.properties.timeseries
		: [];

	const now = new Date();

	for (const t of ts) {
		const when = new Date(t.time);
		if (when < now) continue;
		if (out.length >= hours) break;

		const inst = t.data && t.data.instant && t.data.instant.details ? t.data.instant.details : {};
		const n1 = t.data && t.data.next_1_hours;
		const n6 = t.data && t.data.next_6_hours;
		const n12 = t.data && t.data.next_12_hours;

		let mm = 0, prob = null;
		if (n1 && n1.details && isNum(n1.details.precipitation_amount)) {
			mm = Number(n1.details.precipitation_amount);
			if (isNum(n1.details.probability_of_precipitation)) prob = Number(n1.details.probability_of_precipitation);
		} else if (n6 && n6.details && isNum(n6.details.precipitation_amount)) {
			mm = Number(n6.details.precipitation_amount) / 6; // normalize to per-hour
			if (isNum(n6.details.probability_of_precipitation)) prob = Number(n6.details.probability_of_precipitation);
		} else if (n12 && n12.details && isNum(n12.details.precipitation_amount)) {
			mm = Number(n12.details.precipitation_amount) / 12;
			if (isNum(n12.details.probability_of_precipitation)) prob = Number(n12.details.probability_of_precipitation);
		}

		// crude classification: use temperature and symbol
		const temp = isNum(inst.air_temperature) ? Number(inst.air_temperature) : null;
		const symbol = (n1 && n1.summary && n1.summary.symbol_code) ||
			(n6 && n6.summary && n6.summary.symbol_code) ||
			(n12 && n12.summary && n12.summary.symbol_code) || "";

		let type = null;
		const sym = String(symbol).toLowerCase();
		const hasSnow = sym.includes("snow");
		const hasSleet = sym.includes("sleet");
		if (hasSnow) type = "snow";
		else if (hasSleet) type = "mix";
		else if (temp != null) type = (temp <= 0 ? "snow" : "rain");

		out.push({
			time: when.toISOString(), // UI converts to moment
			mm,
			prob,
			type
		});
	}

	return out;
}

function isNum (v) { return v !== null && v !== undefined && isFinite(Number(v)); }
