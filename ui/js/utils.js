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
			if (!this.isElementInViewport(element, true)) {
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
		}
	});
})();
