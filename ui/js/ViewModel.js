/**
 * ViewModel for Yagala
 *
 *	License: GPL 2.1
 *
 *	Author: Roland Tapken <rt@tasmiro.de>
 */
/* jshint esversion: 6 */

(function() {
	"use strict";

	define(['knockout', 'ko/mapper', 'ko/translate', 'RemoteData', 'locales', 'moment'], 
		function(ko, kom, t, RemoteData, locales, moment) {
			var exports = { };

			/**
			 * Exports the observables 'locale' and 'locale.available'
			 **/
			exports.locale = (function initializeLocales() {
				// Load available locales
				var available = [];
				for (var id in locales) {
					if (locales.hasOwnProperty(id)) {
						available.push({ id: id, label: locales[id] });
					}
				}

				// Initialize current locale
				var defLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
				if (defLang.indexOf('-') > 0) {
					defLang = defLang.substring(0, defLang.indexOf('-'));
				}
				var locale = ko.observable(defLang);
				
				// Only use the current locale when it's in set the of available locales.
				// Otherwise, fallback to 'en' as default locale.
				var result = ko.pureComputed({
					read: function() {
						var currentValue = locale();
						if (currentValue && locales[currentValue] !== undefined) {
							return currentValue;
						}
						return 'en';
					},
					write: locale
				});
				result.available = available;

				// Update knockout.translate when locale changes
				new RemoteData(ko.pureComputed(function() {
					return 'js/locale/' + result() + '.json';
				})).done(t.map).load();

				return result;
			})();

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
			exports.entries = new RemoteData('test/data.json').done(function(data) {
				var result = [];
				for (var id in data) {
					if (data.hasOwnProperty(id)) {
						data[id].id = id;
						result.push(data[id]);
					}
				}
				return result;
			});

			return exports;
		}
	);
})();
