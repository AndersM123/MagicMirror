/* Config Sample
 *
 * For more information on how you can configure this file
 * see https://docs.magicmirror.builders/configuration/introduction.html
 * and https://docs.magicmirror.builders/modules/configuration.html
 *
 * You can use environment variables using a `config.js.template` file instead of `config.js`
 * which will be converted to `config.js` while starting. For more information
 * see https://docs.magicmirror.builders/configuration/introduction.html#enviromnent-variables
 */
let config = {
	address: "localhost",	// Address to listen on, can be:
	// - "localhost", "127.0.0.1", "::1" to listen on loopback interface
	// - another specific IPv4/6 to listen on a specific interface
	// - "0.0.0.0", "::" to listen on any interface
	// Default, when address config is left out or empty, is "localhost"
	port: 8080,
	basePath: "/",	// The URL path where MagicMirror² is hosted. If you are using a Reverse proxy
	// you must set the sub path here. basePath must end with a /
	ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],	// Set [] to allow all IP addresses
	// or add a specific IPv4 of 192.168.1.5 :
	// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.1.5"],
	// or IPv4 range of 192.168.3.0 --> 192.168.3.15 use CIDR format :
	// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.3.0/28"],

	useHttps: false,			// Support HTTPS or not, default "false" will use HTTP
	httpsPrivateKey: "",	// HTTPS private key path, only require when useHttps is true
	httpsCertificate: "",	// HTTPS Certificate path, only require when useHttps is true

	language: "en",
	locale: "en-US",   // this variable is provided as a consistent location
	// it is currently only used by 3rd party modules. no MagicMirror code uses this value
	// as we have no usage, we  have no constraints on what this field holds
	// see https://en.wikipedia.org/wiki/Locale_(computer_software) for the possibilities

	logLevel: ["INFO", "LOG", "WARN", "ERROR"], // Add "DEBUG" for even more logging
	timeFormat: 24,
	units: "metric",

	modules: [
		{
			module: "alert",
		},
		{
			module: "updatenotification",
			position: "top_bar"
		},
		{
			module: "clock",
			position: "top_left"
		},
		{
			module: "MMM-ATB",
			position: "top_left",
			config: {  }
		},
		{
			module: "calendar",
			position: "top_left",
			config: {
				calendars: [
					{
						url: "https://www.officeholidays.com/ics-clean/norway",
						name: "holidays",
						symbol: "calendar"
					}
				],
				maximumEntries: 50,
				fetchInterval: 5 * 60 * 1000 // 5 minutes
			}
		},
		{
			module: "compliments",
			position: "lower_third"
		},
		{
			module: "weather",
			position: "top_center",
			config: {
				weatherProvider: "yr",
				type: "current",
				lat: 63.40872600624022,
				lon: 10.357577977528827
			}
		},
		{
			module: "weather",
			position: "top_right",
			header: "Weather Forecast",
			config: {
				weatherProvider: "yr",
				type: "forecast",
				lat: 63.40872600624022,
				lon: 10.357577977528827
			}
		},
		{
			module: "MMM-PrecipTimeline",
			position: "bottom_bar",             // place it below the others in the same region
			header: "Precipitation (next 24h)",
			config: {
				lat: 63.40872600624022,
				lon: 10.357577977528827,
				hours: 24,
				labelEvery: 1,
				maxBarHeight: 60,
				minNonZeroBar: 2, // px minimum height for any non-zero precipitation
				debugSample: true, // set true to preview fake precip bars
				userAgent: "MagicMirror-PrecipTimeline/1.0 (andersm97@gmail.com)" // REQUIRED by MET Norway
			}
		},
		{
			module: "MMM-NowPlayingOnSpotify",
			position: "bottom_right",

			config: {
				clientID: "YOUR_SPOTIFY_CLIENT_ID",
				clientSecret: "YOUR_SPOTIFY_CLIENT_SECRET",
				accessToken: "YOUR_SPOTIFY_ACCESS_TOKEN",
				refreshToken: "YOUR_SPOTIFY_REFRESH_TOKEN",
			}
		},
	]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") { module.exports = config; }
