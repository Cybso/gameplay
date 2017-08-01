/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2017, Roland Tapken.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 **/
(function (root, factory) {
	if ( typeof define === 'function' && define.amd ) {
		define([], factory(root));
	} else if (typeof module !== 'undefined' && module.export) {
		module.exports = factory(root)();
	} else {
		root.nestedScroll = factory(root)();
	}
})(typeof global !== 'undefined' ? global : this.window || this.global, function (root) {
	"use strict"; 

	/**
	 * Default options
	 **/
	var defaultOptions = {
		animationMethod: undefined,
		animationTimeout: 500,
		force: false,
		align: 'top',
		withCssMargins: false,
		marginTop: 0,
		marginLeft: 0,
		marginRight: 0,
		marginBottom: 0
	};

	// Local shortcuts
	var min = Math.min,
		max = Math.max,
		abs = Math.abs;

	/**
	 * Returns a DOMRect compatible object
	 */
	function Rect(x, y, width, height) {
		return {
			left: x,
			top: y,
			width: width,
			height: height,
			right: x + width,
			bottom: y + height
		};
	}

	/**
	 * Helper function to check if an object is a function
	 **/
	function isFunction(functionToCheck) {
		// https://stackoverflow.com/questions/5999998/how-can-i-check-if-a-javascript-variable-is-function-type
		var getType = {};
		return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
	}

	/**
	 * Available animation algorithms. The algorithems get an argument
	 * between 0..1 and must return a result value between 0..1.
	 **/
	var animationAlgorithms = {
		linear: function(linearPos) {
			return linearPos;
		},

		easeInOut: function(linearPos) {
			if (linearPos < 1) {
				return 0.5 * (1+Math.cos(Math.PI + linearPos * Math.PI));
			} else {
				return 1.0;
			}
		},

		easeIn: function(linearPos) {
			if (linearPos < 1) {
				return (1+Math.cos(Math.PI + linearPos * 0.5*Math.PI));
			} else {
				return 1.0;
			}
		},

		easeOut: function(linearPos) {
			if (linearPos < 1) {
				return Math.sin(linearPos * 0.5*Math.PI);
			} else {
				return 1.0;
			}
		}
	};

	/**
	 * Implements scrolling without animation.
	 */
	var defaultScrollHelper = function(target, left, top) {
		if (!this.abort) {
			target.scrollLeft += left;
			target.scrollTop += top;
		}
	};

	/**
	 * Implements scrolling with an animation. The parameter 'timeout'
	 * defines how long the animation should be active. The parameter
	 * 'animationAlgorithm' is a function that transforms a value between
	 * 0 and 1 (the fractional animation offset) into a target value
	 * between 0 and 1 (the fractional scrolling offset).
	 **/
	var animatedScrollHelper = function(target, left, top, animationAlgorithm, timeout) {
		var start;
		var signX = left < 0 ? -1 : 1;
		var signY = top < 0 ? -1 : 1;
		left = abs(left);
		top = abs(top);
		var _this = this;

		var sourceX = target.scrollLeft;
		var sourceY = target.scrollTop;

		function step(timestamp) {
			if (_this.abort) {
				return;
			}
			if (start === undefined) {
				start = timestamp;
			}

			// Get relative position to timeout
			if ((timestamp - start) < timeout) {
				var pos = animationAlgorithm((timestamp - start)/timeout);
				var deltaX = Math.round(min(left, left*pos));
				var deltaY = Math.round(min(top, top*pos));
				target.scrollLeft = sourceX + signX*deltaX;
				target.scrollTop  = sourceY + signY*deltaY;
				window.requestAnimationFrame(step);
			} else {
				target.scrollLeft = sourceX + signX*left;
				target.scrollTop  = sourceY + signY*top;
			}
		}
		window.requestAnimationFrame(step);
	};

	/**
	 * Chooses a scroll helper from this.options.animationMethod.
	 **/
	var scrollHelper = function(target, left, top) {
		if (left >= -1 && left <= 1 && top >= -1 && top <= 1) {
			// No need to animate this...
			target.scrollTop += top;
			target.scrollLeft += left;
			return;
		}

		var animationMethod = this.options['animationMethod'];
		var animationTimeout = parseInt(this.options['animationTimeout']);
		if (animationMethod && !isNaN(animationTimeout) && animationTimeout > 0) {
			if (isFunction(animationMethod)) {
				return animatedScrollHelper.call(this, target, left, top, animationMethod, animationTimeout);
			} else {
				var animationAlgorithm = animationAlgorithms[animationMethod];
				if (animationAlgorithm !== undefined) {
					return animatedScrollHelper.call(this, target, left, top, animationAlgorithm, animationTimeout);
				}
			}
		}
		return defaultScrollHelper.call(this, target, left, top);
	};

	/**
	 * Merge option objects
	 **/
	var mergeObjects = function() {
		var r = {};
		for (var i = 0; i < arguments.length; i+=1) {
			var arg = arguments[i];
			if (typeof arg === 'object') {
				for (var k in arg) {
					if (arg.hasOwnProperty(k)) {
						r[k] = arg[k];
					}
				}
			}
		}
		return r;
	};

	/*
	* How to detect which element is the scrolling element in charge of scrolling the viewport:
	*
	* - in Quirks mode the scrolling element is the "body"
	* - in Standard mode the scrolling element is the "documentElement"
	*
	* webkit based browsers always use the "body" element, disrespectful of the specifications:
	*
	*  http://dev.w3.org/csswg/cssom-view/#dom-element-scrolltop
	*
	* This feature detection helper allow cross-browser scroll operations on the viewport,
	* it will guess which element to use in each browser both in Quirk and Standard modes.
	* See how this can be used in a "smooth scroll to anchors references" example here:
	*
	*  https://dl.dropboxusercontent.com/u/598365/scrollTo/scrollTo.html
	*
	* It is just a fix for possible differences between browsers versions (currently any Webkit).
	* In case the Webkit bug get fixed someday, it will just work if they follow the specs. Win !
	*
	* Author: Diego Perini
	* Updated: 2014/09/18
	* License: MIT
	*/
	function getScrollingElement() {
		var d = document;
		if (d.scrollingElement !== undefined) {
			// Roland Tapken: Use document.scrollingElement if available.
			// https://developer.mozilla.org/de/docs/Web/API/document/scrollingElement
			return d.scrollingElement;
		}
		return  d.documentElement.scrollHeight > d.body.scrollHeight &&
			d.compatMode.indexOf('CSS1') === 0 ?
			d.documentElement :
			d.body;
	}

	/**
	 * Returns true if the element should have scrollbars
	 **/
	var hasScrollbar = function(element, computedStyle) {
		if (element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight) {
			computedStyle = computedStyle || window.getComputedStyle(element);
			var overflow = computedStyle.getPropertyValue('overflow');
			if (overflow === 'auto' || overflow === 'scroll') {
				return true;
			}
			if (overflow !== 'hidden' && element === getScrollingElement()) {
				return true;
			}
		}
		return false;
	};

	/**
	 * Returns the relative bounding rect between the target and
	 * the container element. The container *must* be a parent
	 * element of target.
	 **/
	var getRelativeBoundingRect = function(tRect, container) {
		var cRect;
		if (container === getScrollingElement()) {
			cRect = new Rect(0, 0, container.clientWidth, container.clientHeight);
		} else {
			cRect = container.getBoundingClientRect();
		}
		
		return new Rect(
			tRect.left - cRect.left,
			tRect.top - cRect.top,
			tRect.width,
			tRect.height
		);
	};

	/**
	 * Locates the nearest scrollable parent element. If the
	 * element doesn't have a scrollable parent  (either because
	 * no scrollbars are visible, or the element is a child
	 * of an element with style 'position: fixed') this function
	 * returns undefined.
	 **/
	var findScrollableParent = function(element) {
		if (element === getScrollingElement()) {
			// This is either body or html. Don't go further.
			return;
		}

		var computedStyle = window.getComputedStyle(element);
		while (computedStyle.getPropertyValue('position') !== 'fixed' && element.parentElement) {
			element = element.parentElement;
			computedStyle = window.getComputedStyle(element);
			if (hasScrollbar(element, computedStyle)) {
				return element;
			}
		}
		return undefined;
	};

	/**
	 * Helper functions that return the scrolling deltas for
	 * different alignments.
	 **/
	var alignments = {
		left: function(rect, scrollable, force) {
			if (!force && rect.left >= 0 && rect.right <= scrollable.clientWidth) {
				return 0;
			}
			var maxLeft = scrollable.scrollWidth - scrollable.clientWidth;
			return min(maxLeft, max(0, scrollable.scrollLeft + rect.left)) - scrollable.scrollLeft;
		},
		top: function(rect, scrollable, force) {
			if (!force && rect.top >= 0 && rect.bottom <= scrollable.clientHeight) {
				return 0;
			}
			var maxTop = scrollable.scrollHeight - scrollable.clientHeight;
			return min(maxTop, max(0, scrollable.scrollTop + rect.top)) - scrollable.scrollTop;
		},
		right: function(rect, scrollable, force) {
			if (!force && rect.left >= 0 && rect.right <= scrollable.clientWidth) {
				return 0;
			}
			var maxLeft = scrollable.scrollWidth - scrollable.clientWidth;
			return min(maxLeft, max(0, scrollable.scrollLeft + rect.right - scrollable.clientWidth)) -
				scrollable.scrollLeft;
		},
		bottom: function(rect, scrollable, force) {
			if (!force && rect.top >= 0 && rect.bottom <= scrollable.clientHeight) {
				return 0;
			}
			var maxTop = scrollable.scrollHeight - scrollable.clientHeight;
			return min(maxTop, max(0, scrollable.scrollTop + rect.bottom - scrollable.clientHeight)) -
				scrollable.scrollTop;
		},
		autox: function(rect, scrollable, force) {
			// Use this minimal offset
			var delta1 = alignments.left(rect, scrollable, force),
			    delta2 = alignments.right(rect, scrollable, force);
			if (abs(delta1) <= abs(delta2)) {
				return delta1;
			} else {
				return delta2;
			}
		},
		autoy: function(rect, scrollable, force) {
			// Use this minimal offset
			var delta1 = alignments.top(rect, scrollable, force),
			    delta2 = alignments.bottom(rect, scrollable, force);
			if (abs(delta1) <= abs(delta2)) {
				return delta1;
			} else {
				return delta2;
			}
		}
	};

	/**
	 * Calculates the target bounding client rect and adds optional
	 * CSS borders and margins, and if defined the extra margins
	 * from options.
	 **/
	var getTargetBoundingClientRect = function(element, options) {
		var rect = element.getBoundingClientRect();
		var left = 0|parseInt(options.marginLeft),
		    top = 0|parseInt(options.marginTop),
		    right = 0|parseInt(options.marginRight),
		    bottom = 0|parseInt(options.marginBottom);

		if (options.withCssMargins) {
			var tStyle = window.getComputedStyle(element);
			top += 0|parseInt(tStyle.marginTop, 10) + 0|parseInt(tStyle.borderTop, 10);
			left += 0|parseInt(tStyle.marginLeft, 10) + 0|parseInt(tStyle.borderLeft, 10);
			bottom += 0|parseInt(tStyle.marginBottom, 10) + 0|parseInt(tStyle.borderBottom, 10);
			right += 0|parseInt(tStyle.marginRight, 10) + 0|parseInt(tStyle.borderRight, 10);
		}

		return new Rect(
			rect.left - left,
			rect.top - top,
			rect.width + left + right,
			rect.height + top + bottom
		);
	};

	/**
	 * Implementation of NestedScroll.
	 **/
	var currentScrollMonitor;
	var nestedScroll = function(element, options) {
		options = mergeObjects(defaultOptions, options);

		// Stop running scroll process
		if (currentScrollMonitor !== undefined) {
			currentScrollMonitor.abort = true;
		}
		currentScrollMonitor = { abort: false, options: options };

		var targetRect = getTargetBoundingClientRect(element, options);

		var align = (options.align || '').split(' ');
		var getOffsetX = align.indexOf('left') >= 0 ? alignments['left'] : (
			align.indexOf('right') >= 0 ? alignments['right'] : alignments['autox']
		);
		var getOffsetY = align.indexOf('top') >= 0 ? alignments['top'] : (
			align.indexOf('bottom') >= 0 ? alignments['bottom'] : alignments['autoy']
		);

		var scrollable = findScrollableParent(element);
		var scrollings = [];
		var totalOffsetLeft = 0,
			totalOffsetTop = 0;
		while (scrollable) {
			var rect = getRelativeBoundingRect(targetRect, scrollable);
			rect.left -= totalOffsetLeft;
			rect.top -= totalOffsetTop;
			rect.right -= totalOffsetLeft;
			rect.bottom -= totalOffsetTop;

			var offsetLeft = getOffsetX(rect, scrollable, options.force);
			var offsetTop = getOffsetY(rect, scrollable, options.force);

			totalOffsetLeft += offsetLeft;
			totalOffsetTop += offsetTop;
			scrollings.push([scrollable, offsetLeft, offsetTop]);

			scrollable = findScrollableParent(scrollable);
		}

		// Invoke scroll tasks. This is done asynchonously to allow effects like easing.
		for (var i = 0; i < scrollings.length; i+=1) {
			scrollHelper.apply(currentScrollMonitor, scrollings[i]);
		}
	};

	/**
	 * Getter/Setter for default options. Call this either without arguments
	 * to get a copy of all options, with a string argument to get a concrete
	 * value, with an object argument to update multiple options at once and
	 * with two arguments to set a concrete value.
	 **/
	nestedScroll.config = function() {
		switch (arguments.length) {
		case 0:
			// Return all options (but only as copy)
			return mergeObjects(defaultOptions);
		case 1:
			if (typeof arguments[0] === 'string') {
				// Getter call
				return defaultOptions[arguments[0]];
			} else {
				// Mass setter
				var obj = arguments[0];
				for (var k in obj) {
					if (obj.hasOwnProperty(k)) {
						defaultOptions[k] = obj[k];
					}
				}
			}
			break;
		case 2:
			// Setter call
			defaultOptions[arguments[0]] = arguments[1];
			break;
		default:
			throw "Illegal number of arguments: " + arguments.length;
		}
	};

	return function() {
		return nestedScroll;
	};
});
