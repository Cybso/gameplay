(function() {
	"use strict";

	define(['knockout'],
		function(ko) {
			return function(viewModel) {
				// Gamepad interface returns an array of gamepads
				var gamepadAccessor = function() {
					var rawList;
					if (navigator.getGamepads) {
						rawList = navigator.getGamepads();
					} else if (navigator.webkitGetGamepads) {
						rawList = navigator.webkitGetGamepads();
					} else {
						return undefined;
					}
					var result = [];
					for (var i in rawList) {
						if (rawList.hasOwnProperty(i)) {
							var gp = rawList[i];
							if (gp && gp.id) {
								result.push(gp);
							}
						}
					}
					return result;
				};

				// Gives access to all attached gamepads.
				// Will be updated on gamepad events.
				var _gamepadsUpdated = ko.observable(0);
				var gamepads = ko.pureComputed(function() {
					_gamepadsUpdated();
					var list = gamepadAccessor();
					return list === undefined ? [] : list;
				});

				// Registered event listeners
				var listeners = [];
				gamepads.addListener = function(callback) {
					listeners.push(callback);
				};
				gamepads.removeListener = function(callback) {
					var index = listeners.indexOf(callback);
					if (index >= 0) {
						listeners.splice(index, 1);
					}
				};

				// Indicator wether gamepad support is available
				gamepads.supported = ko.pureComputed(function() {
					return gamepadAccessor() !== undefined;
				});

				/**
				 * Notifies all listeners about the gamepad event
				 **/
				var fireGamepadButtonEvent = function(gp, button, state) {
					for (var i in listeners) {
						if (listeners.hasOwnProperty(i)) {
							try {
								listeners[i].call(gamepads, gp, button, state);
							} catch (err) {
								console.log(err);
							}
						}
					}
				};

				/**
				 * Checks if any button state has changed and fires an event
				 **/
				var checkGamepadButtonState = function(gp, lastState) {
					var i;
					if (lastState.counter === 0) {
						// Fire everything that's not zero
						for (i = 0; i < gp.axes.length; i+=1) {
							if (gp.axes[i] !== 0) {
								fireGamepadButtonEvent(gp, 'AXES_' + i, gp.axes[i]);
							}
						}
						for (i = 0; i < gp.buttons.length; i+=1) {
							if (gp.buttons[i] !== 0) {
								fireGamepadButtonEvent(gp, 'BUTTON_' + i, gp.buttons[i]);
							}
						}
					} else {
						// Fire everything that has changed
						for (i = 0; i < gp.axes.length; i+=1) {
							if (gp.axes[i] !== lastState.axes[i]) {
								fireGamepadButtonEvent(gp, 'AXES_' + i, gp.axes[i]);
							}
						}
						for (i = 0; i < gp.buttons.length; i+=1) {
							if (gp.buttons[i] !== lastState.buttons[i]) {
								fireGamepadButtonEvent(gp, 'BUTTON_' + i, gp.buttons[i]);
							}
						}
					}
				};

				// Loop that pulls the gamepad state
				var gamepadStates = {};
				var gamepadLoop = function() {
					if (document.hidden) {
						return;
					}

					// Check for gamepad state
					var gamepadList = gamepadAccessor();
					if (!gamepadList) {
						return;
					}

					// timestamp only resolves in Seconds
					for (var i in gamepadList) {
						if (gamepadList.hasOwnProperty(i)) {
							var gp = gamepadList[i];
							var lastState = gamepadStates[gp.id];
							if (lastState === undefined) {
								gamepadStates[gp.id] = {
									id: gp.id,
									timestamp: 0,
									buttons: gp.buttons,
									axes: gp.axes,
								};
								lastState = gamepadStates[gp.id];
							}

							if (lastState.timestamp !== gp.timestamp) {
								try {
									checkGamepadButtonState(gp, lastState);
								} catch (err) {
									console.log(err);
								}
								lastState.buttons = gp.buttons;
								lastState.axes = gp.axes;
								lastState.timestamp = gp.timestamp;
							}
						}
					}
				};

				if (gamepads.supported()) {
					window.addEventListener("gamepadconnected", function(e) {
						_gamepadsUpdated(_gamepadsUpdated() + 1);
					});
					window.addEventListener("gamepaddisconnected", function(e) {
						_gamepadsUpdated(_gamepadsUpdated() + 1);
					});

					if (window.ongamepadconnection === undefined) {
						// Seems that "gamepadconnected" isn't supported. Add a trigger
						// to check every second for new (or disconnected) gamepads.
						window.setInterval(function() {
							_gamepadsUpdated(_gamepadsUpdated() + 1);
						}, 1000);
					}

					// Start gamepad loop
					window.setInterval(gamepadLoop, 100);
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


