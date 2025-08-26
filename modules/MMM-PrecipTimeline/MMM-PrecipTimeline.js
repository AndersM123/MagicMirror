/* global Module, Log, moment */

Module.register("MMM-PrecipTimeline", {
	defaults: {
		lat: 63.40872600624022,
		lon: 10.357577977528827,
		altitude: null,                 // meters (optional)
		hours: 24,                      // how many future hours to plot
		labelEvery: 3,                  // show hour label every N bars
		maxBarHeight: 60,               // px
		updateInterval: 10 * 60 * 1000, // MET Norway requires >= 10 minutes
		forecastApiVersion: "2.0",
		userAgent: "MagicMirror-PrecipTimeline/1.0 (set-your-contact@example.com)",
		showProbability: true,           // show % labels when present
		debugSample: false,
		minNonZeroBar: 2
	},

	start () {
		if (!this.config.lat || !this.config.lon) {
			Log.error("[MMM-PrecipTimeline] Please set lat & lon in config.");
			return;
		}
		if (this.config.updateInterval < 10 * 60 * 1000) {
			Log.warn("[MMM-PrecipTimeline] updateInterval raised to 10 minutes to respect MET Norway.");
			this.config.updateInterval = 10 * 60 * 1000;
		}

		this.series = [];        // [{ time: moment(), mm: Number, prob: Number|null, type: "rain|snow|mix|null" }]
		this.isLoading = true;

		// initial fetch
		this._fetch();
		// schedule
		this.timer = setInterval(() => this._fetch(), this.config.updateInterval);
	},

	getStyles () {
		return ["MMM-PrecipTimeline.css"];
	},

	_fetch () {
		this.isLoading = true;
		this.updateDom();

		this.sendSocketNotification("PT_FETCH", {
			instanceId: this.identifier,
			lat: this.config.lat,
			lon: this.config.lon,
			altitude: this.config.altitude,
			hours: this.config.hours,
			forecastApiVersion: this.config.forecastApiVersion,
			userAgent: this.config.userAgent
		});
	},

	socketNotificationReceived (notification, payload) {
		if (!payload || payload.id !== this.identifier) return;

		if (notification === "PT_DATA") {
			const live = Array.isArray(payload.series) ? payload.series : [];
			const hasNonZero = live.some(p => Number.isFinite(p.mm) && Number(p.mm) > 0);

			if (this.config.debugSample && !hasNonZero) {
				// Keep showing the sample until there is real precip
				this.isLoading = false;
				this.updateDom();
				return;
			}

			// Either not in debug, or we have real precip -> use live data
			this.series = live;
			this.isLoading = false;
			this.updateDom();

		} else if (notification === "PT_ERROR") {
			// If we're in debug mode, keep the sample even on errors
			if (this.config.debugSample && this.series.length > 0) {
				this.isLoading = false;
				this.updateDom();
			} else {
				this.isLoading = false;
				Log.error("[MMM-PrecipTimeline]", payload.error || "Unknown error");
				this.updateDom();
			}
		}
	},

	makeSampleSeries(hours = 24) {
		const start = moment().startOf("hour");
		const out = [];
		for (let i = 0; i < hours; i++) {
			const t = start.clone().add(i, "hours");
			// Some variety: dry, light, heavy; include a snow chunk
			let mm = 0;
			if (i >= 1 && i <= 4) mm = 0.4 + i * 0.2;        // ramp up to ~1.2 mm/h
			if (i === 5) mm = 3.0;                           // heavy shower
			if (i >= 9 && i <= 12) mm = 0.6;                 // steady rain
			if (i >= 15 && i <= 18) mm = 0.8;                // later band
			// pretend sub-zero temps => snow for hours 9–12
			const type = (i >= 9 && i <= 12) ? "snow" : "rain";
			const prob = 70; // 70% for demo
			out.push({ time: t.toISOString(), mm, prob, type });
		}
		return out;
	},

	getDom () {
		const wrapper = document.createElement("div");
		wrapper.className = "pt-wrap";

		// If debug mode is on and no data yet, synthesize a series and skip loading state
		if (this.config.debugSample && this.series.length === 0) {
			this.series = this.makeSampleSeries(this.config.hours);
			this.isLoading = false;
		}

		// if still waiting on data
		if (this.isLoading && this.series.length === 0) {
			wrapper.innerHTML = "<div class='pt-loading'>Loading precipitation…</div>";
			return wrapper;
		}

		// if no data at all
		if (!this.series.length) {
			wrapper.innerHTML = "<div class='pt-empty'>No precipitation expected</div>";
			return wrapper;
		}

		// determine max for scaling
		const max = Math.max(1, ...this.series.map(p => (Number.isFinite(p.mm) ? p.mm : 0)));

		// check if all values are 0
		const total = this.series.slice(0, this.config.hours)
			.reduce((s, p) => s + (Number.isFinite(p.mm) ? p.mm : 0), 0);
		if (total === 0) {
			const msg = document.createElement("div");
			msg.className = "pt-empty";
			msg.textContent = "No precipitation expected";
			wrapper.appendChild(msg);

			// still show the hour ticks
			const ticks = document.createElement("div");
			ticks.className = "pt-row";
			this.series.slice(0, this.config.hours).forEach((p, i) => {
				const m = moment(p.time);
				const col = document.createElement("div");
				col.className = "pt-col";
				const lbl = document.createElement("div");
				lbl.className = "pt-lbl";
				lbl.textContent = (i % Math.max(1, this.config.labelEvery)) === 0 ? m.format("HH") : "";
				col.appendChild(lbl);
				ticks.appendChild(col);
			});
			wrapper.appendChild(ticks);
			return wrapper;
		}

		// otherwise render bars
		const maxH = this.config.maxBarHeight;
		const labelEvery = Math.max(1, this.config.labelEvery);
		const showProb = !!this.config.showProbability;

		const row = document.createElement("div");
		row.className = "pt-row";

		this.series.slice(0, this.config.hours).forEach((p, i) => {
			const m = moment(p.time);
			const col = document.createElement("div");
			col.className = "pt-col";

			// bar
			const bar = document.createElement("div");
			bar.className = "pt-bar";
			if (p.type === "snow") bar.classList.add("pt-snow");
			else if (p.type === "mix") bar.classList.add("pt-mix");

			const safeMM = Number.isFinite(p.mm) ? p.mm : 0;
			let h = Math.round((safeMM / max) * maxH);
			if (safeMM > 0 && h < this.config.minNonZeroBar) h = this.config.minNonZeroBar;
			bar.style.height = `${h}px`;

			// tooltip
			bar.title = `${m.format("HH:mm")} — ${safeMM.toFixed(1)} mm${p.prob != null ? ` (${Math.round(p.prob)}%)` : ""}`;

			// value
			const val = document.createElement("div");
			val.className = "pt-val";
			val.textContent = safeMM > 0 ? safeMM.toFixed(1) : "";

			// probability
			const prob = document.createElement("div");
			prob.className = "pt-prob";
			if (showProb && p.prob != null) prob.textContent = `${Math.round(p.prob)}%`;

			// label
			const lbl = document.createElement("div");
			lbl.className = "pt-lbl";
			lbl.textContent = (i % labelEvery === 0) ? m.format("HH") : "";

			col.appendChild(bar);
			if (showProb) col.appendChild(prob);
			col.appendChild(val);
			col.appendChild(lbl);
			row.appendChild(col);
		});

		wrapper.appendChild(row);
		return wrapper;
	}
});
