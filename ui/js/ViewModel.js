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
		'app/Locale', 'app/Entries', 'app/SelectedNode', 'app/Gamepad'],
		function(ko, RemoteData, moment, utils, Locale, Entries,  SelectedNode, Gamepad) {
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

			// Load initial set of entries...
			// TODO This should be filled by the python backend
			exports.entries = new Entries(exports);

			// Contains the node that is marked with CSS class 'selected'
			// and provides navigation methods moveLeft, moveRight, moveTop
			// and moveBottom
			exports.selectedNode = new SelectedNode(exports);

			// Updates selectedNode based on a selected entry ID
			exports.selectedEntry = ko.computed({
				read: function() {
					var node = exports.selectedNode();
					if (node) {
						var id = node.getAttribute('data-entry');
						if (id) {
							return exports.entries.byId(id);
						}
					}
					return undefined;
				},
				write: function(entry) {
					if (entry === undefined) {
						exports.selectedNode(undefined);
					} else {
						// Find entry widget
						var node = document.querySelector('[data-entry="' + entry.id + '"]');
						exports.selectedNode(node);
					}
				}
			});

			// Bind to key event in body
			document.getElementsByTagName('body')[0].addEventListener('keydown', function(evt) {
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
				if (state !== -1 && state !== 1) {
					return;
				}

				switch (button) {
				// X-Axes (-1..1)
				case 'AXES_0':
					if (state === -1) {
						gamepadLongpressSimulator(gamepad, exports.selectedNode.moveLeft);
					} else if (state === 1) {
						gamepadLongpressSimulator(gamepad, exports.selectedNode.moveRight);
					}
					break;

				// Y-Axes (-1..1)
				case 'AXES_1':
					if (state === -1) {
						gamepadLongpressSimulator(gamepad, exports.selectedNode.moveUp);
					} else if (state === 1) {
						gamepadLongpressSimulator(gamepad, exports.selectedNode.moveDown);
					}
					break;

				case 'BUTTON_12': // Up
					gamepadLongpressSimulator(gamepad, exports.selectedNode.moveUp);
					break;

				case 'BUTTON_13': // Down
					gamepadLongpressSimulator(gamepad, exports.selectedNode.moveDown);
					break;

				case 'BUTTON_14': // Left
					gamepadLongpressSimulator(gamepad, exports.selectedNode.moveLeft);
					break;

				case 'BUTTON_15': // Right
					gamepadLongpressSimulator(gamepad, exports.selectedNode.moveRight);
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
