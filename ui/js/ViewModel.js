/**
 * ViewModel for Yagala
 *
 *	License: GPL 2.1
 *
 *	Author: Roland Tapken <rt@tasmiro.de>
 */
/* jshint esversion: 6 */

(function() {
	"use strict";
	define(['knockout', 'ko/mapper', 'ko/translate', 'RemoteData'], function(ko, kom, t, RemoteData) {
		var exports = {};

		// Current language
		exports.language = ko.observable('en');
		new RemoteData(ko.pureComputed(function() {
			console.log('locale/' + exports.language() + '.json');
			return 'locale/' + exports.language() + '.json';
		//})).done(t.map).load();
		}));

		// Load available availableLanguages
		exports.availableLanguages = new RemoteData('locale/languages.json');
		exports.availableLanguages.whenReady(function(availableLanguages) {
			// Read browser language.
			var defLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
			if (defLang.indexOf('-') > 0) {
				defLang = defLang.substring(0, defLang.indexOf('-'));
			}
			// When the browser's language is found in the availableLanguages file
			// switch to it.
			for (var i in availableLanguages) {
				if (availableLanguages[i].id === defLang) {
					exports.language(defLang);
					break;
				}
			}
		});

		exports.currentTime = ko.observable();
		exports.currentTimeStr = ko.pureComputed(function() {
			var time = exports.currentTime();
			return time ? time.toString() : 'n/a';
		});

		window.setInterval(function() {
			exports.currentTime(new Date());
		}, 1000);


		return exports;
	});
})();
