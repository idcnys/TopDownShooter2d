class Renderer {
  constructor(canvasId, width = 3000, height = 3000, lifes = 3, threshold = 50, escapeDoorTime = 100, bulletSpeed = 700, fireRate = 200, enemySpeed = 120) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    this.world = { width: width, height: height };
    this.player = { x: width / 2, y: height / 2, size: 12, speed: 300 };
    this.camera = { x: 0, y: 0 };
    this.keys = {};

    this.score = 0;
    this.kills = 0;
    this.lifes = lifes;
    this.gameOver = false;
    this.shootDir = { x: 0, y: -1 };
    this.usedBullets = 0;
    this.escapeDoorTime = escapeDoorTime;
    this.threshold = threshold;
    this.freezespawned = false;
    this.won = false;
    this.winplayed = false;

    this.bullets = [];
    this.bulletSpeed = bulletSpeed;
    this.lastShot = 0;
    this.fireRate = fireRate;
    this.spwanrampagecount = 0;
    this.enemies = [];
    this.enemySpeed = enemySpeed;
    this.powerups = [];
    this.damageCooldown = 0;
    this.effects = { shield: false, clone: false };
    this.effectTimers = { shield: 0, clone: 0 };
    this.toastText = "";
    this.toastTimer = 0;
    this.freezed = false;
    this.lastTime = 0;
    this.gameOverSoundPlayed = false;
    this.bgm = null;
    this.started = false;

    this.fireSound = new Audio("effects/shoot.mp3");
    this.playerImg = new Image();
    this.playerImg.src = "icons/sprite.png";
    this.enemyFrameImages = [];
    this.enemyFrameCount = 9;
    this.enemyAnimFps = 10;
    this.enemyAnimTimer = 0;
    this.enemyAnimFrame = 0;
    for (let i = 0; i < this.enemyFrameCount; i++) {
      const frame = new Image();
      frame.src = `icons/zombies/${i}.png`;
      this.enemyFrameImages.push(frame);
    }
    this.powerupImages = {
      shield: new Image(),
      bomb: new Image(),
      machine_gun: new Image(),
      freeze: new Image(),
    };
    this.powerupImages.shield.src = "icons/powerups/shield.png";
    this.powerupImages.bomb.src = "icons/powerups/skull.png";
    this.powerupImages.machine_gun.src = "icons/powerups/machine_gun.png";
    this.powerupImages.freeze.src = "icons/pumpkin.png";

    this.resize = this.resize.bind(this);
    this.gameloop = this.gameloop.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.spawnEnemy = this.spawnEnemy.bind(this);
    this.spawnPowerup = this.spawnPowerup.bind(this);
  }

  initInput() {
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  onKeyDown(e) {
    this.keys[e.key] = true;

    if (e.key === "1") this.shootDir = { x: 0, y: -1 };
    if (e.key === "2") this.shootDir = { x: 0, y: 1 };
    if (e.key === "3") this.shootDir = { x: -1, y: 0 };
    if (e.key === "4") this.shootDir = { x: 1, y: 0 };

    if (e.key === "r" && this.gameOver)
      this.resetRound();

  }

  onKeyUp(e) {
    this.keys[e.key] = false;
  }

  disableContextMenu() {
    document.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  startBGM() {
    this.bgm = new Audio("effects/bgm.mp3");
    this.bgm.loop = true;
    this.bgm.volume = 0.3;
    this.bgm.play().catch(() => {
      addEventListener("keydown", () => this.bgm.play());
      addEventListener("mousedown", () => this.bgm.play());
    });
  }

  spawnEnemy() {
    if (this.gameOver || this.freezed) return;
    let x, y;
    do {
      x = Math.random() * this.world.width;
      y = Math.random() * this.world.height;
    } while (Math.hypot(x - this.player.x, y - this.player.y) < 50);
    this.enemies.push({ x, y, size: 14 });
  }

  spawnPowerup() {
    const types = ["shield", "clone", "bomb"];
    let curtype = types[Math.floor(Math.random() * 3)];

    if (curtype == "bomb" && this.spwanrampagecount == 1) {
      curtype = types[Math.floor(Math.random() * 2)];
    }
    if (curtype == "bomb" && this.spwanrampagecount == 0) {
      this.spwanrampagecount++;
    }
    if (this.kills > this.threshold && !this.freezespawned) {
      curtype = "freeze";
      this.freezespawned = true;
    }

    this.powerups.push({
      x: Math.random() * this.world.width,
      y: Math.random() * this.world.height,
      type: curtype,
      size: 10,
    });
  }

  gameloop(time) {
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    if (!this.gameOver) this.update(dt, time);
    this.render();
    requestAnimationFrame(this.gameloop);
  }

  update(dt, time) {
    if (this.keys.w || this.keys.ArrowUp) this.player.y -= this.player.speed * dt;
    if (this.keys.s || this.keys.ArrowDown) this.player.y += this.player.speed * dt;
    if (this.keys.a || this.keys.ArrowLeft) this.player.x -= this.player.speed * dt;
    if (this.keys.d || this.keys.ArrowRight) this.player.x += this.player.speed * dt;

    this.player.x = Math.max(this.player.size, Math.min(this.world.width - this.player.size, this.player.x));
    this.player.y = Math.max(this.player.size, Math.min(this.world.height - this.player.size, this.player.y));

    this.enemyAnimTimer += dt;
    const frameDuration = 1 / this.enemyAnimFps;
    if (this.enemyAnimTimer >= frameDuration) {
      this.enemyAnimFrame = (this.enemyAnimFrame + 1) % this.enemyFrameCount;
      this.enemyAnimTimer -= frameDuration;
    }

    if (this.keys[" "] && time - this.lastShot > this.fireRate) {
      this.fire(this.player.x, this.player.y);
      if (this.effects.clone) {
        this.fire(this.player.x + 20, this.player.y);
        this.fire(this.player.x - 20, this.player.y);
      }
      this.lastShot = time;
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * this.bulletSpeed * dt;
      b.y += b.vy * this.bulletSpeed * dt;
      if (b.x < 0 || b.y < 0 || b.x > this.world.width || b.y > this.world.height)
        this.bullets.splice(i, 1);
    }

    if (this.damageCooldown > 0) this.damageCooldown -= dt;

    for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
      const e = this.enemies[ei];
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const d = Math.hypot(dx, dy);
      e.x += (dx / d) * this.enemySpeed * dt;
      e.y += (dy / d) * this.enemySpeed * dt;

      if (d < e.size + this.player.size) {
        if (this.effects.shield) {
          this.enemies.splice(ei, 1);
          this.score += 10;
        } else if (this.damageCooldown <= 0) {
          const dam = new Audio("./effects/damage.mp3");
          dam.play();
          this.lifes--;
          this.damageCooldown = 1;
          if (this.lifes <= 0) this.gameOver = true;
        }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        if (
          Math.hypot(this.enemies[i].x - this.bullets[j].x, this.enemies[i].y - this.bullets[j].y) <
          this.enemies[i].size
        ) {
          this.enemies.splice(i, 1);
          this.bullets.splice(j, 1);
          this.score += 10;
          this.kills++;
          const audio = new Audio("effects/kill.mp3");
          audio.volume = 0.2;
          audio.play();

          if (this.kills % 50 == 0)
            this.spwanrampagecount--;


          if (this.kills % 100 === 0) {
            this.toastText = `Damn! ${this.kills} KILLS!`;
            this.toastTimer = 2;
          }
          break;
        }
      }
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      if (
        Math.hypot(this.player.x - this.powerups[i].x, this.player.y - this.powerups[i].y) <
        this.player.size + this.powerups[i].size
      ) {
        this.activate(this.powerups[i].type);
        this.powerups.splice(i, 1);
      }
    }

    for (const k in this.effectTimers) {
      if (this.effectTimers[k] > 0) {
        this.effectTimers[k] -= dt;
        if (this.effectTimers[k] <= 0) this.effects[k] = false;
      }
    }

    if (this.toastTimer > 0) this.toastTimer -= dt;

    this.camera.x = this.player.x - this.canvas.width / 2;
    this.camera.y = this.player.y - this.canvas.height / 2;
  }

  fire(x, y) {
    this.bullets.push({ x, y, vx: this.shootDir.x, vy: this.shootDir.y });
    this.fireSound.currentTime = 0;
    this.fireSound.volume = 0.2;
    this.fireSound.play();
    this.usedBullets++;
  }

  activate(type) {
    if (type === "shield") {
      this.effects.shield = true;
      this.effectTimers.shield = 5;
    }
    if (type === "clone") {
      this.effects.clone = true;
      this.effectTimers.clone = 5;
    }
    if (type === "bomb") {
      this.score += this.enemies.length * 10;
      const audio = new Audio("effects/rampage.mp3");
      audio.play();
      this.enemies.length = 0;
    }
    if (type == "freeze") {
      this.freezed = true;
      const aud = new Audio("./effects/freeze.mp3");
      aud.play();
    }
  }

  drawPlayer() {
    const size = this.player.size * 2;

    this.ctx.save();
    this.ctx.translate(this.player.x - this.camera.x, this.player.y - this.camera.y);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.drawImage(this.playerImg, -size / 2, -size / 2, size, size);
    this.ctx.restore();

    if (this.effects.shield) {
      this.ctx.strokeStyle = "cyan";
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(
        this.player.x - this.camera.x,
        this.player.y - this.camera.y,
        this.player.size + 8,
        0,
        Math.PI * 2
      );
      this.ctx.stroke();
    }
  }

  drawBullets() {
    this.ctx.fillStyle = "yellow";
    this.bullets.forEach((b) => {
      this.ctx.beginPath();
      this.ctx.arc(b.x - this.camera.x + 4, b.y - this.camera.y - 4, 4, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawEnemies() {
    const size = 40;
    const enemyFrame = this.enemyFrameImages[this.enemyAnimFrame] || this.enemyFrameImages[0];

    this.enemies.forEach((e) => {
      this.ctx.save();
      this.ctx.translate(e.x - this.camera.x, e.y - this.camera.y);

      const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
      this.ctx.rotate(angle);

      this.ctx.drawImage(enemyFrame, -size / 2, -size / 2, size, size);
      this.ctx.restore();
    });
  }

  drawPowerups() {
    this.powerups.forEach((p) => {
      let img;
      if (p.type === "shield") img = this.powerupImages.shield;
      else if (p.type === "bomb") img = this.powerupImages.bomb;
      else if (p.type == "freeze") img = this.powerupImages.freeze;
      else img = this.powerupImages.machine_gun;

      const size = p.size * 3;
      this.ctx.drawImage(img, p.x - this.camera.x - size / 2, p.y - this.camera.y - size / 2, size, size);
    });
  }

  drawUI() {
    this.ctx.fillStyle = "white";
    this.ctx.font = "21px BlockCraft";
    this.ctx.fillText("Score: " + this.score, 20, 30);
    this.ctx.fillText("Life: " + this.lifes, 150, 30);
    this.ctx.fillStyle = "red";
    this.ctx.fillText("Zombies: " + this.enemies.length, 250, 30);

    this.ctx.fillStyle = "white";
    this.ctx.fillText("Killed: " + this.kills, 400, 30);
    this.ctx.fillStyle = "lightgreen";
    this.ctx.fillText("Powerups: " + this.powerups.length, 520, 30);
    this.ctx.fillStyle = "white";
    this.ctx.fillText(
      "Accuracy: " + ((parseFloat(this.kills) / this.usedBullets) * 100).toFixed(2) + "%",
      650,
      30
    );

    if (this.kills > this.threshold) {
      this.ctx.fillStyle = "lightgreen";
      this.ctx.fillText("Freeze: YES", 1020, 30);
    } else {
      this.ctx.fillStyle = "gray";
      this.ctx.fillText("Freeze: Kill " + this.threshold + " to unlock", 1020, 30);
    }

    this.ctx.fillText("Freezed: " + this.freezed, 850, 30);
    this.ctx.fillStyle = "white";
    this.ctx.fillText("High Score: " + localStorage.getItem("highscore"), 20, 700);

    this.ctx.fillStyle = "gray";
    this.ctx.font = "14px BlockCraft";
    this.ctx.fillText("© bitto saha", this.canvas.width - 120, this.canvas.height - 20);
    this.ctx.fillStyle = "white";

    let y = 60;
    if (this.effectTimers.shield > 0) {
      this.ctx.fillText("Shield: " + this.effectTimers.shield.toFixed(1) + "s", 20, y);
      y += 25;
    }
    if (this.effectTimers.clone > 0) {
      this.ctx.fillText("Clone: " + this.effectTimers.clone.toFixed(1) + "s", 20, y);
    }

    if (this.toastTimer > 0) {
      this.ctx.font = "40px BlockCraft";
      this.ctx.fillStyle = "orange";
      this.ctx.fillText(this.toastText, this.canvas.width / 2 - 140, 80);
    }

    if (this.enemies.length == 0 && this.freezed) {
      this.ctx.fillStyle = "green";
      this.ctx.font = "50px BlockCraft";
      this.ctx.fillText("You Won!!!", this.canvas.width / 2 - 150, this.canvas.height / 2);
      this.gameOver = true;
      this.won = true;
      if (!this.winplayed) {
        const aud = new Audio("./effects/win.mp3");
        aud.play();
        this.winplayed = true;
      }
    }

    if (this.gameOver) {
      localStorage.setItem("highscore", Math.max(this.score, localStorage.getItem("highscore") || 0));
      if (!this.gameOverSoundPlayed && !this.won) {
        if (this.bgm) this.bgm.pause();
        const gameOverAudio = new Audio("effects/gameover.mp3");
        gameOverAudio.play();
        this.gameOverSoundPlayed = true;
      }
      if (!this.won) {
        this.ctx.fillStyle = "red";
        this.ctx.font = "50px BlockCraft";
        this.ctx.fillText("GAME OVER", this.canvas.width / 2 - 150, this.canvas.height / 2);
      }
    }
  }

  drawGrid() {
    this.ctx.strokeStyle = "#222";
    for (let x = 0; x < this.world.width; x += 100) {
      this.ctx.beginPath();
      this.ctx.moveTo(x - this.camera.x, -this.camera.y);
      this.ctx.lineTo(x - this.camera.x, this.world.height - this.camera.y);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.world.height; y += 100) {
      this.ctx.beginPath();
      this.ctx.moveTo(-this.camera.x, y - this.camera.y);
      this.ctx.lineTo(this.world.width - this.camera.x, y - this.camera.y);
      this.ctx.stroke();
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid();
    this.drawPlayer();
    this.drawBullets();
    this.drawEnemies();
    this.drawPowerups();
    this.drawUI();
  }

  resetRound() {
    this.enemies.length = this.bullets.length = this.powerups.length = 0;
    this.score = this.kills = 0;
    this.gameOver = false;
    this.won = false;
    this.winplayed = false;
    this.freezed = false;
    this.gameOverSoundPlayed = false;
    this.effects.shield = false;
    this.effects.clone = false;
    this.effectTimers.shield = 0;
    this.effectTimers.clone = 0;
    this.player.x = this.world.width / 2;
    this.player.y = this.world.height / 2;
  }

  start(thresholdValue) {
    if (this.started) return;
    this.started = true;

    if (thresholdValue && thresholdValue >= 50 && thresholdValue <= 500)
      this.threshold = thresholdValue;

    const modal = document.querySelector(".modal");
    modal.style.display = "none";

    this.disableContextMenu();
    this.resize();
    this.initInput();
    this.startBGM();
    setInterval(this.spawnEnemy, 1000);
    setInterval(this.spawnPowerup, 6000);
    requestAnimationFrame(this.gameloop);
  }
}

const game = new Renderer("world");

document.getElementById("startButton").addEventListener("click", () => {
  const ut = parseInt(document.getElementById("thresholdInput").value);
  game.start(ut);
});

