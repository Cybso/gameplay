(function() {
	"use strict";

	define(['knockout', 'ko/translate', 'RemoteData', 'ko/mapper'], 
		function(ko, t, RemoteData, kom) {

			function AppItem(data, hidden) {
				return {
					id: data.id,
					label: data.label,
					icon: data.icon,
					icon_selected: data.icon_selected,
					categories: data.categories || [],
					visible: ko.computed({
						read: function() {
							return hidden().indexOf(data.id) < 0;
						},
						write: function(value) {
							if (value) {
								hidden.remove(data.id);
							} else {
								if (hidden().indexOf(data.id) < 0) {
									hidden.push(data.id);
								}
							}
						}
					})
				};
			}

			/**
			 * Returns an object that represents a category
			 **/
			function Category(id, hidden) {
				return {
					id: id,
					label: t('categories.' + id, id)(),
					visible: ko.computed({
						read: function() {
							return hidden().indexOf(id) < 0;
						},
						write: function(value) {
							if (value) {
								hidden.remove(id);
							} else {
								if (hidden().indexOf(id) < 0) {
									hidden.push(id);
								}
							}
						}
					})
				};
			}

			/**
			 * Represents an observable object that is stored in GamePlay's UI storage.
			 **/
			function PersistantObservableArray(key) {
				var value = window.gameplay.getItem(key);
				if (value) {
					try {
						value = JSON.parse(value);
					} catch (err) {
						value = undefined;
						console.log("Failed to parse " + key + ": " + value);
					}
				}
				var observable = ko.observableArray(value ? value : []);
				observable.subscribe(function(value) {
					window.gameplay.setItem(key, JSON.stringify(value));
				});
				return observable;
			}

			return function(viewModel) {
				var hiddenCategories = new PersistantObservableArray('hidden-categories');
				var hiddenApps = new PersistantObservableArray('hidden-apps');
				var withHidden = ko.observable(false);

				var rawApps = ko.observableArray((function() {
					var result = [];
					var list = window.gameplay.getApps();
					for (var i = 0; i < list.length; i+=1) {
						result.push(new AppItem(list[i], hiddenApps));
					}
					return result;
				})());

				/**
				 * List categories by id and (translated) label
				 **/
				var categories = ko.pureComputed(function() {
					var i, j, result = [];
					var list = rawApps();
					for (i = 0; i < list.length; i+=1) {
						var app = list[i];
						if (app.categories) {
							for (j = 0; j < app.categories.length; j+=1) {
								var category = app.categories[j];
								if (result.indexOf(category) < 0) {
									result.push(category);
								}
							}
						}
					}

					// Load category translation
					for (i=0; i < result.length; i+=1) {
						result[i] = new Category(result[i], hiddenCategories);
					}

					// Sort by translation
					result.sort(function(a, b) {
						if (a.label.toLowerCase() < b.label.toLowerCase()) {
							return -1;
						} else 	if (a.label.toLowerCase() > b.label.toLowerCase()) {
							return 1;
						} else if (a.id < b.id) {
							return -1;
						} else if (a.id > b.id) {
							return 1;
						}
						return 0;
					});

					return result;
				});

				// List filtered apps
				var apps = ko.computed(function() {
					var hiddenCategoryList = hiddenCategories();
					return rawApps().filter(function(app) {
						if (withHidden() || app.visible()) {
							if (app.categories !== undefined && app.categories.length > 0) {
								for (var i = 0; i < app.categories.length; i+=1) {
									if (hiddenCategoryList.indexOf(app.categories[i]) < 0) {
										return true;
									}
								}
							} else {
								return true;
							}
						}
					});
				});
				apps.raw = ko.pureComputed(rawApps);

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
				 * Return all apps by category id
				 **/
				apps.byCategory = function(id) {
					if (id.id !== undefined) {
						id = id.id;
					}
					var result = [];
					var list = apps();
					for (var i = 0; i < list.length; i+=1) {
						if (list[i].categories && list[i].categories.indexOf(id) >= 0) {
							result.push(list[i]);
						}
					}
					return result;
				};

				var getOption = function(section, option) {
					var value = window.gameplay.getOption(section, option);
					if (value === undefined || value === null) {
						value = '';
					}
					return {
						asString: function() { return value; },
						asBoolean: function() {
							var value1 = value.toLowerCase();
							return value1 === 'true' || value1 === 'on' || value1 === 'yes' || value1 === '1';
						},
						asInt: function() { return parseInt(value); },
						asFloat: function() { return parseFloat(value); }
					};
				};

				/**
				 * Launch an application
				 **/
				var runApp = function(app) {
					return window.gameplay.runApp(app.id === undefined ? app : app.id);
				};

				/**
				 * Suspend an application
				 **/
				var suspendApp = function(app) {
					return window.gameplay.suspendApp(app.id === undefined ? app : app.id);
				};

				/**
				 * Resume an application
				 **/
				var resumeApp = function(app) {
					return window.gameplay.resumeApp(app.id === undefined ? app : app.id);
				};

				/**
				 * Stop an application
				 **/
				var stopApp = function(app) {
					return window.gameplay.stopApp(app.id === undefined ? app : app.id);
				};

				/**
				 * Raise current window
				 **/
				var raiseWindow = function(app) {
					return window.gameplay.raiseWindow();
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
					if (s !== undefined) {
						for (var i = 0; i < s.length; i+=1) {
							if (ko.unwrap(s[i].id) === appid) {
								return s[i];
							}
						}
					}
					return {};
				};

				/**
				 * Updates the process status.
				 */
				var pullAppStatus = function() {
					var result = window.gameplay.getAllAppStatus();
					kom.fromJS(result, { '$key': 'id', '$merge': true }, status);
					if (document.hidden) {
						window.setTimeout(pullAppStatus, 1000);
					} else {
						window.setTimeout(pullAppStatus, 250);
					}
				};
				pullAppStatus();

				/**
				 * Suspends all running apps
				 */
				var suspendAllApps = function() {
					var result = window.gameplay.getAllAppStatus();
					for (var i = 0; i < result.length; i+=1) {
						if (result[i].active) {
							window.gameplay.suspendApp(result[i].id);
						}
					}
				};
				
				/**
				 * Kills all running apps
				 **/
				var stopAllApps = function() {
					var result = window.gameplay.getAllAppStatus();
					for (var i = 0; i < result.length; i+=1) {
						if (result[i].active) {
							window.gameplay.stopApp(result[i].id);
						}
					}
				};

				/**
				 * Close the application
				 **/
				var exitSelf = function() {
					window.gameplay.exit();
				};

				/**
				 * Triggers a busy event, but at a maximum of once a second.
				 **/
				var lastTrigger = 0;
				var triggerBusy = function() {
					if (!document.hidden) {
						var timestamp = window.performance &&
								window.performance.now &&
								window.performance.timing &&
								window.performance.timing.navigationStart ? window.performance.now() : Date.now();
						if (lastTrigger + 1000 < timestamp) {
							lastTrigger = timestamp;
							window.gameplay.triggerBusy();
						}
					}
				};

				// Disable idle events when the window is not active
				document.addEventListener('visibilitychange', function() {
					if (document.hidden) {
						window.gameplay.suspendIdle();
					} else {
						window.gameplay.triggerBusy();
					}
				});

				return {
					apps: apps,
					categories: categories,
					hiddenApps: ko.pureComputed(hiddenApps),
					withHidden: withHidden,
					runApp: runApp,
					suspendApp: suspendApp,
					resumeApp: resumeApp,
					stopApp: stopApp,
					suspendAllApps: suspendAllApps,
					stopAllApps: stopAllApps,
					raiseWindow: raiseWindow,
					status: ko.pureComputed(status),
					statusById: status.byId,
					exitSelf: exitSelf,
					getOption: getOption,
					triggerBusy: triggerBusy
				};
			};
		}
	);
})();


