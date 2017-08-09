/**
 * ViewModel for GamePlay
 *
 *	License: GPL 2.1
 *
 *	Author: Roland Tapken <rt@tasmiro.de>
 */

(function() {
	"use strict";

	// Map key code characters that differ between engines
	var KEYCODE_MAPPING = {
		'U+001B': 'Esc',
		'U+0020': 'Space',
		'ArrowLeft': 'Left',
		'ArrowRight': 'Right',
		'ArrowDown': 'Down',
		'ArrowTop': 'Top'
	};

	define(['knockout', 'RemoteData', 'moment', 'utils', 
		'app/Locale', 'app/GamePlay', 'app/SelectedNode', 'app/Gamepad', 'app/Snake', 'app/BackgroundGamepadListener'],
		function(ko, RemoteData, moment, utils,
				Locale, GamePlay,  SelectedNode, Gamepad, Snake, BackgroundGamepadListener) {
			var exports = { };

			/**
			 * Exports the observables 'locale' and 'locale.available'
			 **/
			exports.locale = new Locale(exports);

			/**
			 * Exports the current time as locale dependent string.
			 * The value is updated every 60 seconds.
			 **/
			exports.currentTimeStr = (function() {
				// Show the current time (updated every minute and when locale changes)
				var timeTrigger = ko.observable(new Date());
				var currentTimeStr = ko.pureComputed(function() {
					moment.locale(exports.locale());
					return moment(timeTrigger()).format('LT');
				});
				window.setInterval(function() { timeTrigger(new Date()); }, 60000);
				return currentTimeStr;
			})();

			// Load initial set of apps...
			exports.gameplay = new GamePlay(exports);

			// Application filter (by name)
			exports.filter = ko.observable();
			exports.filteredApps = ko.pureComputed(function() {
				var filter = (exports.filter() || '').toLowerCase().split(/\s+/);
				var apps = exports.gameplay.apps();
				if (filter.length === 0) {
					return apps;
				}
				var result = [];
				for (var i = 0; i < apps.length; i+=1) {
					var match = true;
					for (var j = 0; j < filter.length; j+=1) {
						if (apps[i].label.toLowerCase().indexOf(filter[j]) < 0) {
							match = false;
							break;
						}
					}
					if (match) {
						result.push(apps[i]);
					}
				}
				return result;
			});


			// Contains the node that is marked with CSS class 'selected'
			// and provides navigation methods moveLeft, moveRight, moveTop
			// and moveBottom
			exports.selectedNode = new SelectedNode(exports);

			// Updates selectedNode based on a selected app ID
			var _currentApp = ko.observable();
			var _currentAppNode;
			exports.currentApp = ko.computed({
				read: _currentApp,
				write: function(app) {
					if (app !== undefined) {
						// Find app widget
						_currentAppNode = document.querySelector('[data-app="' + app.id + '"]');
					}
					_currentApp(app);
					// Return to the selected node, especially when this is called
					// with argument 'undefined' to close the dialog.
					exports.selectedNode(_currentAppNode);
				}
			});
			exports.activeGamepadConfigurator = ko.observable();

			// Prohibit idle while the mouse is moved
			document.body.addEventListener('mousemove', exports.gameplay.triggerBusy);

			// Bind to key event in body
			var snake;

			/**
			 * All available keydown handlers. Must return TRUE if they
			 * have handled the event. The parameter 'code' is the 
			 * event's code/keyIdentifier/key, where Unicode-Identifiers
			 * are transformed into their string representation
			 * (e.G. U+0041 becomes 'E').
			 **/
			var keyDownHandlers = [
				// Handle ESC key to close easter egg, filter or selected app (in this order)
				function(evt, code) {
					if (code === 'Esc') {
						if (exports.activeGamepadConfigurator()) {
							exports.activeGamepadConfigurator().close();
						} else if (snake) {
							snake.exit();
							snake = undefined;
						} else if (exports.currentApp()) {
							exports.currentApp(undefined);
						} else {
							exports.filter('');
						}
						evt.preventDefault();
						return true;
					}
				},

				// Start easter egg on ctrl e
				function(evt, code) {
					if (code === 'E' && evt.ctrlKey) {
						// CTRL+E
						if (snake === undefined) {
							snake = new Snake();
						}
						evt.preventDefault();
						return true;
					} else if (snake !== undefined) {
						// Delegate this to snake
						snake.handleKeyEvent(evt);
						return true;
					}
				},

				// If 'filter' is enabled and neither CTRL nor ALT
				// nor META are pressed ignore any keydown event. If the
				// filter is not active, than any pressed key should focus it.
				function(evt, code) {
					if (!(evt.ctrlKey || evt.altKey || evt.metaKey)) {
						if (exports.filter()) {
							return true;
						} else {
							var keycode = evt.keyCode;
							if ((keycode > 47 && keycode < 58)     || // number keys
								(keycode > 64 && keycode < 91)     || // letter keys
								(keycode > 95 && keycode < 112)) {    // numpad keys
								evt.preventDefault();
								exports.filter(String.fromCharCode(keycode));
								window.setTimeout(function() {
									document.querySelector('#widget-filter input').focus();
								}, 30);
								return true;
							}
						}
					}
				},

				// Handle navigation
				function(evt, code) {
					switch (code) {
					case 'Left':
						evt.preventDefault();
						exports.selectedNode.moveLeft();
						return true;
					case 'Right':
						evt.preventDefault();
						exports.selectedNode.moveRight();
						return true;
					case 'Up':
						evt.preventDefault();
						exports.selectedNode.moveUp();
						return true;
					case 'Down':
						evt.preventDefault();
						exports.selectedNode.moveDown();
						return true;
					case 'Enter':
					case 'Space':
						var node = exports.selectedNode();
						if (node && node.click !== undefined) {
							evt.preventDefault();
							node.click();
						}
						return true;
					}
				},

				// Print to debugger
				function(evt, code) {
					//console.log('DEBUG: Unhandled key event: ' + code, evt);
				}
			];

			document.body.addEventListener('keydown', function(evt) {
				exports.gameplay.triggerBusy();
				if (!evt.defaultPrevented) {
					var code = evt.code || evt.keyIdentifier || evt.key;
					// Check for predefined mappings
					if (KEYCODE_MAPPING[code] !== undefined) {
						code = KEYCODE_MAPPING[code];
					}
					// Map unicode characters into string
					if (code.substring(0, 2) === 'U+') {
						//  Convert to character
						var chr = parseInt(code.substring(2), 16);
						if (!isNaN(chr)) {
							code = String.fromCharCode(chr);
						}
					}
					// Find a handler that handles this event (returns true)
					for (var i = 0; i < keyDownHandlers.length; i+=1) {
						if (keyDownHandlers[i].call(keyDownHandlers, evt, code)) {
							return;
						}
					}
				}
			});

			// Watch gamepad buttons
			exports.gamepad = new Gamepad();

			// Repeats the action unless the button state has not changed
			// in 300 milliseconds.
			var gamepadLongpressSimulator = function(gamepad, raw, action) {
				action();
				var timestamp = gamepad.timestamp;
				var intervalTimeout = 100;
				var waitIntervals = 7;
				var rawValue = exports.gamepad.getButtonState(raw.value);
				var timeoutHandle = function() {
					if (rawValue === exports.gamepad.getButtonState(gamepad[raw.key][raw.index])) {
						if (waitIntervals === 0) {
							action();
						}
						waitIntervals = waitIntervals > 0 ? waitIntervals - 1 : 0;
						window.setTimeout(timeoutHandle, intervalTimeout);
					}
				};
				timeoutHandle();
			};

			// https://w3c.github.io/gamepad/#remapping
			exports.gamepad.addButtonListener(function(gamepad, button, state, raw) {
				exports.gameplay.triggerBusy();
				if (snake) {
					// Only watch for BUTTON_8 and BUTTON_1 (exit)
					if (button === 'START' || button === 'B') {
						snake.exit();
						snake = undefined;
					}
					return;
				}

				switch (button) {
				case 'LEFT':
					if (state > 0) {
						gamepadLongpressSimulator(gamepad, raw, exports.selectedNode.moveLeft);
					}
					break;

				case 'RIGHT':
					if (state > 0) {
						gamepadLongpressSimulator(gamepad, raw, exports.selectedNode.moveRight);
					}
					break;

				case 'UP':
					if (state > 0) {
						gamepadLongpressSimulator(gamepad, raw, exports.selectedNode.moveUp);
					}
					break;
				
				case 'DOWN':
					if (state > 0) {
						gamepadLongpressSimulator(gamepad, raw, exports.selectedNode.moveDown);
					}
					break;

				case 'A':
					if (state > 0) {
						var node = exports.selectedNode();
						if (node && node.click !== undefined) {
							node.click();
						}
					}
					break;

				case 'B':
					if (exports.currentApp()) {
						exports.currentApp(undefined);
					}
					break;

				case 'SELECT':
				case 'START':
					// Button0 plus at least two of these buttons must be pressed at the same time
					if (gamepad.buttons[6] + gamepad.buttons[7] + gamepad.buttons[8] + gamepad.buttons[9] > 1) {
						if (gamepad.buttons[0] > 0) {
							snake = new Snake();
						}
					}
					break;
				}
			});

			exports.reconfigureGamepad = function(gp) {
				if (!exports.activeGamepadConfigurator()) {
					var configurator = exports.gamepad.configureMapping(gp);
					configurator.close(function() {
						exports.activeGamepadConfigurator(undefined);
						if (configurator.finished()) {
							var mapping = configurator.mapping();
							var mappingKey = exports.gamepad.getUnifiedId(gp);
							exports.gamepad.setGamepadMapping(gp, mapping);
							exports.gameplay.setItem('gamepads', mappingKey, JSON.stringify(mapping));
						}
					});
					exports.activeGamepadConfigurator(configurator);
				}
			};

			// Add a listener to show the number of gamepads
			exports.currentGamepads = ko.observableArray();
			exports.gamepad.addGamepadListener(function(gp, type) {
				exports.gameplay.triggerBusy();
				if (type === 'attached') {
					exports.currentGamepads.push(gp);
					// Check if there is a safed configuration
					var mappingKey = exports.gamepad.getUnifiedId(gp);
					exports.gameplay.getItem('gamepads', mappingKey).done(function(mapping) {
						if (mapping) {
							mapping = JSON.parse(mapping);
							exports.gamepad.setGamepadMapping(gp, mapping);
						} else if (!exports.gamepad.hasMapping(gp)) {
							exports.reconfigureGamepad(gp);
						}
					});
				} else if (type === 'detached') {
					exports.currentGamepads.remove(gp);
					if (exports.activeGamepadConfigurator() && exports.activeGamepadConfigurator().gamepad() === gp) {
						exports.activeGamepadConfigurator().close();
					}
				}
			});

			// Disable animations when the window doesn't have the focus
			var backgroundGamepadListener = new BackgroundGamepadListener(exports);
			var visibilityChangeListener = function() {
				if (document.hidden || document.webengineHidden) {
					document.body.classList.add('window-inactive');
					document.body.classList.remove('window-active');
					backgroundGamepadListener.enable();
				} else {
					document.body.classList.add('window-active');
					document.body.classList.remove('window-inactive');
					backgroundGamepadListener.disable();
				}
			};
			document.addEventListener('visibilitychange', visibilityChangeListener);
			visibilityChangeListener();

			return exports;
		}
	);
})();
