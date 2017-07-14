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
		}
	});
})();
