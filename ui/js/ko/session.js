/**
 * Stores a field value in sessionStorage, if available.
 * Usage:
 *
 *     field = ko.observable(0).extend({ session: 'local-field' })
 *     field = ko.observable(0).extend({ session: {
 *         name: 'local-field',
 *         storage: ko.extenders.session.sessionStorage,
 *         serialize: ko.mapping.toJSON,
 *         deserialize: ko.mapping.fromJSON,
 *         version: 0
 *         mappingOptions: {}
 *     }})
 *
 * An object will only be deserialized when the value of 'version'
 * matches the version of the serialized value.
 *
 * Important: Ensure that your target object CAN be mapped. Predefined
 * functions or computed on the root object will not be replaced on
 * deserializing, but if your targets value has functions or computed's
 * on the second level or lower (child object or array value) you will
 * want to define 'mappingOptions' with adequate values. See: 
 * http://knockoutjs.com/documentation/plugins-mapping.html
 *
 * To prevent fatal exceptions in private browsing mode and when used
 * within iframes you should not access window.localStorage and window.sessionStorage
 * directly but ko.extenders.session.localStorage and ko.extenders.session.sessionStorage
 * instead. These will replaced by dummy implementations when the
 * normal storage object is not available.
 *
 * Author: Roland Tapken <roland.tapken@rasch.de>
 **/
(function() {
	"use strict";
	define(['knockout', 'ko/mapper'], function(ko, kom) {

		var VERSION_SUFFIX = '__VERSION__';

		ko.extenders.session = function(target, options) {
			if (typeof options === 'string' || options instanceof String) {
				options = { name: options };
			}
			if (!options.name) {
				throw 'A session extender must have a name';
			}
			if (!options.serialize) {
				options.serialize = kom.toJSON;
			}
			if (!options.deserialize) {
				options.deserialize = kom.fromJSON;
			}
			if (!options.mappingOptions) {
				options.mappingOptions = {};
			}
			if (!options.storage) {
				options.storage = ko.extenders.session.sessionStorage;
			}
			if (options.mapping === undefined) {
				options.mapping = true;
			}
			if (options.version === undefined) {
				options.version = 0;
			}

			window.setTimeout(function() {
				// Don't do anything here that might observe target().
				// This would lead to bad side effects.

				var value = target();
				var initialValue = options.serialize(value);
				var serializedValue = options.storage.getItem(options.name);
				if (serializedValue !== undefined && serializedValue !== null && serializedValue !== 'null') {
					// Check version
					var serializedVersion = 0|parseInt(options.storage.getItem(options.name + VERSION_SUFFIX));
					if (serializedVersion === options.version) {
						if (options.mapping) {
							var mappingOptions = $.extend({ ignore: [], copy: [] }, options.mappingOptions);
							for (var k in value) {
								if (value.hasOwnProperty(k)) {
									var v = value[k];
									if ($.isFunction(v)) {
										// Don't deserialize plain functions or computed
										if (!ko.isObservable(v) || ko.isComputed(v)) {
											mappingOptions.ignore.push(k);
										}
									} else {
										// Just copy fields that were not observable before
										mappingOptions.copy.push(k);
									}
								}
							}

							try {
								options.deserialize(serializedValue, mappingOptions, target);
							} catch (e) {
								console.log("Error while deserializing value for " + options.name, e, serializedValue);
							}
						} else {
							try {
								target(JSON.parse(serializedValue));
							} catch (e) {
								console.log(e);
							}
						}
					}
				}

				ko.computed(function() {
					var value = options.serialize(target());
					if (value !== initialValue) {
						options.storage.setItem(options.name, value);
						options.storage.setItem(options.name + VERSION_SUFFIX, options.version);
					} else {
						options.storage.setItem(options.name, null);
						options.storage.setItem(options.name + VERSION_SUFFIX, null);
					}
				});

				// Remove object from session.
				target.clearSession = function() {
					options.storage.setItem(options.name, null);
				};
			}, 10);

			return target;
		};
		
		// Override localStorage and sessionStorage with dummies if not available.
		// Storage is not available in Private Browsing mode and in iFrame mode.
		var DummyStorage = function() {
			var values = {};
			return {
				setItem: function(name, value) {
					values[name] = value;
				},

				getItem: function(name) {
					return values[name];
				},

				removeItem: function(name) {
					delete values[name];
				},

				clear: function() {
					values = {};
				}
			};
		};

		try {
			if (window.localStorage) {
				window.localStorage.setItem('test', '1');
				window.localStorage.removeItem('test');
				ko.extenders.session.localStorage = window.localStorage;
			} else {
				console.log("LocalStorage not available");
				ko.extenders.session.localStorage = new DummyStorage();
			}
		} catch(error) {
			console.log("Disabling LocalStorage", error);
			ko.extenders.session.localStorage = new DummyStorage();
		}

		try {
			if (window.sessionStorage) {
				window.sessionStorage.setItem('test', '1');
				window.sessionStorage.removeItem('test');
				ko.extenders.session.sessionStorage = window.sessionStorage;
			} else {
				console.log("sessionStorage not available");
				ko.extenders.session.sessionStorage = new DummyStorage();
			}
		} catch(error) {
			console.log("Disabling sessionStorage", error);
			ko.extenders.session.sessionStorage = new DummyStorage();
		}

		return ko.extenders.session;
	});
})();
//  vim: set fenc=utf-8 ts=4 sw=4 noet :
