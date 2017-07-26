(function() {
	"use strict";
	define(function() {
		return function(viewModel) {
			var backgroundGamepadMonitor = 0;

			var monitorButtonState = function(gamepad, a, b, triggerSuspend, triggerTerminate, interval) {
				var loop = function() {
					if (gamepad.buttons[a] && gamepad.buttons[b]) {
						triggerSuspend -= 1;
						triggerTerminate -= 1;
						console.log("monitor buttons " + triggerSuspend + " " + triggerTerminate);
						if (triggerSuspend === 0) {
							// Suspend, but wait for terminate
							console.log("suspend");
							viewModel.gameplay.suspendAllApps();
							window.setTimeout(loop, interval);
						} else if (triggerTerminate > 0) {
							// Wait longer...
							window.setTimeout(loop, interval);
						} else {
							console.log("terminate");
							viewModel.gameplay.stopAllApps();
							backgroundGamepadMonitor -= 1;
						}
					} else {
						backgroundGamepadMonitor -= 1;
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
				console.log("backgroundGamepadInterval " + gamepads.length + " " + backgroundGamepadMonitor);
				for (var i = 0; i < gamepads.length && backgroundGamepadMonitor === 0; i+=1) {
					var gamepad = gamepads[i];
					if (gamepad.buttons[6] + gamepad.buttons[7] + gamepad.buttons[8] + gamepad.buttons[9] !== 2) {
						continue;
					}
					// Two buttons are pressed, monitor them for 3/10 seconds.
					// First, identify the buttons that are pressed.
					var j, a, b;
					for (j = 6; j <= 9; j+=1) {
						if (gamepad.buttons[j]) {
							if (a === undefined) {
								a = j;
							} else {
								b = j;
							}
						}
					}

					// Monitor these buttons for 30 / 100 intervals of 100ms
					monitorButtonState(gamepad, a, b, 30, 100, 100);
				}
			};

			var backgroundGamepadInterval;
			return {
				'enable': function() {
					if (backgroundGamepadInterval === undefined) {
						console.log("Starting gamepad loop");
						backgroundGamepadInterval = window.setInterval(backgroundGamepadLoop, 1000);
					}
				},

				'disable': function() {
					if (backgroundGamepadInterval !== undefined) {
						console.log("Stopping gamepad loop");
						window.clearInterval(backgroundGamepadInterval);
						backgroundGamepadInterval = undefined;
					}
				}
			};
		};
	});
})();
