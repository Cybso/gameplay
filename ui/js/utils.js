(function() {
	"use strict";
	define({
		guid: function() {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
			}
			return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
		},

		isElementInViewport: function(el, fully) {
			var rect = el.getBoundingClientRect();
			var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
			var windowWidth = (window.innerWidth || document.documentElement.clientWidth);

			if (fully) {
				return rect.top >= 0 && rect.bottom <= windowHeight && rect.left >= 0 && rect.right <= windowWidth;
			} else {
				return (rect.top < windowHeight && rect.bottom > 0 && rect.left < windowWidth && rect.right > 0);
			}
		},

		scrollToIfNotInViewport: function(element) {
			// Ensure that the element is visible...
			// Prefers experimental Element.scrollIntoView method if available
			// and falls back to location.hash to let the browser decide how
			// to scroll this elelement into the viewport.
			if (element.scrollIntoViewIfNeeded !== undefined && false) {
				// Experimental feature, but supported by Webkit/Chrome
				element.scrollIntoViewIfNeeded();
			} else if (!this.isElementInViewport(element, true)) {
				// Not perfect, since an element still might be overlapped
				// with an overlay.
				if (Element.prototype.scrollIntoView !== undefined) {
					element.scrollIntoView({block: "end", behavior: "smooth"});
				} else {
					var id = element.getAttribute('id');
					if (!id) {
						id = this.guid();
						element.setAttribute('id', id);
					}
					window.location.hash = id;
				}
			}

			window.setTimeout(function() {
				// Check if element is overlapped by header after scrolling
				var header = document.getElementsByTagName('header')[0];
				if (header && header.getBoundingClientRect) {
					var headerRect = header.getBoundingClientRect();
					var elementRect = element.getBoundingClientRect();
					var diff = elementRect.top - headerRect.bottom;
					if (diff < 0) {
						window.scrollBy(0, diff - element.clientTop);
					}
				}
			}, 30);
		}
	});
})();
