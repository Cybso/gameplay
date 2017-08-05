(function() {
	"use strict";
	
	function factory(externalRequest) {
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
								return hidden.ready() ? hidden().indexOf(data.id) < 0 : false;
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
								return hidden.ready() ? hidden().indexOf(id) < 0 : false;
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
					var ignoreSubscribe = false;
					var observable = ko.observableArray([]);
					var ready = ko.observable(false);
					observable.ready = ko.pureComputed(ready);
					observable.subscribe(function(value) {
						if (!ignoreSubscribe) {
							externalRequest('setItem', key, JSON.stringify(value));
						}
					});

					// Load data (prepared for async)
					externalRequest('getItem', key).done(function(value) {
						if (value) {
							ignoreSubscribe = true;
							try {
								observable(JSON.parse(value));
							} catch (err) {
								observable(undefined);
								console.log("Failed to parse " + key + ": " + value);
							}
							ignoreSubscribe = false;
						}
						ready(true);
					});

					return observable;
				}

				return function(viewModel) {
					var hiddenCategories = new PersistantObservableArray('hidden-categories');
					var hiddenApps = new PersistantObservableArray('hidden-apps');
					var withHidden = ko.observable(false);

					var rawApps = ko.observableArray();
					rawApps.ready = ko.observable(false);
					externalRequest('getApps').done(function(list) {
						var result = [];
						for (var i = 0; i < list.length; i+=1) {
							result.push(new AppItem(list[i], hiddenApps));
						}
						rawApps(result);
						rawApps.ready(true);
					});

					/**
					* List categories by id and (translated) label
					**/
					var categories = ko.pureComputed(function() {
						if (!rawApps.ready()) {
							return [];
						}

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
					categories.ready = ko.pureComputed(rawApps.ready);

					// List filtered apps
					var apps = ko.computed(function() {
						var hiddenCategoryList = hiddenCategories();
						if (!hiddenCategories.ready() || !rawApps.ready()) {
							return [];
						}

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
					apps.ready = ko.pureComputed(rawApps.ready);
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

					/**
					* Returns a configuration option value. The value is cached in 'options'.
					**/
					var options = {};
					var getOption = function(section, option) {
						var key = section + '/' + option;
						if (options[key] === undefined) {
							var result = ko.observable();
							var ready = ko.observable();

							externalRequest('getOption', section, option).done(function(value) {
								if (value === undefined || value === null) {
									value = '';
								}
								result(value);
							});

							options[key ] = {
								ready: ko.pureComputed(ready),
								asString: ko.pureComputed(function() { return result(); }),
								asBoolean: ko.pureComputed(function() {
									var value = (result() || '').toLowerCase();
									return value === 'true' || value === 'on' || value === 'yes' || value === '1';
								}),
								asInt: ko.pureComputed(function() { return parseInt(result()); }),
								asFloat: ko.pureComputed(function() { return parseFloat(result()); })
							};
						}
						return options[key];
					};

					/**
					* Launch an application
					**/
					var runApp = function(app) {
						return externalRequest('runApp', (app.id === undefined ? app : app.id));
					};

					/**
					* Suspend an application
					**/
					var suspendApp = function(app) {
						return externalRequest('suspendApp', (app.id === undefined ? app : app.id));
					};

					/**
					* Resume an application
					**/
					var resumeApp = function(app) {
						return externalRequest('resumeApp', (app.id === undefined ? app : app.id));
					};

					/**
					* Stop an application
					**/
					var stopApp = function(app) {
						return externalRequest('stopApp', (app.id === undefined ? app : app.id));
					};

					/**
					* Raise current window
					**/
					var raiseWindow = function(app) {
						return externalRequest('raiseWindow');
					};

					var setItem = function(key, value) {
						return externalRequest('setItem', key, value);
					};

					var getItem = function(key) {
						return externalRequest('getItem', key);
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
						externalRequest('getAllAppStatus').done(function(result) {
							kom.fromJS(result, { '$key': 'id', '$merge': true }, status);
							if (document.hidden) {
								window.setTimeout(pullAppStatus, 1000);
							} else {
								window.setTimeout(pullAppStatus, 250);
							}
						});
					};
					pullAppStatus();

					/**
					* Suspends all running apps
					*/
					var suspendAllApps = function() {
						externalRequest('getAllAppStatus').done(function(result) {
							for (var i = 0; i < result.length; i+=1) {
								if (result[i].active) {
									suspendApp(result[i].id);
								}
							}
						});
					};
					
					/**
					* Kills all running apps
					**/
					var stopAllApps = function() {
						externalRequest('getAllAppStatus').done(function(result) {
							for (var i = 0; i < result.length; i+=1) {
								if (result[i].active) {
									stopApp(result[i].id);
								}
							}
						});
					};

					/**
					* Close the application
					**/
					var exitSelf = function() {
						externalRequest('exit');
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
								externalRequest('triggerBusy');
							}
						}
					};

					// Disable idle events when the window is not active
					document.addEventListener('visibilitychange', function() {
						if (document.hidden) {
							externalRequest('suspendIdle');
						} else {
							externalRequest('triggerBusy');
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
						getItem: getItem,
						setItem: setItem,
						triggerBusy: triggerBusy
					};
				};
			}
		);
	}

	if (window.gameplayIsAsync === true) {
		/**
		 * Does an asynchronous request to Gameplay backends API.
		 * Returns a promise object with the method 'done' that
		 * can be used to register the value listener.
		 *
		 * First parameter must be the method name, but you can provide
		 * additional arguments.
		 **/
		factory(function externalRequest(method) {
			var args = [];
			for (var i = 1; i < arguments.length; i+=1) {
				args.push(arguments[i]);
			}
			var result;
			var listeners = [];
			args.push(function(value) {
				result = value;
				for (var i = 0; i < listeners.length; i+=1) {
					listeners[i].call(listeners[i], result);
				}
				listeners = undefined;
			});
			window.gameplay[method].apply(window.gameplay, args);

			return {
				done: function(listener) {
					if (listeners === undefined) {
						listener.call(listener, result);
					} else {
						listeners.push(listener);
					}
					return this;
				}
			};
		});
	} else {
		/**
		 * Synchronous calls.
		 **/
		factory(function(method) {
			var result;
			var args = [];
			for (var i = 1; i < arguments.length; i+=1) {
				args.push(arguments[i]);
			}
			result = window.gameplay[method].apply(window.gameplay, args);
			return {
				done: function(listener) {
					listener(result);
					return this;
				}
			};
		});
	}
})();


