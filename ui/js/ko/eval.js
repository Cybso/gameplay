/**
 * Description:
 *	Pseudo-Binding 'eval' that evaluates the given string or function as javascript code. Use with care.
 *
 * License: LGPL 2.1
 *
 *  Author: Roland Tapken <rt@tasmiro.de>
 */
(function() {
	"use strict";
	define(['knockout'], function(ko) {
		function evalHelper(strToEval) {
			eval(strToEval);
		}

		ko.bindingHandlers.eval = {
			update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				var value = ko.utils.unwrapObservable(valueAccessor());
				if (typeof value === 'function') {
					value.call(element);
				} else if (typeof value === 'string') {
					evalHelper.call(element, value);
				}
			}
		};

		// Since this does not neccessarly depend on a specific object,
		// allow usage of this binding on virtual elements.
		ko.virtualElements.allowedBindings.eval = true;

		return ko;
	});
})();
// vim: set fenc=utf-8 ts=4 sw=4 noet :
