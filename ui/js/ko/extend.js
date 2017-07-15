/**
 *	Description:
 *		Extends the current namespace. This is useful for temporary bindings,
 *		for example to assign a label element to a checkbox within a loop or
 *		a template element:
 *
 *		<!-- ko extend: { uuid: uuid() } -->
 *		<input type="checkbox" data-bind="checked: selected, attr: { id: uuid }" />
 *		<label data-bind="text: label, attr: { for: uuid }"></label>
 *		<!-- /ko --> 
 */

(function() {
	"use strict";
	define(['knockout'], function(ko) {
		ko.bindingHandlers.extend = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				// Make a modified binding context, with a extra properties, and apply it to descendant elements
				var innerBindingContext = bindingContext.extend(valueAccessor);

				ko.applyBindingsToDescendants(innerBindingContext, element);
				return { controlsDescendantBindings: true };
			}
		};

		ko.virtualElements.allowedBindings.extend = true;
		return ko.bindingHandlers.extend;
	});
})();
/* vim: set fenc=utf-8 ts=4 sw=4 noet : */
