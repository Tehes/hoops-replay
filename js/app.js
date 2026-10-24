/* --------------------------------------------------------------------------------------------------
Imports
---------------------------------------------------------------------------------------------------*/

import { initServiceWorker } from "./service-worker-registration.js";

/* --------------------------------------------------------------------------------------------------
Variables
---------------------------------------------------------------------------------------------------*/
const USE_SERVICE_WORKER = false; // enable or disable SW for this project
const SERVICE_WORKER_VERSION = "2026-03-12-v1"; // bump to force new SW and new cache
const AUTO_RELOAD_ON_SW_UPDATE = true; // reload page once after an update

/* --------------------------------------------------------------------------------------------------
functions
---------------------------------------------------------------------------------------------------*/

function init() {
	// The following touchstart event listener was used as a workaround for older iOS devices
	// to prevent a 300ms delay in touch interactions. It is likely not necessary anymore
	// on modern devices and browsers, especially in Progressive Web Apps.
	// If you experience issues with touch interactions, you can uncomment it again.
	// document.addEventListener("touchstart", function() {}, false);

	initServiceWorker({
		useServiceWorker: USE_SERVICE_WORKER,
		serviceWorkerVersion: SERVICE_WORKER_VERSION,
		autoReloadOnSwUpdate: AUTO_RELOAD_ON_SW_UPDATE,
	});
}

/* --------------------------------------------------------------------------------------------------
public members, exposed with return statement
---------------------------------------------------------------------------------------------------*/
globalThis.app = {
	init,
};

globalThis.app.init();
