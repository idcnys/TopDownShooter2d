const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

const world = { width: 3000, height: 3000 };
const player = { x: 1500, y: 1500, size: 12, speed: 300 };
const camera = { x: 0, y: 0 };
const keys = {};
let score = 0;
let kills = 0;
let lifes = 3;
let gameOver = false;
let shootDir = { x: 0, y: -1 };
let usedBullets = 0;
let escapeDoorTime = 100;
let threshold = 50;
let freezespawned = false;
let won = false;
let winplayed = false;
const bullets = [];
const bulletSpeed = 700;
let lastShot = 0;
let fireRate = 200; //ms cooldown
let spwanrampagecount = 0;
const enemies = [];
let enemySpeed = 120;
const powerups = [];
let damageCooldown = 0;
const effects = { shield: false, clone: false };
const effectTimers = { shield: 0, clone: 0 };
let toastText = "";
let toastTimer = 0;
const fireSound = new Audio("effects/shoot.mp3");
let lastTime = 0;
const playerImg = new Image();
playerImg.src = "icons/sprite.png";
const enemyImg = new Image();
enemyImg.src = "icons/zoombies/0.png";
const powerupImages = {
  shield: new Image(),
  bomb: new Image(),
  machine_gun: new Image(),
  freeze: new Image(),
};
let freezed = false;

