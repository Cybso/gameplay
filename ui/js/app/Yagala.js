(function() {
	"use strict";

	define(['knockout', 'ko/translate', 'RemoteData', 'locales'], 
		function(ko, t, RemoteData, locales) {
			return function(viewModel) {
				var apps = ko.observableArray(window.yagala.getApps());

				// Resolves an entry by its id
				apps.byId = function(id) {
					var list = apps();
					for (var i = 0; i < list.length; i+=1) {
						if (list[i].id === id) {
							return list[i];
						}
					}
					return undefined;
				};

				/**
				 * Launch an application
				 **/
				var runApp = function(app) {
					return window.yagala.runApp(app.id === undefined ? app : app.id);
				};

				/**
				 * Suspend an application
				 **/
				var suspendApp = function(app) {
					return window.yagala.suspendApp(app.id === undefined ? app : app.id);
				};

				/**
				 * Resume an application
				 **/
				var resumeApp = function(app) {
					return window.yagala.resumeApp(app.id === undefined ? app : app.id);
				};

				/**
				 * Stop an application
				 **/
				var stopApp = function(app) {
					return window.yagala.stopApp(app.id === undefined ? app : app.id);
				};

				/**
				 * Raise current window
				 **/
				var raiseWindow = function(app) {
					return window.yagala.raiseWindow();
				};

				/**
				 * Get app status. This must be updated regulary via pull.
				 * The objects in this array are observable, so view components
				 * can react on status changes.
				 **/
				var status = ko.observableArray();
				status.byId = function(appid) {
					appid = appid.id !== undefined ? appid.id : appid;
					var s = status();
					for (var i = 0; i < s.length; i+=1) {
						if (s[i].id === appid) {
							return s[i];
						}
					}
					return undefined;
				};

				return {
					apps: apps,
					runApp: runApp,
					suspendApp: suspendApp,
					resumeApp: resumeApp,
					stopApp: stopApp,
					raiseWindow: raiseWindow,
					status: ko.pureComputed(status)
				};
			};
		}
	);
})();


