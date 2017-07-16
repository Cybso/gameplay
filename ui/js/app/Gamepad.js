(function() {
	"use strict";

	define(['knockout'],
		function(ko) {
			return function(viewModel) {
				// Gamepad interface returns an array of gamepads
				var gamepadsFn;
				if (navigator.getGamepads) {
					gamepadsFn = navigator.getGamepads();
				} else if (navigator.webkitGetGamepads) {
					gamepadsFn = navigator.webkitGetGamepads();
				}

				// Gives access to all attached gamepads.
				// Will be updated on gamepad events.
				var _gamepadsUpdated = ko.observable(0);
				var gamepads = ko.pureComputed(function() {
					_gamepadsUpdated();
					return gamepadsFn === undefined ? [] : gamepads();
				});

				// Indicator wether gamepad support is available
				gamepads.supported = ko.pureComputed(function() {
					return gamepadsFn !== undefined;
				});

				if (gamepads.supported()) {
					window.addEventListener("gamepadconnected", function(e) {
						_gamepadsUpdated(_gamepadsUpdated() + 1);
					});
					window.addEventListener("gamepaddisconnected", function(e) {
						_gamepadsUpdated(_gamepadsUpdated() + 1);
					});
				}

				// Query gamepad state in short intervals and trigger a body event
				// when the input of any gamepad changes. For this the gamepad object
				// has a 'timestamp' property that contains the timestamp of the last state
				// changes.
				// See also https://gist.github.com/mzabriskie/8f06c9137211a689f3a8

				return gamepads;
			};
		}
	);
})();


