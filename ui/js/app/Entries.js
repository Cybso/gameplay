(function() {
	"use strict";

	define(['knockout', 'ko/translate', 'RemoteData', 'locales'], 
		function(ko, t, RemoteData, locales) {
			return function(viewModel) {
				var entries = ko.observableArray(window.yagala.getApps());

				// Resolves an entry by its id
				entries.byId = function(id) {
					var list = entries();
					for (var i = 0; i < list.length; i+=1) {
						if (list[i].id === id) {
							return list[i];
						}
					}
					return undefined;
				};

				return entries;
			};
		}
	);
})();


