(function() {
	"use strict";

	/**
	 * Returns the number of common ancestors of
	 * boths elements, counted from the body element.
	 */
	function countCommonAncestors(us, other) {
		var root = document.body;
		var ourParents = [];
		var otherParents = [];
		var p;

		p = us;
		while (p && p !== root) {
			ourParents.push(p);
			p = p.parentNode;
		}
		p = other;
		while (p && p !== root) {
			otherParents.push(p);
			p = p.parentNode;
		}
		ourParents.reverse();
		otherParents.reverse();
		for (var i = 0; i < ourParents.length && i < otherParents.length; i+=1) {
			if (ourParents[i] !== otherParents[i]) {
				break;
			}
		}

		return i;
	}

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
	 *
	 * Additionally, every selectable element can define 'data-select-order'.
	 * On movements to left or up the element with the lower order always wins.
	 * On movements to right or down the element with the higher order always wins.
	 *
	 * The initially selected element is the first one with the lowest 
	 * 'data-select-order' value. The default value is '0'.
	 *
	 * 'data-select-leave-order' can restrict the directions that can be
	 * used to leave the current order. Must be defined on the same element
	 * as 'data-select-order'.
	 **/
	function leftElementComparator(current, newCandidate, oldCandidate) {
		// Check if this is a POSSIBLE candidate which must be left and above us
		if (newCandidate.top >= current.bottom) {
			// Below of us
			return false;
		}

		if (newCandidate.left > current.left) {
			if (newCandidate.bottom > current.top || newCandidate.selectOrder !== current.selectOrder) {
				// Right, but not below us
				return false;
			}
		}

		if (newCandidate.left <= current.left &&
			newCandidate.bottom > current.bottom && newCandidate.top > current.top) {
			if (newCandidate.selectOrder >= current.selectOrder) {
				// Left of us, but only partly overlaps
				return false;
			}
		}

		if (oldCandidate !== undefined) {
			// Check if the new candidate is better than the old one
			if (newCandidate.bottom > current.top) {
				// Partly overlaps with us vertically
				if (oldCandidate.bottom <= current.top) {
					// Old candidate was above of us
					return true;
				}

				if (newCandidate.selectOrder < oldCandidate.selectOrder) {
					// Always prefer newCandidate
					return true;
				} else if (newCandidate.selectOrder > oldCandidate.selectOrder) {
					// Always prefer oldCandidate
					return false;
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
				// Both candidates are above of us

				// Check if the new candidate is better than the old one. First,
				// elements that resides below us are preferred. Second, the element
				// having the next ancestor is preferred (basically, this is the same
				// when iterating the current element).
				if (oldCandidate.commonAncestors > newCandidate.commonAncestors) {
					return false;
				} else if (oldCandidate.commonAncestors < newCandidate.commonAncestors) {
					return true;
				}

				if (newCandidate.selectOrder < oldCandidate.selectOrder) {
					// Always prefer newCandidate
					return true;
				} else if (newCandidate.selectOrder > oldCandidate.selectOrder) {
					// Always prefer oldCandidate
					return false;
				}

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
	leftElementComparator.direction = 'left';

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

		if (newCandidate.left <= current.left) {
			if (newCandidate.top <= current.bottom || newCandidate.selectOrder !== current.selectOrder) {
				// Left, but not below us
				return false;
			}
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

				if (newCandidate.selectOrder < oldCandidate.selectOrder) {
					// Always prefer newCandidate
					return true;
				} else if (newCandidate.selectOrder > oldCandidate.selectOrder) {
					// Always prefer oldCandidate
					return false;
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

				// Check if the new candidate is better than the old one. First,
				// elements that resides below us are preferred. Second, the element
				// having the next ancestor is preferred (basically, this is the same
				// when iterating the current element).
				if (oldCandidate.commonAncestors > newCandidate.commonAncestors) {
					return false;
				} else if (oldCandidate.commonAncestors < newCandidate.commonAncestors) {
					return true;
				}

				if (newCandidate.selectOrder > oldCandidate.selectOrder) {
					// Always prefer newCandidate
					return true;
				} else if (newCandidate.selectOrder < oldCandidate.selectOrder) {
					// Always prefer oldCandidate
					return false;
				}

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
	rightElementComparator.direction = 'right';

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
			// Check if the new candidate is better than the old one. First,
			// elements that resides below us are preferred. Second, the element
			// having the next ancestor is preferred (basically, this is the same
			// when iterating the current element).
			if (oldCandidate.commonAncestors > newCandidate.commonAncestors) {
				return false;
			} else if (oldCandidate.commonAncestors < newCandidate.commonAncestors) {
				return true;
			}

			if (newCandidate.selectOrder < oldCandidate.selectOrder) {
				// Always prefer newCandidate
				return true;
			} else if (newCandidate.selectOrder > oldCandidate.selectOrder) {
				// Always prefer oldCandidate
				return false;
			}

			if (oldCandidate.bottom < newCandidate.bottom) {
				return true;
			} else if (oldCandidate.bottom > newCandidate.bottom) {
				return false;
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
	topElementComparator.direction = 'up';

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
			// Check if the new candidate is better than the old one. First,
			// elements that resides below us are preferred. Second, the element
			// having the next ancestor is preferred (basically, this is the same
			// when iterating the current element).
			if (oldCandidate.commonAncestors > newCandidate.commonAncestors) {
				return false;
			} else if (oldCandidate.commonAncestors < newCandidate.commonAncestors) {
				return true;
			}

			if (newCandidate.selectOrder < oldCandidate.selectOrder) {
				// Always prefer newCandidate
				return true;
			} else if (newCandidate.selectOrder > oldCandidate.selectOrder) {
				// Always prefer oldCandidate
				return false;
			}

			if (oldCandidate.top > newCandidate.top) {
				return true;
			} else if (oldCandidate.top < newCandidate.top) {
				return false;
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
	bottomElementComparator.direction = 'down';

	/**
	 * Returns an object with the values 'order'
	 * and 'directions'. Order is an integer value
	 * derived from the attribute 'data-select-order'
	 * from the element or any of its parents.
	 *
	 * 'direction' is an array with the directions
	 * allowed to leave the current order level. Must
	 * be defined together with 'data-select-order'.
	 */
	function getSelectOrder(element) {
		while (element) {
			var value = element.getAttribute('data-select-order');
			if (value !== undefined) {
				var intValue = parseInt(value);
				if (!isNaN(intValue)) {
					var directions = (element.getAttribute('data-change-order-direction') || '')
						.split(' ').filter(function(v) { return v; });

					if (directions.length === 0) {
						return { order: intValue, directions: ['left', 'up', 'right', 'down'] };
					} else {
						return { order: intValue, directions: directions };
					}
				}
			}
			element = element.parentElement;
		}
		return { order: 0, directions: ['left', 'up', 'right', 'down'] };
	}

	/**
	 * Adds the class 'selected-parent' to every parent node of the
	 * selected child (and removes it from every other element).
	 **/
	function updateSelectedParents(element) {
		[].forEach.call(document.querySelectorAll('.selected-parent'), function(e) {
			e.classList.remove('selected-parent');
		});

		while (element.parentElement) {
			element = element.parentElement;
			element.classList.add('selected-parent');
		}
	}

	/**
	 * Returns false if the element is either made invisible
	 * using display, visibility, opacity, width or height,
	 * or if the element is overlayed by another element
	 * that is not one of our childs.
	 **/
	function isElementSelectable(element, rect) {
		// elementFromPoint
		var style = window.getComputedStyle(element, null);
		if (style.getPropertyValue('display') === 'none' ||
			style.getPropertyValue('visibility') === 'hidden' ||
			style.getPropertyValue('opacity') === '0.0' ||
			element.clientWidth  === 0 ||
			element.clientHeight === 0
		) {
			return false;
		}

		// Check the element of every point in the corner
		var checkPoints = [
			[rect.left + rect.width/2, rect.top + rect.height/2],
			[rect.left + rect.width/2, rect.top],
			[rect.left + rect.width/2, rect.bottom],
			[rect.left, rect.top + rect.height/2],
			[rect.right, rect.top + rect.height/2],
			[rect.left, rect.top],
			[rect.left, rect.bottom],
			[rect.right, rect.top],
			[rect.right, rect.bottom],
		];

		// At least one corner must be visible
		for (var i = 0; i < checkPoints.length; i+=1) {
			var p = checkPoints[i];
			var e = document.elementFromPoint(p[0], p[1]);
			if (e === undefined || e === null) {
				// Out of viewport, assume true
				return true;
			}
			while (e) {
				if (e === element) {
					return true;
				}
				e = e.parentElement;
			}
		}

		return false;
	}

	define(['knockout', 'utils', 'lib/nestedscroll'],
		function(ko, utils, nestedScroll) {

			// Add header to NestedScroll library
			nestedScroll.config({
				animationMethod: 'easeOut',
				marginTop: 100,
				marginBottom: 10,
				align: 'auto'
			});

			return function(viewModel) {
				var realSelectedNode = ko.observable(document.getElementsByClassName('selected')[0]);
				realSelectedNode.subscribe(updateSelectedParents);

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
							
							// Check if scrolling is needed
							var rect = value.getBoundingClientRect();
							var offsetTop = document.getElementsByTagName('header')[0].clientHeight || 0;
							var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
							var windowWidth = (window.innerWidth || document.documentElement.clientWidth);

							if (rect.top < offsetTop ||
								rect.bottom > windowHeight ||
								rect.left < 0 ||
								rect.right > windowWidth) {
								nestedScroll(value);
							}
						}

						realSelectedNode(value);
					}
				});

				var findInitialNode = function(elements) {
					// Select the first element with the lowest 'data-select-order' value
					var currentSelectOrder = Number.POSITIVE_INFINITY;
					var current;
					for (var i = 0; i < elements.length; i+=1) {
						if (elements[i] !== undefined && elements[i].getAttribute !== undefined) {
							var order = getSelectOrder(elements[i]).order;
							if (order < currentSelectOrder) {
								currentSelectOrder = order;
								current = elements[i];
							}
						}
					}
					return current;
				};

				// Common implementation of the move* functions.
				var move = function(preferredElementComparator) {
					// Get all .selectable elements. The selector is stored in the body element.
					var selector = document.body.getAttribute('data-select-scope') || '.selectable';
					var elements = document.querySelectorAll(selector);
					if (!elements.length) {
						return;
					}

					var current = selectedNode();
					if ([].indexOf.call(elements, current) < 0) {
						current = undefined;
					}

					if (current === undefined || current.getBoundingClientRect === undefined) {
						selectedNode(findInitialNode(elements));
						return;
					}

					var rect = current.getBoundingClientRect();
					rect.element = current;
					var selectOrder = getSelectOrder(current);
					rect.selectOrder = selectOrder.order;
					var candidate, candidateRect, newCandidateRect;
					for (var i in elements) {
						if (elements.hasOwnProperty(i) && elements[i] !== current && elements[i] !== undefined) {
							if (elements[i].getBoundingClientRect !== undefined) {
								newCandidateRect = elements[i].getBoundingClientRect();
								newCandidateRect.element = elements[i];
								if (!isElementSelectable(elements[i], newCandidateRect)) {
									continue;
								}

								newCandidateRect.selectOrder = getSelectOrder(elements[i]).order;
								if (newCandidateRect.selectOrder !== rect.selectOrder &&
									selectOrder.directions.indexOf(preferredElementComparator.direction) < 0) {
									continue;
								}

								newCandidateRect.commonAncestors = countCommonAncestors(current, elements[i]);
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

