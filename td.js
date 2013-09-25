var config = {
    "level" : [
        {
            "startingGold" : 10
        }
    ],
    "turrets" : {
        "shooter" :  {
            "name" : "Shooter",
            "size" : 16,
            "attackInterval" : 300,
            "range" : 100,
            "price" : 10,
            "color" : "green",
            "bullet" : {
                "color" : "black",
                "slows" : false,
                "damage" : 10,
                "speed" : 5,
                "size" : 2,
                "splash" : false,
                "splashRange" : 0
            }
        },
        "quickie" : {
            "name" : "Quickie",
            "size" : 12,
            "attackInterval" : 100,
            "range" : 200,
            "price" : 5,
            "color" : "red",
            "bullet" : {
                "color" : "purple",
                "slows" : false,
                "damage" : 2,
                "speed" : 10,
                "size" : 1,
                "splash" : false,
                "splashRange" : 0
            }
        }
    }
};

function getLevel() {
    return 0;
}

TowerDefence = function(io){
	var STATE_NONE = 0;
	var STATE_PLACING_TOWER = 1;
    var turretType;
	var state = STATE_NONE;
	var lastTick = (new Date()).getTime();
    var indicator = new TowerIndicator();
    
    function getCurrentTurret() {
        return config.turrets[turretType];
    }

	io.addGroup('towers');
	io.addGroup('enemies');
	io.addGroup('bullets');

    
    // GRID
	var grid = new iio.Grid(0, 0, 20, 20, 32);
	grid.setStrokeStyle('rgba(0,0,0,0.1)', 1);
	io.addObj(grid);

	// COLLISION
	io.setCollisionCallback('bullets', 'enemies', function(bullet, enemy){
		// Only hit enemies we targeted
		if (bullet.targetEnemy == enemy) {
			io.rmvObj(bullet);
			enemy.setHealth(enemy.getHealth() - bullet.damage);
			if (enemy.getHealth() <= 0) {
				// Enemy is dead
				io.rmvObj(enemy);
                updateGold(enemy.value);
			}
		}
	});
    
    //SCORE
    var gold = config.level[getLevel()].startingGold;
    var text = io.addToGroup('GUI', new iio.Text('',40,io.canvas.height-30)
          .setFont('16px sans-serif')
          .setFillStyle('white'));
    function updateGold(amount){
        gold += amount;
        text.setText('Gold: '+gold)
    }; updateGold(0);
    
    function purchaseTower(cell, towerName) {
        var towerConfig = config.turrets[towerName];
        var cellCenter = grid.getCellCenter(cell);
        if (!cell.occupied) {
            if (gold >= towerConfig.price) {
                cell.occupied = true;
                updateGold(-towerConfig.price);
                new Tower(location, towerConfig);
            }
        }
    }


	io.setFramerate(60, function(){
		var towers = io.getGroup('towers');
		var enemies = io.getGroup('enemies');
		var bullets = io.getGroup('bullets');

		// Bullets
		for (var i = 0; i < towers.length; i++) {
			for (var e = 0; e < enemies.length; e++) {
				if (towers[i].pos.distance(enemies[e].pos) <= towers[i].range) {
					// Enemy within range
					var date = new Date();
					if (date.getTime() - towers[i].lastShot > towers[i].attackInterval) {
						var bullet = new Projectile(towers[i].pos, towers[i].bullet, enemies[e]);
						
						towers[i].lastShot = date.getTime();
					}
				}
			}
		}

		for (var i = 0; i < bullets.length; i++) {
			if (bullets[i].targetEnemy.getHealth() <= 0) {
				io.rmvObj(bullets[i]);
			} else {
				var vector = bullets[i].targetEnemy.pos.clone().sub(bullets[i].pos);
				bullets[i].setVel(vector.normalize().mult(bullets[i].speed));
			}
		};
	});

	// ENEMIES
	io.setFramerate(1, function(){
		var enemy = new Enemy(100, 5);
        enemy.setBound('bottom',io.canvas.height+80);
	});
	
	// MOUSE EVENTS
	io.canvas.addEventListener('mousedown', function(event){
		switch (state) {
			case STATE_PLACING_TOWER:
				purchaseTower(grid.getCellAt(io.getEventPosition(event)), turretType);
                              
				break;
		}
	});

	io.canvas.addEventListener('mousemove', function(event){
		// Tower indicator
		if (state == STATE_PLACING_TOWER) {
			var cell = grid.getCellAt(io.getEventPosition(event));
			indicator.move(grid.getCellCenter(cell));
		}
	});

	window.addEventListener('keydown', function(event){
		// T is pressed
		if (iio.keyCodeIs('t', event)) {
			state = STATE_PLACING_TOWER;
            turretType = "shooter";
        }
        if (iio.keyCodeIs('f', event)) {
			state = STATE_PLACING_TOWER;
            turretType = "quickie";
        }
        if (iio.keyCodeIs('escape', event)) {
            state = null;
            indicator.hide();
        }
	});
    
    function TowerIndicator() {
        var currentSize = 16;
        var currentRange = 100;
        var towerIndicator = new iio.Circle(-1000, -1000, 16);
        towerIndicator.setFillStyle('rgba(255,255,255,0.5)');
        
        var rangeIndicator = new iio.Circle(-1000, -1000, 100);
        rangeIndicator.setFillStyle('rgba(255,255,255,0.3)');
        
        io.addObj(towerIndicator);
        io.addObj(rangeIndicator);
        
        this.hide = function() {
            towerIndicator.setPos(-1000,-1000);
            rangeIndicator.setPos(-1000,-1000);
        }
        this.move = function(pos) {
            changeSize(getCurrentTurret().size, getCurrentTurret().range);
            towerIndicator.setPos(pos);
            rangeIndicator.setPos(pos);
        }
        
        function changeSize(size, range) {
            if (size != this.currentSize) towerIndicator.setRadius(size);
            if (range != this.currentRange) rangeIndicator.setRadius(range)
        }
    }
    
    function Projectile(pos, config, targetEnemy) {
        iio.Circle.apply(this, [pos, 2])
        this.enableKinematics();
        this.setFillStyle('black');
        this.damage = config.damage;
        this.speed = config.speed;
        this.targetEnemy = targetEnemy;
        io.addToGroup('bullets', this, 3);
        
        var vector = targetEnemy.pos.clone().sub(pos);
        this.setVel(vector.normalize().mult(config.speed));
        
    }
    Projectile.prototype = new iio.Circle();
    Projectile.prototype.constructor = Projectile;
    
    
    function Enemy(hp, size) {
        iio.Circle.apply(this, [200, 0, size]);
        this.setFillStyle('rgb(255, 140, 0)');
        this.setStrokeStyle('rgba(0,0,0,0.4)');
        this.setLineWidth(1);
        this.enableKinematics();
        this.setVel(0,0.5);
        this.value = 5;
        io.addToGroup('enemies', this, 2);
        
        var health = hp;
        
        this.getHealth = function() {
            return health;
        }
        this.setHealth = function(amount) {
            health = amount;
            this.setFillStyle("rgba(255, 140, 0, " + amount/100 + ")");
        }
    }
    Enemy.prototype = new iio.Circle();
    Enemy.prototype.constructor = Enemy;
    
    
    function Tower(pos, config) {
        iio.Circle.apply(this, [pos, config.size]);
        this.setFillStyle(config.color);
        this.attackInterval = config.attackInterval;
        this.bullet = {};
        this.bullet.damage = config.bullet.damage;
        this.bullet.speed = config.bullet.speed;
        this.range = config.range;
        this.lastShot = 0;
        io.addToGroup('towers', this, 1);
    }
    Tower.prototype = new iio.Circle();
    Tower.prototype.constructor = Tower;
    
};

iio.start(TowerDefence);
