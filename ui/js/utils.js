(function() {
	"use strict";

	define(function() {
		window.guid = function() {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
			}
			return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
		};

		/**
		 * Returns a HSL hue value randomly calculated from the given string.
		 * The range is from 0 to 359.
		 */
		window.stringToHue = function(str) {
			// Use CRC16 checksum to get a pseudo-random value for hue
			var mask = 40961; // 0xA001
			var crc, n, i, b;
			crc = 65535;
			for (i = 0; i < str.length; i+=1) {
				b = str.charCodeAt(i);
				crc = crc ^ b;
				for (n = 0; n < 8; n+=1) {
					if (crc & 1 > 0) {
						crc = (crc >>> 1) ^ mask;
					} else {
						crc = crc >>> 1;
					}
				}
			}
			return crc % 360;
		};

		return {
			guid: window.guid
		};
	});
})();
