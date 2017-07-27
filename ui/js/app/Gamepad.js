(function() {
	"use strict";

	/**
	 * Returns a gamepad controller as singleton object.
	 */
	define([],
		function() {
			var gamepads;
			return function() {
				if (gamepads !== undefined) {
					// This is a singleton
					return gamepads;
				}

				var buttonListeners = [];
				var gamepadListeners = [];
				/**
				 * Notifies all buttonListeners about the gamepad event
				 **/
				function fireGamepadButtonEvent(gp, button, state) {
					for (var i = 0; i < buttonListeners.length; i+=1) {
						try {
							buttonListeners[i].call(gamepads, gp, button, state);
						} catch (err) {
							console.log(err);
						}
					}
				}

				/**
				 * Notifies all gamepadListener about attached and detached gamepads
				 */
				function fireGamepadEvent(gp, type) {
					for (var i = 0; i < gamepadListeners.length; i+=1) {
						try {
							gamepadListeners[i].call(gamepads, gp, type);
						} catch (err) {
							console.log(err);
						}
					}
				}

				// Gamepad interface returns an array of gamepads
				var currentGamepads = {};
				var gamepadAccessor = function() {
					var rawList, i;
					if (navigator.getGamepads) {
						rawList = navigator.getGamepads();
					} else if (navigator.webkitGetGamepads) {
						rawList = navigator.webkitGetGamepads();
					} else {
						return undefined;
					}

					for (i in currentGamepads) {
						if (currentGamepads.hasOwnProperty(i)) {
							currentGamepads[i].active = false;
						}
					}

					var result = [];
					for (i in rawList) {
						if (rawList.hasOwnProperty(i)) {
							var gp = rawList[i];
							if (gp && gp.id) {
								result.push(gp);
								if (currentGamepads[gp.index] === undefined) {
									// Fire new gamepad event
									fireGamepadEvent(gp, "attached");
									currentGamepads[gp.index] = { active: true, gamepad: gp };
								} else {
									currentGamepads[gp.index].active = true;
								}
							}
						}
					}

					for (i in currentGamepads) {
						if (currentGamepads.hasOwnProperty(i) && currentGamepads[i].active === false) {
							fireGamepadEvent(currentGamepads[i].gamepad, "detached");
							delete currentGamepads[i];
						}
					}

					return result;
				};

				// Gives access to all attached gamepads. Returns an empty list
				// if gamepad is not supported.
				gamepads = function() {
					var list = gamepadAccessor();
					return list === undefined ? [] : list;
				};

				// Registered event buttonListeners
				gamepads.addButtonListener = function(callback) {
					buttonListeners.push(callback);
				};

				gamepads.removeButtonListener = function(callback) {
					var index = buttonListeners.indexOf(callback);
					if (index >= 0) {
						buttonListeners.splice(index, 1);
					}
				};

				// Registered event gamepadListeners.
				gamepads.addGamepadListener = function(callback) {
					gamepadListeners.push(callback);
					for (var i = 0; i < currentGamepads.length; i+=1) {
						callback.call(gamepads, currentGamepads[i], 'attached');
					}
				};

				gamepads.removeGamepadListener = function(callback) {
					var index = gamepadListeners.indexOf(callback);
					if (index >= 0) {
						gamepadListeners.splice(index, 1);
					}
				};

				// Indicator wether gamepad support is available
				gamepads.supported = function() {
					return navigator.getGamepads !== undefined || navigator.webkitGetGamepads !== undefined;
				};

				/**
				 * Checks if any button state has changed and fires an event
				 **/
				var checkGamepadButtonState = function(gp, lastState) {
					var i;
					if (lastState.counter === 0) {
						// Fire everything that's not zero
						for (i = 0; i < gp.axes.length; i+=1) {
							if (Math.round(gp.axes[i]) !== 0) {
								fireGamepadButtonEvent(gp, 'AXES_' + i, gp.axes[i]);
							}
						}
						for (i = 0; i < gp.buttons.length; i+=1) {
							if (Math.round(gp.buttons[i]) !== 0) {
								fireGamepadButtonEvent(gp, 'BUTTON_' + i, gp.buttons[i]);
							}
						}
					} else {
						// Fire everything that has changed
						for (i = 0; i < gp.axes.length; i+=1) {
							if (Math.round(gp.axes[i]) !== Math.round(lastState.axes[i])) {
								fireGamepadButtonEvent(gp, 'AXES_' + i, gp.axes[i]);
							}
						}
						for (i = 0; i < gp.buttons.length; i+=1) {
							if (Math.round(gp.buttons[i]) !== Math.round(lastState.buttons[i])) {
								fireGamepadButtonEvent(gp, 'BUTTON_' + i, gp.buttons[i]);
							}
						}
					}
				};

				// Loop that pulls the gamepad state
				var gamepadStates = {};
				var gamepadLoop = function() {
					if (buttonListeners.length === 0 && gamepadListeners.length === 0) {
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
					// Start gamepad loop as long as the window is active (or
					// if the visibility API is not supported).
					var gameLoopInterval;
					if (document.hidden === undefined || !document.hidden) {
						gameLoopInterval = window.setInterval(gamepadLoop, 100);
					}
					document.addEventListener('visibilitychange', function() {
						if (document.hidden) {
							if (gameLoopInterval !== undefined) {
								clearInterval(gameLoopInterval);
								gameLoopInterval = undefined;
							}
						} else if (gameLoopInterval === undefined) {
							gameLoopInterval = window.setInterval(gamepadLoop, 100);
						}
					});
				}

				return gamepads;
			};
		}
	);
})();


