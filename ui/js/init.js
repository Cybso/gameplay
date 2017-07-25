/**
 * Configure requirejs and initialize application
 */
(function() {
	"use strict";

	var requireJsInitialized = false;
	var initializeRequireJs = function() {
		// Executed when RequireJS is ready. Might be called twice.
		if (requireJsInitialized) {
			return;
		}
		requireJsInitialized = true;
		window.requirejs.config({
			baseUrl: 'js',
			paths: {
				knockout: 'lib/knockout-3.4.2',
				// https://github.com/ded/reqwest
				req: 'lib/reqwest',
				// http://momentjs.com/
				moment: 'lib/moment-with-locales.min'
			},
			shim: {
				knockout: { exports: 'ko' },
				'lib/knockout.mapper': { deps: ['knockout'] }
			}
		});

		// Load application and initialize application
		require(['knockout', 'ViewModel', 'ko/delay'], function(ko, model) {
			ko.applyBindings(model);
		});
	};

	if (window.requirejs) {
		// Already available
		initializeRequireJs();
	} else {
		// Load script
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = 'js/lib/require.js';
		script.onreadystatechange = initializeRequireJs;
		script.onload = initializeRequireJs;
		document.getElementsByTagName("head")[0].appendChild(script);
	}

})();

/* vim: set fenc=utf-8 noet sw=4 sts=4 ts=4: */
