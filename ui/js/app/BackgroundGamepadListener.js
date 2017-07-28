(function() {
	"use strict";
	define(function() {
		return function(viewModel) {
			var backgroundGamepadMonitor = 0;

			var monitorButtonState = function(gamepad, btnA, btnB, triggerSuspend, triggerTerminate, interval) {
				var loop = function() {
					if (btnA.getValue(gamepad) > 0.5 && btnB.getValue(gamepad) > 0.5) {
						triggerSuspend -= 1;
						triggerTerminate -= 1;
						if (triggerSuspend === 0) {
							// Suspend, but wait for terminate
							viewModel.gameplay.suspendAllApps();
							window.setTimeout(loop, interval);
						} else if (triggerTerminate > 0) {
							// Wait longer...
							window.setTimeout(loop, interval);
						} else {
							viewModel.gameplay.stopAllApps();
							backgroundGamepadMonitor -= 1;
						}
					} else {
						backgroundGamepadMonitor -= 1;
					}
					if (backgroundGamepadMonitor < 0) {
						backgroundGamepadMonitor = 0;
					}
				};
				loop();
			};

			// Add a special listener while the document is hidden.
			// This listens for BUTTONS_6 to 9. If two of them are pressed
			// for more than 3 seconds all active processes are suspended.
			// If they are pressed more than 10 seconds they are terminated.
			var backgroundGamepadLoop = function() {
				var gamepads = viewModel.gamepad();
				for (var i = 0; i < gamepads.length && backgroundGamepadMonitor === 0; i+=1) {
					var gamepad = gamepads[i];
					var btnA = viewModel.gamepad.getButton(gamepad, 'START');
					var btnB = viewModel.gamepad.getButton(gamepad, 'SELECT');
					if (btnA && btnB && btnA.getValue(gamepad) > 0.5 && btnB.getValue(gamepad) > 0.5) {
						// Monitor these buttons for 30 / 100 intervals of 100ms
						monitorButtonState(gamepad, btnA, btnB, 30, 100, 100);
					}
				}
			};

			var backgroundGamepadInterval;
			return {
				'enable': function() {
					if (backgroundGamepadInterval === undefined) {
						backgroundGamepadMonitor = 0;
						backgroundGamepadInterval = window.setInterval(backgroundGamepadLoop, 1000);
					}
				},

				'disable': function() {
					if (backgroundGamepadInterval !== undefined) {
						window.clearInterval(backgroundGamepadInterval);
						backgroundGamepadInterval = undefined;
					}
				}
			};
		};
	});
})();
