/**
 * Loads knockout.mapper (https://github.com/lucaslorentz/knockout.mapper)
 * and binds it to 'ko.mapper' property and to the global variable 'window.kom'.
 **/
(function() {
	"use strict";
	define(['knockout', 'lib/knockout.mapper'], function(ko, kom) {
		ko.mapper = kom;
		window.kom = kom;
		return kom;
	});
})();
