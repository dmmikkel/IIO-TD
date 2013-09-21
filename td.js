

TowerDefence = function(io){
	var STATE_NONE = 0;
	var STATE_PLACING_TOWER = 1;

	var state = STATE_NONE;

	io.addGroup('towers');
	io.addGroup('enemies');
	io.addGroup('bullets');

	var grid = new iio.Grid(0, 0, 32, 32, 32);
	grid.setStrokeStyle('red', 1);
	io.addObj(grid);

	// ENEMIES
	var enemy = new iio.Circle(io.canvas.center.x, 0, 5);
	enemy.setFillStyle('blue');
	enemy.enableKinematics();
	enemy.setVel(0,2);
	enemy.setBound('bottom',io.canvas.height+80);
	enemy.health = 100;
	io.addToGroup('enemies', enemy, 2);

	io.setFramerate(60, function(){
		var towers = io.getGroup('towers');
		var enemies = io.getGroup('enemies');
		var bullets = io.getGroup('bullets');

		for (var i = 0; i < towers.length; i++) {
			for (var e = 0; e < enemies.length; e++) {
				if (towers[i].pos.distance(enemies[e].pos) <= towers[i].range) {
					// Enemy within range
					var date = new Date();
					if (date.getTime() - towers[i].lastShot > towers[i].attackInterval) {
						var bullet = new iio.Circle(towers[i].pos, 2);
						bullet.setFillStyle('black');
						bullet.enableKinematics();
						bullet.damage = towers[i].bulletDamage;
						bullet.speed = 10;
						bullet.targetEnemy = enemies[e];
						var vector = enemies[e].pos.clone().sub(bullet.pos);
						bullet.setVel(vector.normalize().mult(bullet.speed));
						towers[i].lastShot = date.getTime();
						io.addToGroup('bullets', bullet, 3);
					}
				}
			}
		}

		for (var i = 0; i < bullets.length; i++) {
			var vector = bullets[i].targetEnemy.pos.clone().sub(bullets[i].pos);
			bullets[i].setVel(vector.normalize().mult(bullets[i].speed));
		};
	});

	io.canvas.addEventListener('mousedown', function(event){
		switch (state) {
			case STATE_PLACING_TOWER:
				var cell = grid.getCellAt(io.getEventPosition(event));
				var cellCenter = grid.getCellCenter(cell);

				var tower = new iio.Circle(cellCenter, 16);
				tower.setFillStyle('green');
				tower.attackInterval = 500;
				tower.bulletDamage = 30;
				tower.range = 200;
				tower.lastShot = 0;
				io.addToGroup('towers', tower, 1);
				break;
		}
	});

	window.addEventListener('keydown', function(event){
		// T is pressed
		if (iio.keyCodeIs('t', event)) {
			state = STATE_PLACING_TOWER;
		}
	});
};

iio.start(TowerDefence);