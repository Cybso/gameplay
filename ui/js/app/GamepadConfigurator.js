(function() {
	"use strict";

	var BUTTONS = [
		'UP',
		'RIGHT',
		'DOWN',
		'LEFT',
		'SELECT',
		'START',
		'X',
		'Y',
		'B',
		'A'
	];

	/**
	 * GamepadConfigurator
	 */
	define(['knockout'], function(ko) {
		return function(gamepad) {
			var currentButtonIndex = ko.observable(0);
			var currentButton = ko.pureComputed(function() {
				return BUTTONS[currentButtonIndex()];
			});

			var closeListeners = [];

			/**
			 * Adds close listener / closes the configurator.
			 */
			var close = function(listener) {
				if (listener === undefined) {
					// Close this...
					for (var i = 0; i < closeListeners.length; i+=1) {
						closeListeners[i].call(this);
					}
				} else {
					closeListeners.push(listener);
				}
			};

			var mapping = ko.observable({});
			var inverseMapping = ko.pureComputed(function() {
				var m = mapping();
				var r = {};
				for (var i in m) {
					if (m.hasOwnProperty(i)) {
						r[m[i]] = i;
					}
				}
				return r;
			});

			var fireGamepadButtonEvent = function(gp, button, state, key, index, rawValue) {
				var m = mapping();
				button = currentButton();
				if (state > 0 && m[button] === undefined) {
					if (key === 'buttons') {
						key = key + '_' + index;
					} else if (key === 'axes') {
						key = key + '_' + (rawValue > 0 ? '+' : '-') + index;
					}
					if (inverseMapping()[key] === undefined) {
						m[button] = key;
						mapping(m);

						// Give the gamepad half a second to settle
						window.setTimeout(function() {
							currentButtonIndex(currentButtonIndex() + 1);
							if (currentButton() === undefined) {
								close();
							}
						}, 300);
					}
				}
			};

			return {
				fireGamepadButtonEvent: fireGamepadButtonEvent,
				close: close,
				currentButton: currentButton,
				finished: ko.pureComputed(function() {
					return currentButton() === undefined;
				}),
				mapping: inverseMapping,
				reset: function() {
					currentButtonIndex(0);
					mapping({});
				},
				getButtonMap: function(button) {
					return mapping()[button];
				},
				gamepad: ko.pureComputed(function() {
					return gamepad;
				})
			};
			
		};
	});

})();
