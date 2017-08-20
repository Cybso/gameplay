/**
 * Configure requirejs and initialize application
 */
(function() {
	"use strict";

	var initializeRequireJs_waitForDeps = 0;
	var initializeRequireJs = function() {
		// Executed when RequireJS is ready. Might be called twice.
		if (initializeRequireJs_waitForDeps > 0) {
			return;
		}
		initializeRequireJs_waitForDeps += 1;
		if (initializeRequireJs_waitForDeps < 0)  {
			// Wait for additional dependencies
			return;
		}

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
		require(['knockout', 'ViewModel', 'ko/delay', 'ko/eval'], function(ko, model) {
			ko.applyBindings(model);
		});
	};

	// Check if we need to fetch the QWebChannel first
	if (window.QWebChannel !== undefined && window.qt !== undefined) {
		// Wait for QWebChannel as dependency
		initializeRequireJs_waitForDeps -= 1;
		window.gameplayIsAsync = true;
		window.QWebChannel(window.qt.webChannelTransport, function (channel) {
			window.gameplay = channel.objects.gameplay;
			initializeRequireJs();
		});
	}
	

	// Wait for requirejs as dependency
	initializeRequireJs_waitForDeps -= 1;
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
