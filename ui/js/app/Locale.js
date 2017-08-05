(function() {
	"use strict";

	define(['knockout', 'ko/translate', 'RemoteData', 'locales'], 
		function(ko, t, RemoteData, locales) {

			return function(viewModel) {
				/**
				* Exports the observables 'locale' and 'locale.available'
				**/
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
				var currentLocale = ko.observable(defLang);
				
				// Only use the current locale when it's in set the of available locales.
				// Otherwise, fallback to 'en' as default locale.
				var locale = ko.pureComputed({
					read: function() {
						var currentValue = currentLocale();
						if (currentValue && locales[currentValue] !== undefined) {
							return currentValue;
						}
						return 'en';
					},
					write: currentLocale
				});
				locale.available = available;

				// Update knockout.translate when locale changes
				//new RemoteData(ko.pureComputed(function() {
				//	return 'js/locale/' + locale() + '.json';
				//})).done(t.map).load();

				return locale;
			};
		}
	);
})();
