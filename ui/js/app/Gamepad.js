(function() {
	"use strict";

	// Basic mapping for W3C Standard Gamepad
	// https://w3c.github.io/gamepad/#remapping
	var STANDARD_MAPPING = {
		'buttons_0': 'A',
		'buttons_1': 'B',
		'buttons_2': 'X',
		'buttons_3': 'Y',
		'buttons_8': 'SELECT',
		'buttons_9': 'START',
		'axes_-0' : 'LEFT',
		'axes_+0' : 'RIGHT',
		'axes_-1' : 'UP',
		'axes_+1' : 'DOWN',
		'buttons_12': 'UP',
		'buttons_13': 'DOWN',
		'buttons_14': 'LEFT',
		'buttons_15': 'RIGHT'
	};

	/**
		* Converts 'buttons_IDX' to { key: 'buttons', index: parseInt(IDX), negate: false }
		* 'axes_+IDX' to { key: 'axes', index: parseInt(IDX), negate: false }
		* and 'axes_-IDX' to { key: 'axes', index: parseInt(IDX), negate: true }.
		**/
	var fromButtonKey = function(button) {
		if (button.substring(0, 8) === 'buttons_') {
			return { key: 'buttons', index: parseInt(button.substring(8)), negate: false };
		} else if (button.substring(0, 6) === 'axes_+') {
			return { key: 'axes', index: parseInt(button.substring(6)), negate: false };
		} else if (button.substring(0, 6) === 'axes_-') {
			return { key: 'axes', index: parseInt(button.substring(6)), negate: true };
		}
		return false;
	};

	/**
	 * Create a key value for button mappings
	 **/
	var toButtonKey = function(key, index, negate) {
		if (key === 'buttons') {
			return key + '_' + index;
		} else if (key === 'axes') {
			return key + '_' + (negate ? '-' : '+') + index;
		}
	};

	/**
	 * Returns a gamepad controller as singleton object.
	 * Analog buttons are converted into digital. Axes
	 * are converted into normal buttons.
	 */
	define(['app/GamepadInitialMappings', 'app/GamepadConfigurator'],
		function(InitialMappings, GamepadConfigurator) {
			var gamepads;
			return function() {
				if (gamepads !== undefined) {
					// This is a singleton
					return gamepads;
				}

				var mappings = new InitialMappings();

				var buttonListeners = [];
				var gamepadListeners = [];

				var activeGamepadConfigurator;

				/**
				 * Notifies all buttonListeners about the gamepad event
				 **/
				var fireGamepadButtonEvent = function(gp, button, state, key, index, rawValue) {
					if (activeGamepadConfigurator !== undefined && activeGamepadConfigurator.gamepad() === gp) {
						// Forward the event
						activeGamepadConfigurator.fireGamepadButtonEvent.apply(activeGamepadConfigurator, arguments);
						return;
					}

					if (mappings[gp.id] !== undefined) {
						button = mappings[gp.id][button];
					} else {
						button = STANDARD_MAPPING[button];
					}

					if (button !== undefined) {
						var raw = {
							key: key,
							index: index,
							value: rawValue
						};
						for (var i = 0; i < buttonListeners.length; i+=1) {
							try {
								buttonListeners[i].call(gamepads, gp, button, state, raw);
							} catch (err) {
								console.log(err);
							}
						}
					}
				};

				/**
				 * Notifies all gamepadListener about attached and detached gamepads
				 */
				var fireGamepadEvent = function(gp, type) {
					for (var i = 0; i < gamepadListeners.length; i+=1) {
						try {
							gamepadListeners[i].call(gamepads, gp, type);
						} catch (err) {
							console.log(err);
						}
					}
				};

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

				// Newer versions of chrome returns buttons as
				// '{ pressed: BOOL, value: INT }', while older
				// just returned the value. This wrapper returns
				// the value for both variants.
				var getButtonState = function(value) {
					if (isFinite(value)) {
						return Math.round(value);
					} else if (value.pressed !== undefined) {
						return value.pressed ? 1 : 0;
					} else {
						return value.value;
					}
				};
				gamepads.getButtonState = getButtonState;

				/**
				 * Creates a new array of button states from input
				 **/
				var copyButtonStates = function(arr) {
					var result = [];
					for (var i = 0; i < arr.length; i+=1) {
						result.push(getButtonState(arr[i]));
					}
					return result;
				};

				gamepads.getMappings = function() {
					return mappings;
				};

				gamepads.setMappings = function(m) {
					mappings = mappings;
				};

				gamepads.setGamepadMapping = function(gamepad, m) {
					if (gamepad.id !== undefined) {
						gamepad = gamepad.id;
					}
					mappings[gamepad] = m;
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
					var i, old, val, state;
					if (lastState.counter === 0) {
						// Fire everything that's not zero
						for (i = 0; i < gp.axes.length; i+=1) {
							val = Math.round(gp.axes[i]);
							if (val !== 0) {
								if (val < 0) {
									fireGamepadButtonEvent(gp, 'axes_-' + i, -val, 'axes', i, gp.axes[i]);
								} else {
									fireGamepadButtonEvent(gp, 'axes_+' + i, val, 'axes', i, gp.axes[i]);
								}
							}
						}
						for (i = 0; i < gp.buttons.length; i+=1) {
							state = getButtonState(gp.buttons[i]);
							if (state !== 0) {
								fireGamepadButtonEvent(gp, 'buttons_' + i, state, 'buttons', i, gp.buttons[i]);
							}
						}
					} else {
						// Fire everything that has changed
						for (i = 0; i < gp.axes.length; i+=1) {
							old = Math.round(lastState.axes[i]);
							val = Math.round(gp.axes[i]);
							if (old !== val) {
								if (old < 0) {
									fireGamepadButtonEvent(gp, 'axes_-' + i, 0, 'axes', i, gp.axes[i]);
								} else if (old > 0) {
									fireGamepadButtonEvent(gp, 'axes_+' + i, 0, 'axes', i, gp.axes[i]);
								}
								if (val < 0) {
									fireGamepadButtonEvent(gp, 'axes_-' + i, -val, 'axes', i, gp.axes[i]);
								} else if (val > 0) {
									fireGamepadButtonEvent(gp, 'axes_+' + i, val, 'axes', i, gp.axes[i]);
								}
							}
						}
						for (i = 0; i < gp.buttons.length; i+=1) {
							state = getButtonState(gp.buttons[i]);
							if (state !== lastState.buttons[i]) {
								fireGamepadButtonEvent(gp, 'buttons_' + i, state, 'buttons', i, gp.buttons[i]);
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
									buttons: copyButtonStates(gp.buttons),
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
								lastState.buttons = copyButtonStates(gp.buttons);
								lastState.axes = gp.axes;
								lastState.timestamp = gp.timestamp;
							}
						}
					}
				};

				/**
				 * Returns the key and index of the requested mapped button.
				 * The result also has a function 'getValue(gamepad)' that
				 * returns the normalized value of the identified button.
				 **/
				var inverseButtonCache = {};
				gamepads.getButton = function(gp, button) {
					var bi = inverseButtonCache[button + ':' + gp.id];
					if (bi === undefined) {
						// Resolve inverse mapping
						bi = false;
						var map = mappings[gp.id] || STANDARD_MAPPING;
						for (var i in map) {
							if (map.hasOwnProperty(i)) {
								if (map[i] === button) {
									bi = fromButtonKey(i);
									break;
								}
							}
						}

						if (bi !== false) {
							bi.getValue = function(gp) {
								var value = getButtonState(gp[bi.key][bi.index]);
								if (bi.negate) {
									value = -value;
								}
								return value;
							};
						}

						inverseButtonCache[button + ':' + gp.id] = bi;
					}
					return bi;
				};

				/**
				 * Returns true of the gamepad has a mapping
				 **/
				gamepads.hasMapping = function(gamepad) {
					if (gamepad.id !== undefined) {
						gamepad = gamepad.id;
					}
					return mappings[gamepad] !== undefined;
				};

				/**
				 * Opens the gamepad configurator. While the configurator
				 * is active all button and gamepad events are suspended.
				 **/
				gamepads.configureMapping = function(gamepad) {
					if (activeGamepadConfigurator !== undefined) {
						if (activeGamepadConfigurator.gamepad() === gamepad) {
							return;
						}
						activeGamepadConfigurator.close();
					}
					activeGamepadConfigurator = new GamepadConfigurator(gamepad);
					activeGamepadConfigurator.close(function() {
						activeGamepadConfigurator = undefined;
					});
					return activeGamepadConfigurator;
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