powerupImages.shield.src = "icons/powerups/shield.png";
powerupImages.bomb.src = "icons/powerups/skull.png";
powerupImages.machine_gun.src = "icons/powerups/machine_gun.png";
powerupImages.freeze.src = "icons/pumpkin.png";
let gameOverSoundPlayed = false;
let bgm;
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
function startBGM() {
  bgm = new Audio("effects/bgm.mp3");
  bgm.gameloop = true;
  bgm.volume = 0.3;
  bgm.play().catch(() => {
    addEventListener("keydown", () => bgm.play());
    addEventListener("mousedown", () => bgm.play());
  });
}
function spawnEnemy() {
  if (gameOver || freezed) return;
  let x, y;
  do {
    x = Math.random() * world.width;
    y = Math.random() * world.height;
  } while (Math.hypot(x - player.x, y - player.y) < 50);
  enemies.push({ x, y, size: 14 });
}
function spawnPowerup() {
  const types = ["shield", "clone", "bomb"];
  let curtype = types[Math.floor(Math.random() * 3)];
  if (curtype == "bomb" && spwanrampagecount == 1) {
    //we cant
    curtype = types[Math.floor(Math.random() * 2)];
  }
  if (curtype == "bomb" && spwanrampagecount == 0) {
    spwanrampagecount++;
  }
  if (kills > threshold && !freezespawned) {
    curtype = "freeze";
    freezespawned = true;
  }
  powerups.push({
    x: Math.random() * world.width,
    y: Math.random() * world.height,
    type: curtype,
    size: 10,
  });
}
function gameloop(time) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;
  if (!gameOver) update(dt, time);
  render();
  requestAnimationFrame(gameloop);
}
function update(dt, time) {
  // movement
  if (keys.w || keys.ArrowUp) player.y -= player.speed * dt;
  if (keys.s || keys.ArrowDown) player.y += player.speed * dt;
  if (keys.a || keys.ArrowLeft) player.x -= player.speed * dt;
  if (keys.d || keys.ArrowRight) player.x += player.speed * dt;

  // shoot
  if (keys[" "] && time - lastShot > fireRate) {
    fire(player.x, player.y);
    if (effects.clone) {
      fire(player.x + 20, player.y);
      fire(player.x - 20, player.y);
    }
    lastShot = time;
  }

  // bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * bulletSpeed * dt;
    b.y += b.vy * bulletSpeed * dt;
    if (b.x < 0 || b.y < 0 || b.x > world.width || b.y > world.height) {
      bullets.splice(i, 1);
    }
  }

  if (damageCooldown > 0) damageCooldown -= dt;

  // enemies
  for (let ei = enemies.length - 1; ei >= 0; ei--) {
    const e = enemies[ei];
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy);
    e.x += (dx / d) * enemySpeed * dt;
    e.y += (dy / d) * enemySpeed * dt;

    if (d < e.size + player.size) {
      if (effects.shield) {
        enemies.splice(ei, 1);
        score += 10;
      } else if (damageCooldown <= 0) {
        let dam = new Audio("./effects/damage.mp3");

        dam.play();
        lifes--;
        damageCooldown = 1; // 1 second invincibility
        if (lifes <= 0) gameOver = true;
      }
    }
  }

  // bullet hit
  for (let i = enemies.length - 1; i >= 0; i--) {
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (
        Math.hypot(enemies[i].x - bullets[j].x, enemies[i].y - bullets[j].y) <
        enemies[i].size
      ) {
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        score += 10;
        kills++;
        var audio = new Audio("effects/kill.mp3");
        audio.volume = 0.2;
        audio.play();

        if (kills % 50 == 0) {
          spwanrampagecount--;
        }

        if (kills % 100 === 0) {
          toastText = `Damn! ${kills} KILLS!`;
          toastTimer = 2;
        }
        break;
      }
    }
  }

  // powerup pickup
  for (let i = powerups.length - 1; i >= 0; i--) {
    if (
      Math.hypot(player.x - powerups[i].x, player.y - powerups[i].y) <
      player.size + powerups[i].size
    ) {
      activate(powerups[i].type);
      powerups.splice(i, 1);
    }
  }

  // timers
  for (let k in effectTimers) {
    if (effectTimers[k] > 0) {
      effectTimers[k] -= dt;
      if (effectTimers[k] <= 0) effects[k] = false;
    }
  }
  if (toastTimer > 0) toastTimer -= dt;

  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;
}
function fire(x, y) {
  bullets.push({ x, y, vx: shootDir.x, vy: shootDir.y });
  fireSound.currentTime = 0;
  fireSound.volume = 0.2;
  fireSound.play();
  usedBullets++;
}
function activate(type) {
  if (type === "shield") {
    effects.shield = true;
    effectTimers.shield = 5;
  }
  if (type === "clone") {
    effects.clone = true;
    effectTimers.clone = 5;
  }
  if (type === "bomb") {
    score += enemies.length * 10;

    var audio = new Audio("effects/rampage.mp3");
    audio.play();
    enemies.length = 0;
  }
  if (type == "freeze") {
    freezed = true;
    var aud = new Audio("./effects/freeze.mp3");
    aud.play();
  }
}
function drawPlayer() {
  const size = player.size * 2;

  ctx.save();
  ctx.translate(player.x - camera.x, player.y - camera.y);
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(playerImg, -size / 2, -size / 2, size, size);
  ctx.restore();

  if (effects.shield) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      player.x - camera.x,
      player.y - camera.y,
      player.size + 8,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }
}
function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x - camera.x + 4, b.y - camera.y - 4, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEnemies() {
  const size = 40;

  enemies.forEach((e) => {
    ctx.save();
    ctx.translate(e.x - camera.x, e.y - camera.y);

    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    ctx.rotate(angle);

    ctx.drawImage(enemyImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  });
}

function drawPowerups() {
  powerups.forEach((p) => {
    let img;
    if (p.type === "shield") img = powerupImages.shield;
    else if (p.type === "bomb") img = powerupImages.bomb;
    else if (p.type == "freeze") img = powerupImages.freeze;
    else img = powerupImages.machine_gun;

    const size = p.size * 3;
    ctx.drawImage(
      img,
      p.x - camera.x - size / 2,
      p.y - camera.y - size / 2,
      size,
      size
    );
  });
}

function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "21px BlockCraft";
  ctx.fillText("Score: " + score, 20, 30);
  ctx.fillText("Life: " + lifes, 150, 30);
  ctx.fillStyle = "red";
  ctx.fillText("Zoombies: " + enemies.length, 250, 30);

  ctx.fillStyle = "white";
  ctx.fillText("Killed: " + kills, 400, 30);
  ctx.fillStyle = "lightgreen";
  ctx.fillText("Powerups: " + powerups.length, 520, 30);
  ctx.fillStyle = "white";
  ctx.fillText(
    "Accuracy: " + ((parseFloat(kills) / usedBullets) * 100).toFixed(2) + "%",
    650,
    30
  );
  if (kills > threshold) {
    ctx.fillStyle = "lightgreen";
    ctx.fillText("Freeze: YES", 1020, 30);
  } else {
    ctx.fillStyle = "gray";
    ctx.fillText("Freeze: Kill " + threshold + " to unlock", 1020, 30);
  }
  ctx.fillText("Freezed: " + freezed, 850, 30);
  ctx.fillStyle = "white";
  ctx.fillText("High Score: " + localStorage.getItem("highscore"), 20, 700);

  ctx.fillStyle = "gray";
  ctx.font = "14px BlockCraft";
  ctx.fillText("© bitto saha", canvas.width - 120, canvas.height - 20);
  ctx.fillStyle = "white";

  let y = 60;
  if (effectTimers.shield > 0) {
    ctx.fillText("Shield: " + effectTimers.shield.toFixed(1) + "s", 20, y);
    y += 25;
  }
  if (effectTimers.clone > 0) {
    ctx.fillText("Clone: " + effectTimers.clone.toFixed(1) + "s", 20, y);
  }

  if (toastTimer > 0) {
    ctx.font = "40px BlockCraft";
    ctx.fillStyle = "orange";
    ctx.fillText(toastText, canvas.width / 2 - 140, 80);
  }

  if (enemies.length == 0 && freezed) {
    ctx.fillStyle = "green";
    ctx.font = "50px BlockCraft";
    ctx.fillText("You Won!!!", canvas.width / 2 - 150, canvas.height / 2);
    gameOver = true;
    won = true;
    if (!winplayed) {
      let aud = new Audio("./effects/win.mp3");
      aud.play();
      winplayed = true;
    }
  }

  if (gameOver) {
    localStorage.setItem(
      "highscore",
      Math.max(score, localStorage.getItem("highscore") || 0)
    );
    if (!gameOverSoundPlayed && !won) {
      bgm.pause();
      const gameOverAudio = new Audio("effects/gameover.mp3");
      gameOverAudio.play();
      gameOverSoundPlayed = true;
    }
    if (!won) {
      ctx.fillStyle = "red";
      ctx.font = "50px BlockCraft";
      ctx.fillText("GAME OVER", canvas.width / 2 - 150, canvas.height / 2);
    }
  }
}
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawPowerups();
  drawUI();
}
function drawGrid() {
  ctx.strokeStyle = "#222";
  for (let x = 0; x < world.width; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x - camera.x, -camera.y);
    ctx.lineTo(x - camera.x, world.height - camera.y);
    ctx.stroke();
  }
  for (let y = 0; y < world.height; y += 100) {
    ctx.beginPath();
    ctx.moveTo(-camera.x, y - camera.y);
    ctx.lineTo(world.width - camera.x, y - camera.y);
    ctx.stroke();
  }
}
window.addEventListener("resize", resize);
window.addEventListener("keydown", (e) => (keys[e.key] = true));
window.addEventListener("keyup", (e) => (keys[e.key] = false));
window.addEventListener("keydown", (e) => {
  if (e.key === "1") shootDir = { x: 0, y: -1 };
  if (e.key === "2") shootDir = { x: 0, y: 1 };
  if (e.key === "3") shootDir = { x: -1, y: 0 };
  if (e.key === "4") shootDir = { x: 1, y: 0 };
});
window.addEventListener("keydown", (e) => {
  if (e.key === "r" && gameOver) {
    enemies.length = bullets.length = powerups.length = 0;
    score = kills = 0;
    gameOver = false;
    player.x = 1500;
    player.y = 1500;
  }
});

function disableContextMenu() {
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
}

document.getElementById("startButton").addEventListener("click", () => {
  let ut = parseInt(document.getElementById("thresholdInput").value);
  if (ut && ut >= 50 && ut <= 500) {
    threshold = ut;
  }
  const modal = document.querySelector(".modal");
  modal.style.display = "none";
  disableContextMenu();
  resize();
  startBGM();
  setInterval(spawnEnemy, 1000);
  setInterval(spawnPowerup, 6000);
  requestAnimationFrame(gameloop);
});
