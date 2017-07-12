/**
 * Description:
 *	Define the Knockout binding 'translate' that translates the contents of
 *	the node it is applied to. If it is set to true it tries to lookup
 *	the exact contents of the node as identifier:
 *
 *		<!-- Looks for 'Hello, World' as identifier -->
 *		<span data-bind="translate: true">Hello, World</span>
 *
 *	If it is a string or a computed it looks up that string as identifier:
 *
 *		<!-- Looks for hello_world as identifier -->
 *		<span data-bind="translate: 'hello_world'">Fallback content</span>
 *
 *	Note that the translation may contain Knockout bindings. So if you require
 *	a special context within the translations, you can append them using the
 *	following syntax:
 *
 *		<!-- Looks for 'Hello, World' as identifier -->
 *		<span data-bind="translate: { data: contextData }">Hello, World</span>
 *
 *		<!-- Looks for hello_world as identifier -->
 *		<span data-bind="translate: { key: 'hello_world', data: contextData }">Fallback content</span>
 *
 *	You may also specify an alternative translation map or function with an additional parameter
 *	called 'map'. If undefined, ko.translate.map will be used instead, which
 *	is an observable object and should be filled with the translation map after initialization.
 *	It also provides an merge() function that adds a new translation table instead of
 *	replacing the existing one.
 *
 *	The translation table may either be a function. In this case, the key is given to it.
 *	Or it may be a map, in which case the key's value is looked up as an entry within the map.
 *	If the key is not found within the map, it is splitted at the first dot into a local part
 *	and a new key. Now the lookup is done again with the local part, and on success the processed
 *	repeated with the local part's result as new translation table and the new key.
 *
 *	Additionally, ko.translate() (or the global alias _()) can be used to translate a
 *	string programmatically.
 *
 *	Returns the translate function.
 **/
/* jshint esversion: 6 */
(function() {
	"use strict";
	define(['knockout'], function(ko) {

		var translateCache = {};

		// Helper method to create one-dimensional objects from multi-dimensional inputs
		var flatten = function(obj, dest = {}, prefix = '') {
			for (var k in obj) {
				if (obj.hasOwnProperty(k)) {
					var v = obj[k];
					if (typeof v === 'object') {
						flatten(v, dest, prefix + k + '.');
					} else {
						dest[prefix + k] = v;
					}
				}
			}
			return dest;
		};

		// Translate method for programatical use
		ko.translate = function(key, fallback = undefined) {
			if (fallback === undefined) {
				fallback = key;
			}

			if (translateCache[key + ':' + fallback] !== undefined) {
				return translateCache[key + ':' + fallback];
			}

			return (translateCache[key + ':' + fallback] = ko.computed(function() {
				var result = ko.translate.lookup(ko.utils.unwrapObservable(ko.translate.map), key);
				if (!result) {
					result = fallback;
				}
				return result;
			}));
		};
		
		// Translation data. This can either be a function,
		// or an object. If it is an object, it will be flatten
		// into a one-level depths object. This means,
		// { a: { b: 'foo' } } will be the same as { 'a.b': 'foo' }.
		var realMap = ko.observable({});
		ko.translate.map = ko.computed({
			deferEvaluation: true,
			read: realMap,
			write: function(value) {
				if (typeof value !== 'object') {
					realMap(value);
				} else {
					realMap(flatten(value));
				}
			}
		});


		// Merge new values with existing ones.
		// Only works if both current map and given
		// value are plain objects.
		ko.translate.map.merge = function(value) {
			flatten(value, realMap());
			realMap.valueHasMutated();
		};

		// Translation lookup function
		ko.translate.lookup = function(map, key) {
			// If this is a function, call it
			if (!!(map && map.constructor && map.call && map.apply)) {
				return map(key);
			}

			return map[key];
		};

		// Define a global alias '_' for ko.translate()
		if (window._ === undefined) {
			window._ = ko.translate;
		}

		ko.bindingHandlers.translate = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				// Make original contents available for later use (and as fallback key)
				element.originalHTML = element.innerHTML;
				ko.computed({
					disposeWhenNodeIsRemoved: element,
					read: function() {
						var value = ko.utils.unwrapObservable(valueAccessor());
						if (!value) {
							// Restore original state
							element.innerHTML = element.originalHTML;
							ko.applyBindingsToDescendants(bindingContext, element);
							return;
						}

						// Find value's key
						if (typeof value !== 'object') {
							value = { key: value };
						}

						var key = ko.utils.unwrapObservable(value.key);
						if (!(typeof key === 'string' || key instanceof String)) {
							// Fallback to original contents as key
							key = element.originalHTML;
						}

						var localBindingContext = bindingContext;
						if (value.data) {
							// Use with a child context
							localBindingContext = bindingContext.createChildContext(
								{},
								null,
								function(context) {
									// Start with an empty context, bind local 
									ko.utils.extend(context, ko.utils.unwrapObservable(value.data));
									ko.utils.extend(context, bindingContext.createChildContext);
								}
							);
						}

						if (!value.map) {
							value.map = ko.translate.map;
						}

						var replacement = ko.translate.lookup(ko.utils.unwrapObservable(value.map), key);
						if (!replacement) {
							// Find fallback value if no translation has been found
							replacement = ko.unwrap(value.default);
							if (!replacement) {
								replacement = element.originalHTML;
								if (!replacement) {
									replacement = key;
								}
							}
						}

						// Replace '{{ VAR }}' with '<span data-bind="text: VAR"></span>'
						replacement = replacement.replace(
								/\{\{\s*([^\}\s]+)\s*\}\}/g,
								'<span data-bind="text: $1"></span>');

						element.innerHTML = replacement;
						ko.applyBindingsToDescendants(localBindingContext, element);
					},

				});

				return { controlsDescendantBindings: true };
			}
		};

		ko.bindingHandlers.t = ko.bindingHandlers.translate;
		return ko.translate;
	});
})();
/* vim: set fenc=utf-8 noet sw=4 sts=4 ts=4: */
