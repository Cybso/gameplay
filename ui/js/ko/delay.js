/**
 * Description:
 *   This file extends knockout's observable, observableArray and computed with
 *   a new function delay(timeout, items) / delay({ timeout: 10, items: 1}) 
 * 
 *   If applied to an object value, it returns
 *   an observable 'null' object that will be filled with the value after timeout.
 * 
 *   If applied to an array value, it returns an observable array that
 *   will be filled be filled with 'items' entries from the source after
 *   each 'timeout'. E.g. if you call delay(2, 10) to an array with
 *   100 entries it will return an empty array at first, fill it with
 *   the  first 10 items after 2ms, and with the next 10 items 2ms later.
 * 
 *   Additional arguments are limit, which limits the result to an upper threshold,
 *   and filter, which applies a filter callback function in each iteration.
 * 
 *   The returned function has the properties total (with the total number
 *   of items), limited(), which is true if the given limit has been reached,
 *   ready(), which is true if no more items will be appended, and
 *   options, which contains the original options and thus provides
 *   access to the limit value.
 * 
 * License: LGPL 2.1
 * 
 * Author: Roland Tapken <rt@tasmiro.de>
 */
(function() {
	"use strict";
	define(['knockout'], function(ko) {
		ko.extenders.delay = function(target, options) {
			if (typeof options !== 'object') {
				options = {
					timeout: options
				};
			}

			// Values initialized on first iteration
			var timeout = null,
				items = null,
				limit = null,
				offset = null,
				currentOffset = null;

			// This value is toggled to trigger a computed mutation and
			// verify whether this is an intended call or triggered
			// by the change of value or filter.
			var mutationValue = ko.observable(0);
			var expectedMutationValue = 1;
			var mutationInstance = 0;

			var result = [];

			var delayed = ko.computed({
				deferEvaluation: true,
				pure: true,
				read: function() {
					var value = target();
					offset = ko.unwrap(options.offset) || 0;
					limit = ko.unwrap(options.limit) || 0;
					items = Math.max(1, ko.unwrap(options.items) || 0);
					timeout = Math.max(10, ko.unwrap(options.timeout) || 0);
					if (mutationValue() !== expectedMutationValue) {
						// Either value or filter has changed. Start over.
						if (Array.isArray(value)) {
							// Find the offset where the arrays differ.
							var i = 0;
							var max = Math.min(value.length, result.length);
							for (i = 0; i < max; i+=1) {
								if (result[i] !== value[i]) {
									break;
								}
							}

							if (i < result.length) {
								result.splice(i);
							}
							currentOffset = result.length;
							delayed.total = value.length;
						} else {
							result = value;
							currentOffset = 0;
							delayed.total = 1;
						}

						delayed.limited(offset > 0);
					}

					// Increment mutation value for next setTimeout call
					expectedMutationValue += 1;

					var newReadyValue = true;
					if (Array.isArray(value)) {
						if (value.length > currentOffset) {
							var slice = value.slice(currentOffset, currentOffset + items);
							currentOffset = Math.min(value.length, currentOffset + items);

							// Apply filter, if available. Note that this might
							// lead to new subscriptions.
							if (options.filter !== undefined) {
								slice = slice.filter(options.filter);
							}

							if (limit > 0 && result.length + slice.length >= limit) {
								// Early exit.
								slice = slice.slice(0, limit - result.length);
								if (value.length > currentOffset) {
									currentOffset = value.length;
									delayed.limited(true);
								}
							}

							// Increment currentOffset for next loop and merge arrays.
							Array.prototype.push.apply(result, slice);

							if (value.length > currentOffset) {
								newReadyValue = false;
								(function(x) {
									window.setTimeout(function() {
										// Only recall if there hasn't been a start over.
										if (expectedMutationValue === x) {
											mutationValue(expectedMutationValue);
										}
									}, timeout);
								})(expectedMutationValue);
							}
						}
					} else if (currentOffset === 0) {
						// Delay regular object
						currentOffset = 1;
						(function(x) {
							window.setTimeout(function() {
								// Only recall if there hasn't been a start over.
								if (expectedMutationValue === x) {
									mutationValue(expectedMutationValue);
								}
							}, timeout);
						})(expectedMutationValue);
					}

					delayed.ready(newReadyValue);
					return result;
				}
			});
			delayed.total = 0;
			// Set true of no more entries will be appended
			delayed.ready = ko.observable(false);
			// Set true if the limit filter has been reached
			delayed.limited = ko.observable(true);
			delayed.options = options;
			return delayed;
		};

		return ko;
	});
})();
//#  vim: set fenc=utf-8 ts=4 sw=4 noet :
