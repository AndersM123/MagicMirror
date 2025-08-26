Module.register("MMM-ATB", {
	defaults: {
		stopId: "42530",
		lines: [],
		maxDepartures: 10,
		reloadInterval: 60*1000,
		animationSpeed: 250,
		minMinutesToShow: 1 // hides 0-min departures
	},

	start() {
		this.departures = [];
		this.loaded = false;
		this.getData();
		this.scheduleUpdate();
	},

	getStyles() {
		return ["MMM-ATB.css"];
	},

	scheduleUpdate() {
		if (this.timer) clearInterval(this.timer);
		this.timer = setInterval(() => this.getData(), this.config.reloadInterval);
	},

	getData() {
		this.sendSocketNotification("ATB_FETCH", {
			stopId: this.config.stopId,
			lines: this.config.lines,
			max: this.config.maxDepartures,
			minMinutesToShow: this.config.minMinutesToShow
		});
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "ATB_DEPARTURES") {
			this.departures = payload || [];
			this.loaded = true;
			this.updateDom(this.config.animationSpeed);
		} else if (notification === "ATB_ERROR") {
			this.error = payload?.message || "Error fetching ATB data";
			this.updateDom(this.config.animationSpeed);
		}
	},

	getDom() {
		const wrapper = document.createElement("div");

		if (!this.config.stopId) {
			wrapper.innerHTML = "Set <code>stopId</code> in config.";
			return wrapper;
		}
		if (this.error) {
			wrapper.innerHTML = this.error;
			return wrapper;
		}
		if (!this.loaded) {
			wrapper.innerHTML = "Loading…";
			return wrapper;
		}
		if (this.departures.length === 0) {
			wrapper.innerHTML = "No upcoming departures.";
			return wrapper;
		}

		const table = document.createElement("table");
		table.className = "atb";

		this.departures.forEach(d => {
			const tr = document.createElement("tr");

			const line = document.createElement("td");
			line.className = "line";
			line.textContent = d.line; // route number
			tr.appendChild(line);

			const dest = document.createElement("td");
			dest.className = "dest";
			dest.textContent = d.destination;
			tr.appendChild(dest);

			const when = document.createElement("td");
			when.className = "when bright";
			when.textContent = d.displayTime; // e.g., "3 min" or "12:07"
			tr.appendChild(when);

			table.appendChild(tr);
		});

		wrapper.appendChild(table);
		return wrapper;
	}
});
