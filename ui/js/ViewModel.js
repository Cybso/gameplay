/**
 * ViewModel for Yagala
 *
 *	License: GPL 2.1
 *
 *	Author: Roland Tapken <rt@tasmiro.de>
 */

(function() {
	"use strict";

	define(['knockout', 'RemoteData', 'moment', 'utils', 'app/Locale', 'app/Entries'], 
		function(ko, RemoteData, moment, utils, Locale, Entries) {
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

			// Create a shortcut
			exports.selected = exports.entries.selected;


			// Selected entry
			// TODO Move this into app/Entries
			exports.selected = (function() {
				var selected = ko.observable();

				var moveLeft = function() {
					// Find the next selectable element left of the current one
				};

				var moveUp = function() {
					// Find the next selectable element left of the current one
				};

				var moveDown = function() {
					// Find the next selectable element left of the current one
				};

				var moveRight = function() {
					// Get all .selectable elements
					var elements = document.getElementsByClassName('selectable');
					var current = document.getElementsByClassName('selected')[0];
					var i, rect;
					if (current === undefined) {
						// Select the very first element
						elements[0].classList.add('selected');
						return;
					}

					// Fetch all bounding rects...
					var newList = [];
					for (i in elements) {
						if (elements.hasOwnProperty(i)) {
							if (elements[i].getBoundingClientRect !== undefined) {
								rect = elements[i].getBoundingClientRect();
								rect.element = elements[i];
								newList.push(rect);
							}
						}
					}
					elements = newList;

					// Sort elements by top, left, bottom, right
					elements.sort(function(a, b) {
						if (a.left < b.left) { return -1; }
						if (a.left > b.left) { return 1; }
						if (a.top < b.top) { return -1; }
						if (a.top > b.top) { return 1; }
						if (a.bottom < b.bottom) { return -1; }
						if (a.bottom > b.bottom) { return 1; }
						if (a.right < b.right) { return -1; }
						if (a.right > b.right) { return 1; }
						return 0;
					});

					rect = current.getBoundingClientRect();
					var candidate, fallbackCandidate;
					for (i = 0; i < elements.length; i+=1) {
						var element = elements[i];
						if (element === current) {
							continue;
						}
						if (element.left > rect.right) {
							if (candidate === undefined) {
								if (element.bottom > rect.top) {
									candidate = element;
									// Does this element intersect with the current one? Then we are ready.
									if (element.bottom >= rect.top && element.top <= rect.bottom) {
										break;
									}
								}
							} else {
								// Can only be a better match if there is an intersection with the
								// current element.
								if (element.bottom >= rect.top && element.top <= rect.bottom) {
									candidate = element;
									break;
								}
							}
						}
						if (fallbackCandidate === undefined) {
							if (element.top > rect.bottom) {
								fallbackCandidate = element;
							}
						}
					}

					candidate = candidate || fallbackCandidate;
					if (candidate) {
						current.classList.remove('selected');
						candidate.element.classList.add('selected');

						// Ensure that the element is visible...
						// Prefers experimental Element.scrollIntoView method if available
						// and falls back to location.hash to let the browser decide how
						// to scroll this elelement into the viewport.
						if (!utils.isElementInViewport(candidate.element, true)) {
							if (Element.prototype.scrollIntoView !== undefined) {
								candidate.element.scrollIntoView({block: "end", behavior: "smooth"});
							} else {
								var id = candidate.element.getAttribute('id');
								if (!id) {
									id = utils.guid();
									candidate.element.setAttribute('id', id);
								}
								window.location.hash = id;
							}
						}
					}


					// Get own absolute dimensions
				};

				document.getElementsByTagName('body')[0].addEventListener('keyup', function(evt) {
				});

				document.getElementsByTagName('body')[0].addEventListener('keydown', function(evt) {
					switch (evt.code || evt.keyIdentifier) {
					case 'ArrowLeft':
					case 'Left':
						moveLeft();
						break;
					case 'ArrowRight':
					case 'Right':
						moveRight();
						break;
					}
				});

				function gameLoop() {
					var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
					if (!gamepads) {
						return;
					}

					for (var i = 0; i < gamepads.length; i+=1) {
						var gp = gamepads[i];
						if (gp) {
							if (gp.axes[0] < 0) {
								return moveLeft();
							} else if (gp.axes[0] > 0) {
								return moveRight();
							} else if (gp.axes[1] < 0) {
								return moveUp();
							} else if (gp.axes[1] > 0) {
								return moveDown();
							}
						}
					}
				}
				window.setInterval(gameLoop, 150);

				// FIXME Add Code to check wether any gamepads are connected or not.
				// The event loop can be disabled when there are no gamepads
				window.addEventListener("gamepadconnected", function(e) {
					console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
					e.gamepad.index, e.gamepad.id,
					e.gamepad.buttons.length, e.gamepad.axes.length);
				});
				return selected;
			})();

			return exports;
		}
	);
})();
