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
						var node = document.querySelectorAll('[data-entry="' + entry.id + '"]')[0];
						exports.selectedNode(node);
					}
				}
			});

			// Bind to key event in body
			document.getElementsByTagName('body')[0].addEventListener('keydown', function(evt) {
				switch (evt.code || evt.keyIdentifier) {
				case 'ArrowLeft':
				case 'Left':
					exports.selectedNode.moveLeft();
					break;
				case 'ArrowRight':
				case 'Right':
					exports.selectedNode.moveRight();
					break;
				case 'ArrowUp':
				case 'Up':
					exports.selectedNode.moveUp();
					break;
				case 'ArrowDown':
				case 'Down':
					exports.selectedNode.moveDown();
					break;
				}
			});

			// Monitor gamepads
			// FIXME Add Code to check wether any gamepads are connected or not.
			// The event loop can be disabled when there are no gamepads
			function gameLoop() {
				var gamepads;
				if (navigator.getGamepads) {
					gamepads = navigator.getGamepads();
				} else if (navigator.webkitGetGamepads) {
					gamepads = navigator.webkitGetGamepads();
				}
				if (!gamepads) {
					return;
				}

				for (var i = 0; i < gamepads.length; i+=1) {
					var gp = gamepads[i];
					if (gp) {
						if (gp.axes[0] < 0) {
							return exports.selectedNode.moveLeft();
						} else if (gp.axes[0] > 0) {
							return exports.selectedNode.moveRight();
						} else if (gp.axes[1] < 0) {
							return exports.selectedNode.moveUp();
						} else if (gp.axes[1] > 0) {
							return exports.selectedNode.moveDown();
						}
					}
				}
			}
			window.setInterval(gameLoop, 150);

			return exports;
		}
	);
})();
