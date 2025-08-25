/* global Module, Log */
Module.register("MMM-HelloDev", {
	defaults: {
		greeting: "Hello, MagicMirror dev!"
	},

	start() {
		Log.info(`Starting module: ${this.name}`);
		// Example: ping your node_helper
		this.sendSocketNotification("REQUEST_TICK", null);
	},

	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "small bright";
		wrapper.innerHTML = this.config.greeting;
		return wrapper;
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "TICK") {
			this.updateDom(); // rerender if needed
		}
	}
});
