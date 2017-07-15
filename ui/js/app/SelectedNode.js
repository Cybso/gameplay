(function() {
	"use strict";

	define(['knockout', 'utils'],
		function(ko, utils) {
			return function(viewModel) {
				var realSelectedNode = ko.observable(document.getElementsByClassName('selected')[0]);

				var selectedNode = ko.computed({
					read: realSelectedNode,
					write: function(value) {
						// Remove class name 'selected' from all but the given node.
						var list = document.getElementsByClassName('selected');
						for (var i in list) {
							if (list.hasOwnProperty(i)) {
								if (list[i] !== undefined && list[i].classList && list[i] !== value) {
									list[i].classList.remove('selected');
								}
							}
						}
						if (value !== undefined) {
							value.classList.add('selected');
							utils.scrollToIfNotInViewport(value);
						}
						realSelectedNode(value);
					}
				});

				selectedNode.moveLeft = function() {
				};

				selectedNode.moveRight = function() {
					// Get all .selectable elements
					var elements = document.getElementsByClassName('selectable');
					if (!elements.length) {
						return;
					}

					var current = selectedNode();
					var i, rect;
					if (current === undefined) {
						// Select the very first element
						selectedNode(elements[0]);
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
						selectedNode(candidate.element);

					}

				};

				selectedNode.moveUp = function() {
				};

				selectedNode.moveDown = function() {
				};

				return selectedNode;
			};
		}
	);
})();

