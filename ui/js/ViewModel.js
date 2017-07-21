/**
 * ViewModel for Yagala
 *
 *	License: GPL 2.1
 *
 *	Author: Roland Tapken <rt@tasmiro.de>
 */

(function() {
	"use strict";

	define(['knockout', 'RemoteData', 'moment', 'utils', 
		'app/Locale', 'app/Yagala', 'app/SelectedNode', 'app/Gamepad', 'app/Snake'],
		function(ko, RemoteData, moment, utils, Locale, Yagala,  SelectedNode, Gamepad, Snake) {
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
			exports.yagala = new Yagala(exports);

			// Contains the node that is marked with CSS class 'selected'
			// and provides navigation methods moveLeft, moveRight, moveTop
			// and moveBottom
			exports.selectedNode = new SelectedNode(exports);

			// Updates selectedNode based on a selected app ID
			exports.selectedApp = ko.computed({
				read: function() {
					var node = exports.selectedNode();
					if (node) {
						var id = node.getAttribute('data-app');
						if (id) {
							return exports.yagala.apps.byId(id);
						}
					}
					return undefined;
				},
				write: function(app) {
					if (app === undefined) {
						exports.selectedNode(undefined);
					} else {
						// Find app widget
						var node = document.querySelector('[data-app="' + app.id + '"]');
						exports.selectedNode(node);
					}
				}
			});

			exports.selectedApp.subscribe(function(item) {
				// Start application
				exports.yagala.runApp(item);
			});

			// Bind to key event in body
			var snake;
			document.getElementsByTagName('body')[0].addEventListener('keydown', function(evt) {
				if (evt.keyCode === 69 && evt.ctrlKey) {
					// CTRL+E
					if (snake === undefined) {
						snake = new Snake();
					}
					return;
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
					if (snake) {
						snake.exit();
						snake = undefined;
					}
					break;
				default:
					console.log("unhandled keydown", evt.code || evt.keyIdentifier, evt);
				}
			});

			// Watch gamepad buttons
			exports.gamepad = new Gamepad();

			// Repeats the action unless the button state has not changed
			// in 300 milliseconds.
			var gamepadLongpressSimulator = function(gamepad, action) {
				action();
				var timestamp = gamepad.timestamp;
				var intervalTimeout = 100;
				var waitIntervals = 7;
				var timeoutHandle = function() {
					if (gamepad.timestamp === timestamp) {
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
			exports.gamepad.addListener(function(gamepad, button, state) {
				if (state >= -0.5 && state <= 0.5) {
					return;
				}

				if (snake) {
					// Only watch for BUTTON_8 and BUTTON_1 (exit)
					if (button === 'BUTTON_1' || button === 'BUTTON_8') {
						snake.exit();
						snake = undefined;
					}
					return;
				}

				switch (button) {
				// X-Axes (-1..1)
				case 'AXES_0':
					if (state < 0) {
						gamepadLongpressSimulator(gamepad, exports.selectedNode.moveLeft);
					} else if (state > 0) {
						gamepadLongpressSimulator(gamepad, exports.selectedNode.moveRight);
					}
					break;

				// Y-Axes (-1..1)
				case 'AXES_1':
					if (state < 0) {
						gamepadLongpressSimulator(gamepad, exports.selectedNode.moveUp);
					} else if (state > 0) {
						gamepadLongpressSimulator(gamepad, exports.selectedNode.moveDown);
					}
					break;

				case 'BUTTON_6': // Select on XBox360
				case 'BUTTON_7': // Start on XBox360
				case 'BUTTON_8': // Select
				case 'BUTTON_9': // Start
					// At least two of these buttons must be pressed at the same time
					if (gamepad.buttons[6] + gamepad.buttons[7] + gamepad.buttons[8] + gamepad.buttons[9] > 1) {
						snake = new Snake();
					}
					break;
				}
			});

			// Disable animations when the window doesn't have the focus
			var body = document.getElementsByTagName('body')[0];
			var visibilityChangeListener = function() {
				if (document.hidden) {
					body.classList.add('window-inactive');
					body.classList.remove('window-active');
				} else {
					body.classList.add('window-active');
					body.classList.remove('window-inactive');
				}
			};
			document.addEventListener('visibilitychange', visibilityChangeListener);
			visibilityChangeListener();

			return exports;
		}
	);
})();
