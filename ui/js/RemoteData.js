/**
 *
 * Retrieve data from given URL. The data is fetched on the first access.
 * There is a promise object that provides the following methods:
 *
 *	subscribeTo(observable):
 *		Refreshes the data if the defined observable changes.
 *
 *	done(data):
 *		Post-process the retrieved data. May return a new data object
 *		that replaced the retrieved one (e.g. for applying ko.mapping
 *		to the object)
 *
 *	whenReady(callback):
 *		The callback is called immediately when the data is already
 *		available, otherwise when the object will be ready the first time.
 *
 *	ready():
 *		An observable that becomes true if the data has been retrieved
 *
 *	failed():
 *		An observable that becomes true if the retrieval failed
 *
 *	loading():
 *		Will return true if a request is in process.
 *
 *	refresh():
 *		Force reload of the data.
 *
 *	License: LGPL 2.1
 *
 *	Author: Roland Tapken <rt@tasmiro.de>
 */
(function() {
	"use strict";

	define(['knockout', 'req'], function(ko, req) {

		return function(url) {
			var list = ko.observableArray([]);
			var ready = ko.observable(false);
			var failed = ko.observable(false);
			var loading = ko.observable(false);
			var doneObservers = [];

			var refreshHelper = ko.observable(0);
			var currentHash = '';
			var result = ko.computed({
				deferEvaluation: true,
				read: function() {
					var myurl = ko.unwrap(url);
					var refresh = refreshHelper();
					var hash = refresh + ":" + myurl;
					if (hash !== currentHash) {
						// Reload data
						currentHash = hash;
						if (myurl === undefined) {
							ready(true);
						} else {
							ready(false);
							loading(true);
							req({
								url: myurl,
								type: 'json'
							}).then(function(data) {
								if (currentHash !== hash) {
									return;
								}
								for (var i = 0; i < doneObservers.length; i+=1) {
									var newData = doneObservers[i](data);
									if (newData !== undefined) {
										data = newData;
									}
								}
								list(data);
								ready(true);
								loading(false);
							}).fail(function(resp) {
								if (currentHash !== hash) {
									return;
								}
								failed(true);
								loading(false);
							});
						}
						failed(false);
						list([]);
					}
					return list();
				}
			});

			// Allow access to the url, especially when it's an observable
			result.url = url;

			result.failed = ko.pureComputed(failed);

			result.ready = ko.pureComputed(function() {
				// Ensure that result will be fetched on the first access...
				if (ready()) {
					return true;
				}
				result.peek(); // Fetch now... but without subscribing
				return ready();
			});

			result.load = function() {
				// Force immediately loading...
				result();
				return this;
			};

			result.refresh = function() {
				refreshHelper(refreshHelper() + 1);
				return this;
			};

			result.subscribeTo = function(observable) {
				for (var i = 0; i < arguments.length; i += 1) {
					arguments[i].subscribe(result.refresh);
				}
				return this;
			};

			result.done = function(observer) {
				doneObservers.push(observer);
				return this;
			};

			result.whenReady = function(observer) {
				if (result.ready()) {
					observer(result());
				} else {
					var observerSubscription = result.ready.subscribe(function() {
						observerSubscription.dispose();
						observer(result());
					});
				}
				return this;
			};

			result.loading = ko.pureComputed(loading);

			// Allow access to raw data
			result.raw = list;

			return result;
		};
	});
})();
/* vim: set fenc=utf-8 ts=4 sw=4 noet : */
