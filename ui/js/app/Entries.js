(function() {
	"use strict";

	define(['knockout', 'ko/translate', 'RemoteData', 'locales'], 
		function(ko, t, RemoteData, locales) {
			return function(viewModel) {
				// FIXME Query entries from Yagala API
				var entries = new RemoteData('test/data.json').done(function(data) {
					var result = [];
					for (var id in data) {
						if (data.hasOwnProperty(id)) {
							data[id].id = id;
							result.push(data[id]);
						}
					}
					return result;
				});

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


