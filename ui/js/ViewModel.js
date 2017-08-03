/**
 * ViewModel for GamePlay
 *
 *	License: GPL 2.1
 *
 *	Author: Roland Tapken <rt@tasmiro.de>
 */

(function() {
	"use strict";

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
			document.body.addEventListener('keydown', function(evt) {
				exports.gameplay.triggerBusy();
				if (evt.keyCode === 69 && evt.ctrlKey) {
					// CTRL+E
					if (snake === undefined) {
						snake = new Snake();
					}
					return;
				}

				if (!exports.currentApp() && !exports.filter()) {
					var keycode = evt.keyCode;
					if ((keycode > 47 && keycode < 58)     || // number keys
						(keycode > 64 && keycode < 91)     || // letter keys
						(keycode > 95 && keycode < 112)) {    // numpad keys
						evt.preventDefault();
						exports.filter(String.fromCharCode(keycode));
						window.setTimeout(function() {
							document.querySelector('#widget-filter input').focus();
						}, 30);
					}
				}

				switch (evt.code || evt.keyIdentifier) {
				case 'ArrowLeft':
				case 'Left':
					evt.preventDefault();
					exports.selectedNode.moveLeft();
					break;
				case 'ArrowRight':
				case 'Right':
					evt.preventDefault();
					exports.selectedNode.moveRight();
					break;
				case 'ArrowUp':
				case 'Up':
					evt.preventDefault();
					exports.selectedNode.moveUp();
					break;
				case 'ArrowDown':
				case 'Down':
					evt.preventDefault();
					exports.selectedNode.moveDown();
					break;
				case 'Esc':
					evt.preventDefault();
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
					break;
				case 'Enter':
					var node = exports.selectedNode();
					if (node && node.click !== undefined) {
						evt.preventDefault();
						node.click();
					}
					break;
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
				var rawValue = Math.round(raw.value);
				var timeoutHandle = function() {
					if (rawValue === Math.round(gamepad[raw.key][raw.index])) {
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
							var mappingKey = 'mapping:' + gp.id;
							exports.gamepad.setGamepadMapping(gp, mapping);
							window.gameplay.setItem(mappingKey, JSON.stringify(mapping));
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
					var mappingKey = 'mapping:' + gp.id;
					var mapping = window.gameplay.getItem(mappingKey);
					if (mapping) {
						mapping = JSON.parse(mapping);
						exports.gamepad.setGamepadMapping(gp, mapping);
					} else if (!exports.gamepad.hasMapping(gp)) {
						exports.reconfigureGamepad(gp);
					}
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
				if (document.hidden) {
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
