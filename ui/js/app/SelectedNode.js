(function() {
	"use strict";

	/**
	 * Returns true if the new candidates rect is a better destination for
	 * a MOVE LEFT operation than the old one.
	 *
	 * The best candidate is the closest candidate on the left side
	 * where candidate.top >= current.top and candidate.top < current.top.
	 * If there are multiple candidates on the same x-axis the one with
	 * the greatest coordinate on the y-axis wins.
	 *
	 * When there are no candidates on the same height than the current
	 * one the best candidate is the one most right below of the current ones
	 * bottom (greater or equal).
	 **/
	function leftElementComparator(current, newCandidate, oldCandidate) {
		// Check if this is a POSSIBLE candidate which must be left and above us
		if (newCandidate.top >= current.bottom) {
			// Below of us
			return false;
		}

		if (newCandidate.left > current.left && newCandidate.bottom > current.top) {
			// Right, but not above us
			return false;
		}

		if (newCandidate.left <= current.left &&
			newCandidate.bottom > current.bottom && newCandidate.top > current.top) {
			// Left of us, but only partly overlaps
			return false;
		}

		if (oldCandidate !== undefined) {
			// Check if the new candidate is better than the old one
			if (newCandidate.bottom > current.top) {
				// Partly overlaps with us vertically
				if (oldCandidate.bottom <= current.top) {
					// Old candidate was above of us
					return true;
				}
				if (newCandidate.left > oldCandidate.left) {
					// new is nearer than old
					return true;
				}
				if (newCandidate.top > oldCandidate.top) {
					// Both have the same position on the y-axis but new is below old
					return true;
				}
			} else if (oldCandidate.bottom <= current.top) {
				// Both candidates are below of us
				if (newCandidate.bottom > oldCandidate.bottom) {
					// new is below old
					return true;
				}
				if (newCandidate.left > oldCandidate.left) {
					// both have the same position on the x-axis but new is more on the right side
					return true;
				}
				if (newCandidate.top > oldCandidate.top) {
					// both have the same (x,y) position but new is shorter than old
					return true;
				}
			}
			// oldCandidate is preferred over newCandidate
			return false;
		} else {
			return true;
		}
	}

	/**
	 * Returns true if the new candidates rect is a better destination for
	 * a MOVE RIGHT operation than the old one.
	 *
	 * The best candidate is the closest candidate on the right side
	 * where candidate.top >= current.top and candidate.top < current.top.
	 * If there are multiple candidates on the same x-axis the one with
	 * the lowest coordinate on the y-axis wins.
	 *
	 * When there are no candidates on the same height than the current
	 * one the best candidate is the one most left below of the current ones
	 * bottom (greater or equal).
	 **/
	function rightElementComparator(current, newCandidate, oldCandidate) {
		// Check if this is a POSSIBLE candidate which must be right or below of us.
		if (newCandidate.bottom <= current.top) {
			// Above us
			return false;
		}

		if (newCandidate.left <= current.left && newCandidate.top <= current.bottom) {
			// Left, but not below us
			return false;
		}

		if (newCandidate.left >= current.left &&
			newCandidate.top < current.top && newCandidate.bottom < current.bottom) {
			// Right of us, but only partly overlaps
			return false;
		}

		if (oldCandidate !== undefined) {
			// Check if the new candidate is better than the old one
			if (newCandidate.top < current.bottom) {
				// Partly overlaps with us vertically
				if (oldCandidate.top >= current.bottom) {
					// Old candidate was below of us
					return true;
				}
				if (newCandidate.left < oldCandidate.left) {
					// new is nearer than old
					return true;
				}
				if (newCandidate.top < oldCandidate.top) {
					// Both have the same position on the y-axis but new is above old
					return true;
				}
			} else if (oldCandidate.top >= current.bottom) {
				// Both candidates are below of us
				if (newCandidate.top < oldCandidate.top) {
					// new is above old
					return true;
				}
				if (newCandidate.left < oldCandidate.left) {
					// both have the same position on the x-axis but new is more on the left side
					return true;
				}
				if (newCandidate.bottom < oldCandidate.bottom) {
					// both have the same (x,y) position but new is shorter than old
					return true;
				}
			}
			// oldCandidate is preferred over newCandidate
			return false;
		} else {
			return true;
		}
	}

	/**
	 * Checks wether the  new candidate rect is a better candidate for
	 * MOVE UP operation  than the old one. The candidates BOTTOM must
	 * be over the current's TOP. If there are multiple candidates having
	 * the same BOTTOM the one with the shortest distance to our left
	 * or right side wins.
	 */
	function topElementComparator(current, newCandidate, oldCandidate) {
		if (newCandidate.bottom > current.top) {
			return false;
		}
		if (oldCandidate !== undefined) {
			if (oldCandidate.bottom < newCandidate.bottom) {
				return true;
			}
			var oldDistance = Math.min(
				Math.abs(oldCandidate.left - current.left),
				Math.abs(oldCandidate.right - current.right),
				Math.abs(oldCandidate.left - current.right),
				Math.abs(oldCandidate.right - current.left)
			);

			var newDistance = Math.min(
				Math.abs(newCandidate.left - current.left),
				Math.abs(newCandidate.right - current.right),
				Math.abs(newCandidate.left - current.right),
				Math.abs(newCandidate.right - current.left)
			);

			return newDistance < oldDistance;
		} else {
			return true;
		}
	}

	/**
	 * Checks wether the new candidate rect is a better candidate for
	 * MOVE DOWN operation than the old one. The candidates TOP must
	 * be under the current's BOTTOM. If there are multiple candidates having
	 * the same TOP the one with the shortest distance to our left
	 * or right side wins.
	 */
	function bottomElementComparator(current, newCandidate, oldCandidate) {
		if (newCandidate.top < current.bottom) {
			return false;
		}
		if (oldCandidate !== undefined) {
			if (oldCandidate.top > newCandidate.top) {
				return true;
			}
			var oldDistance = Math.min(
				Math.abs(oldCandidate.left - current.left),
				Math.abs(oldCandidate.right - current.right),
				Math.abs(oldCandidate.left - current.right),
				Math.abs(oldCandidate.right - current.left)
			);

			var newDistance = Math.min(
				Math.abs(newCandidate.left - current.left),
				Math.abs(newCandidate.right - current.right),
				Math.abs(newCandidate.left - current.right),
				Math.abs(newCandidate.right - current.left)
			);

			return newDistance < oldDistance;
		} else {
			return true;
		}
	}

	define(['knockout', 'utils', 'lib/smooth-scroll.min'],
		function(ko, utils, smoothScroll) {

			// Add header to Smooth Scroll library
			smoothScroll.init({
				selectorHeader: 'header',
				speed: 250,
				offset: 15
			});

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
							smoothScroll.animateScroll(value);
						}
						realSelectedNode(value);
					}
				});

				// Common implementation of the move* functions.
				var move = function(preferredElementComparator) {
					// Get all .selectable elements
					var elements = document.getElementsByClassName('selectable');
					if (!elements.length) {
						return;
					}

					var current = selectedNode();
					if (current === undefined || current.getBoundingClientRect === undefined) {
						// Select the very first element
						selectedNode(elements[0]);
						return;
					}

					var rect = current.getBoundingClientRect();
					var candidate, candidateRect, newCandidateRect, i;
					for (i in elements) {
						if (elements.hasOwnProperty(i) && elements[i] !== current && elements[i] !== undefined) {
							if (elements[i].getBoundingClientRect !== undefined) {
								newCandidateRect = elements[i].getBoundingClientRect();
								if (preferredElementComparator(rect, newCandidateRect, candidateRect)) {
									candidate = elements[i];
									candidateRect = newCandidateRect;
								}
							}
						}
					}

					if (candidate) {
						selectedNode(candidate);
					}
				};

				selectedNode.moveLeft = function() {
					move(leftElementComparator);
				};

				selectedNode.moveRight = function() {
					move(rightElementComparator);
				};

				selectedNode.moveUp = function() {
					move(topElementComparator);
				};

				selectedNode.moveDown = function() {
					move(bottomElementComparator);
				};

				return selectedNode;
			};
		}
	);
})();

