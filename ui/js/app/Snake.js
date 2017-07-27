/**
 * Snake Implementation (easter egg / gamepad test).
 * TODO
 *  - Add multiplayer support
 *  - Clean up code
 **/
(function() {
	"use strict";
	define(['app/Gamepad'], function(Gamepad) {
		var RIGHT = 0;
		var LEFT = 1;
		var UP = 2;
		var DOWN = 3;
		var DIRECTION_NAMES = {
			"right": RIGHT,
			"left": LEFT,
			"up": UP,
			"down": DOWN
		};

		// Block (and border) size in PX
		var BLOCK_SIZE = 20;

		// http://paletton.com/#uid=74X0u0kllllaFw0g0qFqFg0w0aF
		var BACKGROUND_COLOR = "#272727";
		var BORDER_COLOR = "#90A437";
		var HEAD_COLOR = "#71266E";
		var BODY_COLOR = "#8D478A";
		var FAILED_COLOR = "#FF6666";
		var ITEM_COLOR = "#ffff7f";

		var Position = function(x, y) {
			var exports = {
				x: x,
				y: y
			};

			exports.move = function(direction) {
				var newX = exports.x;
				var newY = exports.y;
				switch (direction) {
					case UP: newY -= 1; break;
					case DOWN: newY += 1; break;
					case LEFT: newX -= 1; break;
					case RIGHT: newX += 1; break;
				}
				return new Position(newX, newY);
			};

			exports.draw = function(ctx) {
				var x = (BLOCK_SIZE * (exports.x + 1));
				var y = (BLOCK_SIZE * (exports.y + 1));
				ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
			};

			exports.collide = function(p) {
				if (p !== exports) {
					if (p.x === exports.x && p.y === exports.y) {
						return true;
					}
				}
				return false;
			};

			return exports;
		};

		var Snake = function(x, y) {
			var exports = {
				head: new Position(x || 0, y || 0),
				direction: RIGHT,
				nextDirection: undefined,
				lost: false,
				body: []
			};

			exports.collide = function(position) {
				if (exports.head.collide(position)) {
					return true;
				}
				for (var i = 0; i < exports.body.length; i+=1) {
					if (exports.body[i].collide(position)) {
						return true;
					}
				}
				return false;
			};

			return exports;
		};

		var Item = function(position, color) {
			var exports = {
				position: position,
				collide: position.collide,
				color: color,
				fetch: function(snake) {
					snake.body.push(position);
				},
				draw: function(ctx) {
					ctx.fillStyle = color;
					position.draw(ctx);
				}
			};

			return exports;
		};

		var Field = function(canvas) {
			var width = Math.round(canvas.width / BLOCK_SIZE) - 2;
			var height = Math.round(canvas.height / BLOCK_SIZE) - 2;
			var ctx = canvas.getContext('2d');

			var snakes = [new Snake(Math.floor(width/2), Math.floor(height/2))];
			var items = [];
			var clearPositions = [];
			var exports = {
				canvas: canvas,
				active: true
			};

			var collidesWithSnake = function(position) {
				var i, j;
				for (i = 0; i < snakes.length; i+=1) {
					if (snakes[i].collide(position)) {
						return true;
					}
				}
				return false;
			};

			var findItem = function(position) {
				for (var i = 0; i < items.length; i+=1) {
					if (items[i].collide(position)) {
						return i;
					}
				}
				return -1;
			};

			var placeRandomItem = function() {
				// Find a random item position that is not blocked by any snake or other item
				var position = new Position(Math.floor(Math.random() * width), Math.floor(Math.random() * height));
				while (
					// Not in corners
					(position.x === 0 && position.y === 0) ||
					(position.x === 0 && position.y === height - 1) ||
					(position.x === width - 1 && position.y === 0) ||
					(position.x === width - 1 && position.y === height - 1) ||
					// Not over an existing item
					findItem(position) >= 0 ||
					// Not anywhere on a snake
					collidesWithSnake(position)) {
					position.x = Math.floor(Math.random() * width);
					position.y = Math.floor(Math.random() * height);
				}
				items.push(new Item(position, ITEM_COLOR));
			};

			// Updates the canvas
			exports.draw = function() {
				var i, j, p, snake;
				ctx.beginPath();
				ctx.fillStyle = BACKGROUND_COLOR;
				for (i = 0; i < clearPositions.length; i+=1) {
					// Clear old positions
					clearPositions[i].draw(ctx);
				}
				ctx.stroke();
				clearPositions = [];

				// Draw bodies
				ctx.beginPath();
				ctx.fillStyle = BODY_COLOR;
				for (i = 0; i < snakes.length; i+= 1) {
					snake = snakes[i];
					for (j = 0; j < snake.body.length; j+=1) {
						snake.body[j].draw(ctx);
					}
				}
				ctx.stroke();

				// Draw Items
				ctx.beginPath();
				for (i = 0; i < items.length; i+= 1) {
					items[i].draw(ctx);
				}
				ctx.stroke();

				// Draw active heads
				ctx.beginPath();
				ctx.fillStyle = HEAD_COLOR;
				for (i = 0; i < snakes.length; i+= 1) {
					if (!snake.lost) {
						snake = snakes[i];
						snake.head.draw(ctx);
					}
				}
				// Draw failed heads
				ctx.fillStyle = FAILED_COLOR;
				for (i = 0; i < snakes.length; i+= 1) {
					if (snake.lost) {
						snake = snakes[i];
						snake.head.draw(ctx);

						ctx.font = "30px Arial";
						ctx.fillStyle = "white";
						ctx.textAlign = "center";
						ctx.fillText("Player " + (i+1) + " lost. Press (A) to restart game.", 
							canvas.width/2,
							canvas.height/2);
					}
				}
				ctx.stroke();
			};

			// Calculate the next frame. If any player looses
			// update state of Snake and Field.
			exports.nextFrame = function() {
				if (exports.active) {
					for (var i = 0; i < snakes.length; i+=1) {
						var snake = snakes[i];
						clearPositions.push(snake.head);
						if (snake.body.length) {
							clearPositions.push(snake.body.pop());
							snake.body.unshift(snake.head);
						}
						if (snake.nextDirection !== undefined) {
							snake.direction = snake.nextDirection;
							snake.nextDirection = undefined;
						}
						snake.head = snake.head.move(snake.direction);
						if (snake.head.x < 0 || snake.head.x >= width ||
							snake.head.y < 0 || snake.head.y >= height ||
							collidesWithSnake(snake.head)) {
							snake.lost = true;
							exports.active = false;
						} else {
							// Collect item
							var item = findItem(snake.head);
							if (item >= 0) {
								items[item].fetch(snake);
								items.splice(item, 1);
							}
						}
					}
					
					if (items.length === 0) {
						placeRandomItem();
					}
				}

				exports.draw();
			};

			exports.setDirection = function(snakeIdx, direction) {
				if (typeof direction === 'string') {
					direction = DIRECTION_NAMES[direction];
				}
				var snake = snakes[snakeIdx];
				if (snake !== undefined) {
					// Reverse is not allowed
					if (direction === UP && snake.direction === DOWN) {
						return;
					}
					if (direction === DOWN && snake.direction === UP) {
						return;
					}
					if (direction === LEFT && snake.direction  === RIGHT) {
						return;
					}
					if (direction === RIGHT && snake.direction  === LEFT) {
						return;
					}
					snake.nextDirection = direction;
				}
			};

			// Initialize the canvas.
			var intervalHandle;
			function restartGame() {
				ctx.beginPath();
				ctx.fillStyle = BACKGROUND_COLOR;
				ctx.fillRect(0, 0, canvas.width, canvas.height);

				ctx.lineWidth=BLOCK_SIZE;
				ctx.strokeStyle = BORDER_COLOR;
				ctx.rect(0, 0, canvas.width, canvas.height); 
				ctx.stroke();

				for (var i = 0; i < snakes.length; i+=1) {
					snakes[i].head.x = Math.floor(width/2);
					snakes[i].head.y = Math.floor(height/2);
					snakes[i].body = [];
					snakes[i].lost = 0;
					snakes[i].direction = RIGHT;
					snakes[i].nextDirection = undefined;
				}
				items = [];
				placeRandomItem();
				exports.active = true;

				// Do not use window.requestRenderFrame here since this does
				// not provide control on how often it will be called.
				clearInterval(intervalHandle);
				intervalHandle = window.setInterval(function() {
					if (!exports.active) {
						clearInterval(intervalHandle);
					}
					if (document.hidden === undefined || !document.hidden) {
						exports.nextFrame();
					}
				}, 100);
			}
			restartGame();

			// Bind controls on gamepad
			var gamepadListener = function(gamepad, button, state) {
				console.log(gamepad, button, state);
				if ((document.hidden !== undefined && document.hidden) ||
					(state >= -0.5 && state <= 0.5)) {
					return;
				}

				if (!exports.active) {
					if (button === 'BUTTON_0' && state) {
						// Restart game
						restartGame();
					}
					return;
				}

				switch (button) {
				// X-Axes (-1..1)
				case 'AXES_0':
					if (state < 0) {
						exports.setDirection(0, 'left');
					} else if (state > 0) {
						exports.setDirection(0, 'right');
					}
					break;

				// Y-Axes (-1..1)
				case 'AXES_1':
					if (state < 0) {
						exports.setDirection(0, 'up');
					} else if (state > 0) {
						exports.setDirection(0, 'down');
					}
					break;

				case 'BUTTON_12': // Up
					exports.setDirection(0, 'up');
					break;

				case 'BUTTON_13': // Down
					exports.setDirection(0, 'down');
					break;

				case 'BUTTON_14': // Left
					exports.setDirection(0, 'left');
					break;

				case 'BUTTON_15': // Right
					exports.setDirection(0, 'right');
					break;
				}
			};

			var gamepad = new Gamepad();
			gamepad.addButtonListener(gamepadListener);

			exports.exit = function() {
				console.log("exiting");
				gamepad.removeButtonListener(gamepadListener);
				exports.active = false;
				clearInterval(intervalHandle);
			};

			return exports;
		};

		// Returns a new field on the existing frame or creates a new fullscreen frame
		return function(canvas) {
			if (canvas === undefined) {
				canvas = document.createElement('canvas');
				canvas.width = document.body.clientWidth;
				canvas.height = document.body.clientHeight;
				canvas.style.position = 'fixed';
				canvas.style.zIndex = 1000;
				canvas.style.top = 0;
				canvas.style.left = 0;
				canvas.style.width = '100%';
				canvas.style.height = '100%';
				document.body.appendChild(canvas);
				var field = new Field(canvas);
				var origexit = field.exit;
				field.exit = function() {
					// Also remove canvas
					origexit();
					canvas.remove();
				};
				return field;
			} else {
				return new Field(canvas);
			}
		};

	});
})();
