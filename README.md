# Zombie Survival Top Down Game

A fast, lightweight **2D top-down survival game engine** built using HTML5 Canvas and JavaScript.

## Play this game -> [Website Url](https://zombiies.vercel.app/)

This engine supports:

* Player movement
* Shooting mechanics
* Enemy AI (chasing system)
* Powerups system
* Camera system (large world support)
* Animation system
* Audio effects & BGM
* Game state handling (win/lose/reset)
* Grid-based world rendering

---

# Features

## Core Gameplay

* Top-down movement system (WASD / Arrow keys)
* Directional shooting system
* Zombie AI that chases player
* Life-based survival system
* Score & kill tracking

## World System

* Large scrollable world
* Camera follows player
* Grid rendering system

## Combat System

* Bullet physics (directional velocity)
* Collision detection
* Fire rate control
* Multi-shot clone ability

## Powerups

* Shield (temporary invincibility)
* Clone (dual shooting)
* Bomb (clears enemies)
* Freeze (halts spawning system)

## Effects System

* Timed buffs
* Cooldown damage protection
* Visual UI indicators

## Audio System

* Background music (BGM)
* Shoot sound effects
* Kill sound effects
* Damage and win/lose audio

---


# Basic Usage

## Initialize Game

```javascript
const game = new Renderer("world");
```

## Start Game

```javascript
game.start();
```

---

# Constructor

```javascript
new Renderer(
canvasId,
width = 3000,
height = 3000,
lifes = 3,
threshold = 50,
escapeDoorTime = 100,
bulletSpeed = 700,
fireRate = 200,
enemySpeed = 120
)
```

## Parameters

| Parameter      | Description                     |
| -------------- | ------------------------------- |
| canvasId       | Canvas element ID               |
| width          | World width                     |
| height         | World height                    |
| lifes          | Player lives                    |
| threshold      | Kill threshold for freeze power |
| escapeDoorTime | Escape event timer              |
| bulletSpeed    | Bullet speed                    |
| fireRate       | Shooting cooldown               |
| enemySpeed     | Zombie movement speed           |

---

# Controls

| Key   | Action       |
| ----- | ------------ |
| W / ↑ | Move up      |
| S / ↓ | Move down    |
| A / ← | Move left    |
| D / → | Move right   |
| SPACE | Shoot        |
| 1     | Shoot up     |
| 2     | Shoot down   |
| 3     | Shoot left   |
| 4     | Shoot right  |
| R     | Restart game |

---

# Core Systems

## Player System

Player properties:

```javascript
player = {
  x,
  y,
  size,
  speed
}
```

---

## Enemy System

Enemies:

* Spawn randomly in world
* Avoid spawning near player
* Move toward player using normalized vector

AI logic:

```
direction = player - enemy
enemy += normalized(direction) * speed
```

---

## Bullet System

* Created on SPACE press
* Moves in fixed direction
* Removed when out of world bounds
* Detects collision with enemies

---

## Powerups System

### Types:

* shield
* clone
* bomb
* freeze

### Behavior:

* Random spawn
* Collision pickup
* Temporary effects
* Timed expiration system

---

## Camera System

Camera follows player:

```javascript
camera.x = player.x - screenWidth / 2
camera.y = player.y - screenHeight / 2
```

Everything is rendered relative to camera.

---

# Game Loop

Main loop structure:

```
requestAnimationFrame → update → render → repeat
```

### Update includes:

* Movement
* Enemy AI
* Bullet movement
* Collision detection
* Powerup logic
* Effect timers

---

# Rendering System

### Render pipeline:

1. Clear screen
2. Draw grid
3. Draw player
4. Draw bullets
5. Draw enemies
6. Draw powerups
7. Draw UI

---

# UI System

Displays:

* Score
* Lives
* Kill count
* Enemy count
* Accuracy
* Powerup timers
* Freeze unlock status
* High score

---

# Game States

## Game Over

Triggers when:

```
lifes <= 0
```

Features:

* Stops gameplay
* Plays game over sound
* Saves high score

---

## Win Condition

Triggered when:

```
kills > threshold AND freeze activated AND enemies = 0
```

Displays:

```
You Won!!!
```

---

# Methods

## Core Methods

```javascript
start(thresholdValue)
resetRound()
gameloop(time)
update(dt, time)
render()
```

---

## Input System

```javascript
initInput()
onKeyDown(e)
onKeyUp(e)
```

---

## Spawning

```javascript
spawnEnemy()
spawnPowerup()
```

---

## Combat

```javascript
fire(x, y)
activate(type)
```

---

## Audio

```javascript
startBGM()
```

---

# Reset System

Resets:

* Enemies
* Bullets
* Powerups
* Score
* Lives
* Effects
* Player position

---

# Architecture Overview

```
Renderer
 ├── Input System
 ├── Update Loop
 │    ├── Player
 │    ├── Enemies
 │    ├── Bullets
 │    ├── Powerups
 │    └── Effects
 ├── Camera System
 ├── Render System
 └── Audio System
```

---

# Example

```javascript
const game = new Renderer("world", 3000, 3000, 3);

game.start(100);
```

---

# Performance Notes

* Uses requestAnimationFrame loop
* Efficient enemy and bullet cleanup
* Minimal DOM interaction
* Canvas-only rendering
