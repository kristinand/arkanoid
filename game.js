const KEYS = {
	LEFT: 37,
	RIGHT: 39,
	SPACE: 32,
};

let game = {
	context: null,
	ball: null,
	platform: null,
	blocks: [],
	rows: 4,
	cols: 8,
	width: 640,
	height: 360,
	sprites: {
		background: null,
		ball: null,
		platform: null,
		block: null,
	},

	init() {
		// init (api for rendering)
		this.context = document.getElementById("mycanvas").getContext("2d");
		this.setEvents();
	},

	setEvents() {
		window.addEventListener("keydown", e => {
			if (e.keyCode === KEYS.SPACE) {
				this.platform.fire();
			} else if (e.keyCode === KEYS.LEFT || e.keyCode === KEYS.RIGHT) {
				this.platform.start(e.keyCode);
			}
		});

		window.addEventListener("keyup", e => {
			this.platform.stop();
		});
	},

	preload(callback) {
		let loaded = 0;
		let required = Object.keys(this.sprites).length;

		let onImageLoad = () => {
			++loaded;
			if (loaded >= required) {
				callback();
			}
		};

		for (let key in this.sprites) {
			this.sprites[key] = new Image();
			this.sprites[key].src = `./img/${key}.png`;
			this.sprites[key].addEventListener("load", onImageLoad);
		}
	},

	create() {
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				this.blocks.push({
					active: true,
					width: 60,
					height: 20,
					x: 64 * col + 65,
					y: 24 * row + 35,
				})
			}
		}
	},

	update() {
		this.collideBlocks();
		this.collidePlatform();
		this.ball.collideWorldBounds();
		// реализация движения
		this.platform.move();
		this.ball.move();
	},

	collideBlocks() {
		for (let block of this.blocks) {
			if (block.active && this.ball.collide(block)) {
					this.ball.bumbBlock(block);
			}
		}
	},

	collidePlatform() {
		if (this.ball.collide(this.platform)) {
			this.ball.bumbPlatform(this.platform);
		}
	},

	run() {
		window.requestAnimationFrame(() => {
			this.update();
			this.render();
			this.run();
		});
	},

	render() {
		this.context.clearRect(0, 0, this.width, this.height);

		this.context.drawImage(this.sprites.background, 0, 0);
		this.context.drawImage(this.sprites.ball,
													 0, 0, 
													 this.ball.width, this.ball.height, 
													 this.ball.x, this.ball.y, 
													 this.ball.width, this.ball.height);
		this.context.drawImage(this.sprites.platform, this.platform.x, this.platform.y);
		this.renderBlocks();
	},
	
	renderBlocks() {
		for (let block of this.blocks) {
			if (block.active) {
				this.context.drawImage(this.sprites.block, block.x, block.y);
			}
		}
	},

	start() {
		// run
		this.init();
		this.preload(() => {
			this.create(); 
			this.run();
		});
	},

	random(min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}
};

game.ball = {
	x: 320,
	y: 280,
	width: 20,
	height: 20,
	dy: 0,
	dx: 0,
	velocity: 3,

	start() {
		this.dy = -this.velocity;
		this.dx = game.random(-this.velocity, this.velocity);
	},

	move() {
		if (this.dy) {
			// обновляем координату с учетом смещения
			this.y += this.dy;
		}
		if (this.dx) {
			this.x += this.dx;
		}
	},

	collide(el) {
		let x = this.x + this.dx;
		let y = this.y + this.dy;

		if (x + this.width > el.x &&
				x < el.x + el.width &&
				y + this.height > el.y &&
				y < el.y + el.height) {
				return true;
		}
		return false;
	},

	collideWorldBounds() {
		let x = this.x + this.dx;
		let y = this.y + this.dy;

		let ballLeft = x;
		let ballRight = x + this.width;
		let ballTop = y;
		let ballBottom = y + this.height;

		let worldLeft = 0;
		let worldRight = game.width;
		let worldTop = 0;
		let worldBottom = game.height;

		if (ballLeft < worldLeft) {
			this.x = 0;
			this.dx = this.velocity;
		} else if (ballRight > worldRight) {
			this.x = worldRight - this.width;
			this.dx = -this.velocity;
		} else if (ballTop < worldTop) {
			this.y = 0;
			this.dy = this.velocity;
		} else if (ballBottom > worldBottom) {
			console.log("game over");
		}
	},

	bumbBlock(block) {
		this.dy = -this.dy;
		block.active = false;
	},

	bumbPlatform(platform) {
		// если мяч уже оттолкнулся, снова не выполняем
		if (this.dy > 0) {
			this.dy = -this.velocity;
			// координата касания с платформой
			let touchX = this.x + this.width / 2;
			this.dx = this.velocity * platform.getTochOffset(touchX);
		}
	}
};

game.platform = {
	x: 280,
	y: 300,
	width: 100,
	height: 14,
	velocity: 6,
	// первоначально в сост покоя
	dx: 0,
	ball: game.ball,

	start(direction) {
		if (direction === KEYS.LEFT) {
			this.dx = -this.velocity;
		} else if (direction === KEYS.RIGHT) {
			this.dx = this.velocity;
		}
	},

	stop() {
		this.dx = 0;
	},

	move() {
		if (this.dx) {
			this.x += this.dx;
			if (this.ball) {
				this.ball.x += this.dx;
			}
		}
	},

	// Метод "платформа запускает мяч",
	// после того, как мы запустили мяч,
	// платформа мяч теряет, т.е. ничего о нем не знает
	fire() {
		if (this.ball) {
			this.ball.start();
			this.ball = null;
		}
	},

	getTochOffset(x) {
		// "кусочек" от касания мяча до правой части платформы
		let diff = this.x + this.width - x;
		let offset = this.width - diff;
		// значение координаты касания в частях (от 0 до 2)
		let result = 2 * offset / this.width;
		return result - 1
	}
};

window.addEventListener("load", () => {
	game.start();
});