// ============================================================
//  DEAD BEFORE DAWN
//  You died on Halloween night. Your soul jumped into a pumpkin,
//  and now the Grim Reaper is chasing you.
//  Survive until sunrise to win!
// ============================================================


// ------------------------------------------------------------
// 1. SETTINGS - change these numbers to tune the game
// ------------------------------------------------------------
const SURVIVE_SECONDS = 60;   // how long until sunrise
const GRAVITY = 0.8;          // how fast you fall after jumping
const JUMP_POWER = 15;        // how high you jump
const NORMAL_SPEED = 5.5;       // your normal running speed
const MIN_SPEED = 3.5;        // slowest you can go
const MAX_SPEED = 9.5;          // fastest you can go
const TOFFEE_BOOST = 0.3;    // speed you gain from each toffee
const HIT_SLOWDOWN = 1.2;       // speed you lose when you hit an obstacle
const REAPER_SPEED = 5.7;     // the Reaper's starting speed (he gets faster over time)
const HIDE_SECONDS = 3;       // how long you hide in a pumpkin patch
const STUN_SECONDS = 2;       // how long the Lantern Bomb knocks the Reaper down


// ------------------------------------------------------------
// 2. CANVAS SETUP
// ------------------------------------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");   // ctx is our "paintbrush"
const FONT = '"Creepster", "Trebuchet MS", cursive';            // spooky font for most text
const FONT_TITLE = '"Nosifer", "Creepster", cursive';             // dripping-blood font for big titles   // the spooky font (loaded in index.html)
if (document.fonts) { document.fonts.load('24px "Creepster"'); document.fonts.load('24px "Nosifer"'); }   // make sure it is ready
const WIDTH = canvas.width;            // 900
const HEIGHT = canvas.height;          // 450
const GROUND = 380;                    // y position of the ground
const PLAYER_X = 380;                  // the pumpkin stays here - the world moves past it
const REAPER_MIN_X = 10;               // the Reaper never goes further left (always on screen)


// ------------------------------------------------------------
// 3. GAME VARIABLES
// ------------------------------------------------------------
let scene = "intro";     // which screen: "intro", "play", "gameover" or "win"
let introTimer = 0;      // counts frames in the intro (60 frames = 1 second)
let endTimer = 0;        // counts frames on the end screens

let frames = 0;          // frames since the chase started
let playerY, playerSpeedY, onGround;
let speed;               // your running speed
let toffees;             // how many toffees you collected
let hitCooldown;         // a short safe time after getting hit
let hideTimer;           // more than 0 while you are hiding
let hasBomb;             // true if you are holding a Lantern Bomb

let reaperX;             // where the Reaper is on screen
let reaperMode;          // "chasing", "searching" or "knockedDown"
let knockedDownTimer;    // how long he stays on the ground
let throwTimer;          // counts down to his next scythe throw
let warningTimer;        // the red "!" shown before a throw

let gameMode = "normal"; // "normal" (1 player) or "two" (2 players)
let reaperLift = 0;      // how high the Reaper floats (2 player mode)
let reaperLiftV = 0;     // his up/down speed
let scytheCooldown = 0;  // frames until Player 2 can throw a scythe again
const keys = {};         // which keys are being held down right now

let muted = false;       // sound on / off
let paused = false;      // game paused?
let particles = [];      // sparks, dust and floating words
let shake = 0;           // how much the screen is shaking
let flash = 0;           // lightning flash (1 = brightest)
let menuPick = 0;        // which menu button is highlighted
const mouse = { x: -100, y: -100 };   // where the mouse is on the canvas

let obstacles, toffeeList, patches, scythes, bombs;   // lists of things on screen
let obstacleTimer, toffeeTimer, patchTimer;           // count down to the next one
let message = "";
let messageTimer = 0;
let scroll = 0;          // how far the world has moved (used to move the hills)

// random stars for the night sky
const stars = [];
for (let i = 0; i < 80; i++) {
  stars.push({ x: Math.random() * WIDTH, y: Math.random() * 260 });
}

// reset everything and start the chase
function startGame(mode) {
  if (mode) gameMode = mode;   // "normal" or "two"
  paused = false;
  shake = 0;
  scene = "play";
  frames = 0;
  playerY = GROUND;
  playerSpeedY = 0;
  onGround = true;
  speed = NORMAL_SPEED;
  toffees = 0;
  hitCooldown = 0;
  hideTimer = 0;
  hasBomb = false;

  reaperX = REAPER_MIN_X;
  reaperMode = "chasing";
  knockedDownTimer = 0;
  throwTimer = 8 * 60;      // first scythe throw after about 8 seconds
  warningTimer = 0;
  reaperLift = 0;
  reaperLiftV = 0;
  scytheCooldown = 0;

  obstacles = [];
  toffeeList = [];
  patches = [];
  scythes = [];
  bombs = [];
  obstacleTimer = 90;
  toffeeTimer = 60;
  patchTimer = 6 * 60;      // first pumpkin patch after about 6 seconds
  messageTimer = 0;
  scroll = 0;
}


// ------------------------------------------------------------
// 4. CONTROLS
// ------------------------------------------------------------
document.addEventListener("keydown", function (event) {
  const gameKeys = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  if (gameKeys.includes(event.code)) event.preventDefault();   // stop the page scrolling
  keys[event.code] = true;                                     // remember the key is held down
  if (event.repeat) return;                                    // ignore keys being held down

  const wasMenu = scene === "menu";

  if (event.code === "KeyN") muted = !muted;                   // N = sound on / off

  // while paused only a few keys work
  if (paused) {
    if (event.code === "KeyP" || event.code === "Space") paused = false;
    else if (event.code === "KeyM") { paused = false; scene = "menu"; }
    else if (event.code === "KeyR") startGame();
    return;
  }
  if (event.code === "KeyP" && scene === "play") { paused = true; return; }

  // PLAYER 1 - the Pumpkin
  if (event.code === "Space") pressSpace();
  if (event.code === "KeyH") hide();
  if (event.code === "KeyT") throwBomb();

  // PLAYER 2 - the Reaper (two player mode only)
  if (event.code === "ArrowUp") reaperJump();
  if (event.code === "ArrowDown") throwScythe();

  // menu
  if (wasMenu) {
    if (event.code === "ArrowLeft") menuPick = 0;
    if (event.code === "ArrowRight") menuPick = 1;
    if (event.code === "Digit1" || event.code === "Numpad1") startGame("normal");
    if (event.code === "Digit2" || event.code === "Numpad2") startGame("two");
    if (event.code === "Enter" || event.code === "Space") startGame(MENU_BUTTONS[menuPick].mode);
  }
  if (event.code === "KeyM") scene = "menu";
  if (event.code === "KeyR" && (scene === "play" || scene === "gameover" || scene === "win")) startGame();
});

document.addEventListener("keyup", function (event) {
  keys[event.code] = false;
});

window.addEventListener("blur", function () {   // clicked away from the page: release keys and pause
  for (const k in keys) keys[k] = false;
  if (scene === "play") paused = true;
});

// ----- buttons you can click with the mouse -----
const MENU_BUTTONS = [
  { x: 230, y: 140, w: 200, h: 100, mode: "normal" },
  { x: 470, y: 140, w: 200, h: 100, mode: "two" }
];
const PAUSE_BTN = { x: WIDTH - 110, y: 78, w: 90, h: 30 };
const MUTE_BTN = { x: WIDTH - 110, y: 114, w: 90, h: 30 };

function overBtn(b) {   // is the mouse on this button?
  return mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h;
}

function setMouse(event) {   // turn the mouse position into canvas coordinates
  const box = canvas.getBoundingClientRect();
  mouse.x = (event.clientX - box.left) * WIDTH / box.width;
  mouse.y = (event.clientY - box.top) * HEIGHT / box.height;
}

canvas.addEventListener("mousemove", setMouse);
canvas.addEventListener("mouseleave", function () { mouse.x = -100; mouse.y = -100; });

canvas.addEventListener("mousedown", function (event) {
  setMouse(event);
  addBurst(mouse.x, mouse.y, "#ffb347", 14, 4);          // sparkles wherever you click

  if (overBtn(MUTE_BTN) && (scene === "menu" || scene === "play")) { muted = !muted; return; }
  if (scene === "menu") {
    for (const b of MENU_BUTTONS) if (overBtn(b)) startGame(b.mode);
    return;
  }
  if (scene === "play" && overBtn(PAUSE_BTN)) { paused = !paused; return; }
  if (paused) { paused = false; return; }
  pressSpace();   // clicking also works like SPACE
});

function pressSpace() {
  if (scene === "intro") scene = "menu";       // after the story, choose a mode
  else if (scene === "menu") return;           // in the menu press 1 or 2
  else if (scene === "play") jump();
  else if (endTimer > 45) startGame();         // play again (same mode)
}

// Player 2: the Reaper floats up (dodges Lantern Bombs!)
function reaperJump() {
  const canFloat = scene === "play" && gameMode === "two" && reaperMode === "chasing" && hideTimer === 0;
  if (canFloat && reaperLift === 0 && reaperLiftV === 0) {
    reaperLiftV = 9;
    beep(260, 0.1);
  }
}

// Player 2: the Reaper throws a scythe (then waits 4 seconds)
function throwScythe() {
  const canThrow = scene === "play" && gameMode === "two" && reaperMode === "chasing" && hideTimer === 0;
  if (canThrow && scytheCooldown === 0) {
    scythes.push({ x: reaperX + 80, angle: 0 });
    scytheCooldown = 4 * 60;
    beep(180, 0.25);
  }
}

function jump() {
  if (onGround && hideTimer === 0) {
    playerSpeedY = -JUMP_POWER;
    onGround = false;
    beep(520, 0.1);
    addBurst(PLAYER_X, GROUND, "#8a7a9a", 6, 2);   // dust
  }
}

function hide() {
  if (scene !== "play" || hideTimer > 0 || !onGround) return;

  for (const patch of patches) {
    const nearPatch = PLAYER_X > patch.x - 40 && PLAYER_X < patch.x + patch.width;
    if (nearPatch && !patch.used) {
      patch.used = true;
      hideTimer = HIDE_SECONDS * 60;
      if (reaperMode === "chasing") reaperMode = "searching";
      warningTimer = 0;
      scythes = [];

      if (!hasBomb) {
        hasBomb = true;
        showMessage("You found a LANTERN BOMB! Press T to throw it");
      } else {
        showMessage("Shhh... hiding...");
      }
      beep(300, 0.2);
      addBurst(PLAYER_X, GROUND - 20, "#c9b6ff", 20, 4);   // ghostly puff
    }
  }
}

function throwBomb() {
  if (scene === "play" && hasBomb) {
    hasBomb = false;
    bombs.push({ x: PLAYER_X - 20, y: playerY - 30 });
    beep(400, 0.15);
  }
}


// ------------------------------------------------------------
// 5. HELPER FUNCTIONS
// ------------------------------------------------------------

// ----- particles: sparks, dust, embers and floating words -----
function addBurst(x, y, color, count, power, g = 0.08) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 0.5 + Math.random() * power;
    particles.push({ x: x, y: y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1,
                     g: g, life: 25 + Math.random() * 25, max: 50, size: 2 + Math.random() * 3,
                     color: color, text: null });
  }
}

function addPopText(text, x, y, color) {
  particles.push({ x: x, y: y, vx: 0, vy: -1, g: 0, life: 45, max: 45, size: 0, color: color, text: text });
}

function addEmber() {   // a glowing ember floating up
  particles.push({ x: Math.random() * WIDTH, y: HEIGHT, vx: Math.random() * 0.6 - 0.3, vy: -0.5 - Math.random() * 1.2,
                   g: 0, life: 200, max: 200, size: 1 + Math.random() * 2, color: "#ff9a3c", text: null });
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.g;
    p.life--;
  }
  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life / p.max);
    if (p.text) {
      bigText(p.text, p.x, p.y, p.color, 22);
    } else {
      ctx.fillStyle = p.color;
      circle(p.x, p.y, p.size);
    }
  }
  ctx.globalAlpha = 1;
}
function random(min, max) {
  return min + Math.random() * (max - min);
}

// do two boxes overlap?
function touching(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function showMessage(text) {
  message = text;
  messageTimer = 120;   // show it for 2 seconds
}

// play a short beep sound
let audio = null;
function beep(frequency, seconds) {
  if (muted) return;
  if (!audio) audio = new AudioContext();
  const sound = audio.createOscillator();
  const volume = audio.createGain();
  sound.frequency.value = frequency;
  volume.gain.value = 0.05;
  sound.connect(volume);
  volume.connect(audio.destination);
  sound.start();
  sound.stop(audio.currentTime + seconds);
}


// ------------------------------------------------------------
// 6. UPDATE THE GAME (runs 60 times every second)
// ------------------------------------------------------------
function updateGame() {
  frames++;

  // the sun comes up - you win!
  if (frames >= SURVIVE_SECONDS * 60) {
    scene = "win";
    endTimer = 0;
    beep(880, 0.4);
    for (let i = 0; i < 4; i++) addBurst(random(200, 700), random(60, 200), "#ffe14d", 30, 6);
    return;
  }

  if (hideTimer > 0) {
    // HIDING: the world stops and the Reaper searches for you
    hideTimer--;
    if (hideTimer === 0) {
      if (reaperMode === "searching") reaperMode = "chasing";
      showMessage("RUN!");
    }
  } else {
    // RUNNING
    updateSpeed();
    updateJump();
    spawnThings();
    moveThings();
    checkHits();
    collectToffees();

    if (frames % 4 === 0 && onGround) addBurst(PLAYER_X - 14, GROUND - 3, "#ff7f1f", 1, 1.5);   // spark trail
    if (Math.random() < 0.06) addEmber();
    if (Math.random() < 0.0012) { flash = 1; beep(70, 0.4); }                                   // lightning!
  }

  updateReaper();
  updateBombs();
  if (hitCooldown > 0) hitCooldown--;
  if (messageTimer > 0) messageTimer--;

  // did the Reaper catch you?
  if (reaperMode === "chasing" && reaperX + 75 >= PLAYER_X - 16) {
    scene = "gameover";
    endTimer = 0;
    beep(90, 0.6);
    shake = 18;
    flash = 1;
    addBurst(PLAYER_X, GROUND - 30, "#ff4040", 40, 8);
  }
}

function updateSpeed() {
  // your speed slowly goes back to normal
  if (speed > NORMAL_SPEED) speed -= 0.008;
  if (speed < NORMAL_SPEED) speed += 0.012;
}

function updateJump() {
  playerSpeedY += GRAVITY;      // gravity pulls you down
  playerY += playerSpeedY;
  if (playerY >= GROUND) {      // landed
    playerY = GROUND;
    playerSpeedY = 0;
    onGround = true;
  }
}

function spawnThings() {
  obstacleTimer--;
  if (obstacleTimer <= 0) {
    addObstacle();
    obstacleTimer = random(80, 160);   // a bit more time between obstacles now that you run slower
  }

  toffeeTimer--;
  if (toffeeTimer <= 0) {
    addToffees();
    toffeeTimer = random(100, 170);
  }

  patchTimer--;
  if (patchTimer <= 0) {
    patches.push({ x: WIDTH + 40, width: 180, used: false });
    obstacleTimer = Math.max(obstacleTimer, 120);  // no obstacles right next to the patch
    patchTimer = random(12, 16) * 60;              // next patch in 12-16 seconds
  }
}

function addObstacle() {
  const pick = Math.random();
  if (pick < 0.45) {
    obstacles.push({ type: "gravestone", x: WIDTH, width: 34, height: random(30, 60) });
  } else if (pick < 0.75) {
    obstacles.push({ type: "grave", x: WIDTH, width: random(55, 80) });
  } else {
    obstacles.push({ type: "bat", x: WIDTH, width: 40 });   // bats fly high - don't jump!
  }
}

function addToffees() {
  const high = Math.random() < 0.4;          // some toffees float high - jump for them
  const y = high ? GROUND - 110 : GROUND - 25;
  const count = Math.floor(random(3, 6));    // 3 to 5 toffees in a row
  for (let i = 0; i < count; i++) {
    toffeeList.push({ x: WIDTH + i * 38, y: y, taken: false });
  }
}

function moveThings() {
  scroll += speed;
  for (const o of obstacles) {
    o.x -= speed;
    if (o.type === "bat") o.x -= 1;      // bats fly towards you a bit faster
  }
  for (const t of toffeeList) t.x -= speed;
  for (const p of patches) p.x -= speed;
  for (const s of scythes) {
    s.x += 5;          // scythes fly to the right, towards you
    s.angle += 0.25;   // and spin
  }

  // remove things that have left the screen
  obstacles = obstacles.filter(o => o.x > -100);
  toffeeList = toffeeList.filter(t => t.x > -30 && !t.taken);
  patches = patches.filter(p => p.x > -200);
  scythes = scythes.filter(s => s.x < WIDTH + 40);
}

function checkHits() {
  // the pumpkin's "hit box"
  const me = { x: PLAYER_X - 16, y: playerY - 36, w: 32, h: 34 };

  for (const o of obstacles) {
    let hit = false;
    if (o.type === "gravestone") {
      hit = touching(me, { x: o.x + 4, y: GROUND - o.height, w: o.width - 8, h: o.height });
    }
    if (o.type === "bat") {
      hit = touching(me, { x: o.x + 6, y: GROUND - 115, w: o.width - 12, h: 20 });
    }
    if (o.type === "grave") {
      hit = onGround && PLAYER_X > o.x + 10 && PLAYER_X < o.x + o.width - 10;
    }
    if (hit) getHit();
  }

  for (const s of scythes) {
    if (touching(me, { x: s.x - 16, y: GROUND - 38, w: 32, h: 32 })) getHit();
  }
}

function getHit() {
  if (hitCooldown > 0) return;
  speed = Math.max(MIN_SPEED, speed - HIT_SLOWDOWN);   // you slow down
  reaperX += 30;                                       // and the Reaper gets closer
  hitCooldown = 60;                                    // 1 second before you can be hit again
  showMessage("OUCH! Slowed down!");
  shake = 10;
  addBurst(PLAYER_X, playerY - 20, "#ff7a1a", 18, 5);
  beep(110, 0.3);
}

function collectToffees() {
  for (const t of toffeeList) {
    const close = Math.abs(t.x - PLAYER_X) < 24 && Math.abs(t.y - (playerY - 20)) < 28;
    if (close && !t.taken) {
      t.taken = true;
      toffees++;
      speed = Math.min(MAX_SPEED, speed + TOFFEE_BOOST);   // toffee = more speed!
      beep(880, 0.05);
      addBurst(t.x, t.y, "#ffd84f", 8, 3);
      addPopText("YUM!", t.x, t.y - 20, "#ffe14d");
    }
  }
}

function updateReaper() {
  if (reaperMode === "chasing") {
    // The Reaper gets faster as dawn gets closer.
    // If he is faster than you, he moves closer. If you are faster, he falls behind.
    const reaperSpeed = REAPER_SPEED + frames / 4000;
    if (gameMode === "two") {
      // PLAYER 2 steers the Reaper with the arrow keys
      if (keys.ArrowRight) reaperX += (reaperSpeed + 1.2 - speed) * 0.6;   // chase harder
      else if (keys.ArrowLeft) reaperX -= 2;                                // back off
      else reaperX += (reaperSpeed - speed) * 0.6;                          // normal drift
    } else {
      // the computer steers the Reaper
      reaperX += (reaperSpeed - speed) * 0.6;
      updateScytheThrow();
    }
  }

  if (reaperMode === "knockedDown") {
    knockedDownTimer--;
    reaperX -= 1.6;   // you get away while he is on the ground
    if (knockedDownTimer <= 0) {
      if (hideTimer > 0) reaperMode = "searching";
      else reaperMode = "chasing";
    }
  }

  // keep the Reaper on the screen
  if (reaperX < REAPER_MIN_X) reaperX = REAPER_MIN_X;

  // the Reaper floating up and coming back down
  if (reaperLift > 0 || reaperLiftV > 0) {
    reaperLift += reaperLiftV;
    reaperLiftV -= 0.45;
    if (reaperLift <= 0) { reaperLift = 0; reaperLiftV = 0; }
  }
  if (scytheCooldown > 0) scytheCooldown--;
}

function updateScytheThrow() {
  // the red "!" warning is showing - throw when it ends
  if (warningTimer > 0) {
    warningTimer--;
    if (warningTimer === 0) {
      if (roadIsClear()) {
        scythes.push({ x: reaperX + 80, angle: 0 });
        throwTimer = random(6, 10) * 60;   // next throw in 6-10 seconds
        beep(180, 0.25);
      } else {
        throwTimer = 20;                   // an obstacle appeared - cancel, try again soon
      }
    }
    return;
  }

  throwTimer--;
  if (throwTimer <= 0) {
    if (roadIsClear()) warningTimer = 45;  // show "!" for 45 frames, then throw
    else throwTimer = 20;
  }
}

// the Reaper only throws when there is no obstacle near you
function roadIsClear() {
  for (const o of obstacles) {
    if (o.x + o.width > PLAYER_X - 80 && o.x < PLAYER_X + 320) return false;
  }
  return true;
}

function updateBombs() {
  for (const b of bombs) {
    b.x -= 8;   // the bomb flies left, towards the Reaper
    if (b.x < reaperX + 75 && b.x > reaperX && reaperLift < 50 && reaperMode !== "knockedDown") {
      b.used = true;
      reaperMode = "knockedDown";
      knockedDownTimer = STUN_SECONDS * 60;
      showMessage("REAPER DOWN! 2 second head start!");
      shake = 14;
      addBurst(reaperX + 60, GROUND - 40, "#ffe98a", 30, 7);
      beep(200, 0.4);
    }
  }
  bombs = bombs.filter(b => !b.used && b.x > -40);
}

function patchIsNear() {
  for (const p of patches) {
    if (!p.used && p.x < PLAYER_X + 220 && p.x + p.width > PLAYER_X - 40) return true;
  }
  return false;
}


// ------------------------------------------------------------
// 7. DRAW THE GAME
// ------------------------------------------------------------
function drawGame() {
  const progress = frames / (SURVIVE_SECONDS * 60);   // 0 = midnight, 1 = sunrise
  drawSky(progress);
  drawGround();

  for (const p of patches) drawPatch(p);
  for (const o of obstacles) {
    if (o.type === "gravestone") drawGravestone(o.x, o.height, o.width);
    if (o.type === "grave") drawGrave(o.x, o.width);
    if (o.type === "bat") drawBat(o.x);
  }
  for (const t of toffeeList) drawToffee(t.x, t.y);
  for (const s of scythes) drawScythe(s.x, GROUND - 22, s.angle);
  for (const b of bombs) drawLantern(b.x, b.y);

  // the Reaper
  if (reaperMode === "knockedDown") {
    drawReaper(reaperX, { fallen: true });
  } else {
    drawReaper(reaperX, { scythe: true, lift: reaperLift });
  }
  if (reaperMode === "searching") speechBubble("Where did you go...?", reaperX + 50, GROUND - 145);
  if (warningTimer > 0) bigText("!", reaperX + 40, GROUND - 160, "red", 40);

  // the pumpkin: blinks after a hit, face turns off while hiding (so you blend in!)
  const blinking = hitCooldown > 0 && Math.floor(hitCooldown / 5) % 2 === 1;
  if (!blinking) drawPumpkin(PLAYER_X, playerY, hideTimer === 0);

  if (hideTimer > 0) {
    smallText("hiding " + Math.ceil(hideTimer / 60) + "...", PLAYER_X, GROUND - 85);
  } else if (patchIsNear() && Math.floor(frames / 8) % 2 === 0) {
    bigText("Press H!", PLAYER_X, playerY - 70, "#ffe14d", 26);
  }

  drawHUD();
}

function drawHUD() {
  const secondsLeft = Math.ceil(SURVIVE_SECONDS - frames / 60);
  hudText("🍬 Toffees: " + toffees, 20, 35, "left");
  hudText("Speed: " + speed.toFixed(1), 20, 62, "left");
  hudText("☀️ Sunrise in " + secondsLeft + "s", WIDTH - 20, 35, "right");
  if (hasBomb) hudText("🏮 Lantern Bomb: press T", 20, 89, "left");

  // danger bar: fuller = the Reaper is closer
  const maxGap = (PLAYER_X - 16) - (REAPER_MIN_X + 75);
  const gap = (PLAYER_X - 16) - (reaperX + 75);
  const danger = Math.min(1, Math.max(0, 1 - gap / maxGap));
  if (danger > 0.7) {   // the screen pulses red when the Reaper is close
    ctx.fillStyle = "rgba(255, 0, 0, " + (0.1 + 0.07 * Math.sin(Date.now() / 120)) + ")";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(350, 18, 200, 18);
  if (danger > 0.7) ctx.fillStyle = "red";
  else if (danger > 0.4) ctx.fillStyle = "orange";
  else ctx.fillStyle = "limegreen";
  ctx.fillRect(350, 18, 200 * danger, 18);
  ctx.strokeStyle = "white";
  ctx.strokeRect(350, 18, 200, 18);
  hudText("💀 REAPER DANGER", 450, 54, "center", 16);

  if (gameMode === "two") {
    if (scytheCooldown === 0) hudText("Reaper scythe: READY (Down)", WIDTH - 20, 62, "right", 22);
    else hudText("Reaper scythe: " + Math.ceil(scytheCooldown / 60) + "s", WIDTH - 20, 62, "right", 22);
    smallText("PUMPKIN:  SPACE jump · H hide · T bomb", 250, HEIGHT - 12);
    smallText("REAPER:  ← → move · ↑ float · ↓ scythe", 650, HEIGHT - 12);
  } else {
    smallText("SPACE jump · H hide · T bomb", WIDTH / 2, HEIGHT - 12);
  }

  drawSmallButton(PAUSE_BTN, "PAUSE");
  drawSmallButton(MUTE_BTN, muted ? "MUTED" : "SOUND");

  if (messageTimer > 0) bigText(message, WIDTH / 2, 150, "#ffe14d", 28);
}


// ------------------------------------------------------------
// 8. THE INTRO STORY  (t counts frames: 60 = 1 second)
// ------------------------------------------------------------
function updateIntro() {
  introTimer++;
  const t = introTimer;

  drawSky(0);
  drawGround();

  // the scene: mourners, your grave, your body and the Reaper
  drawPerson(220);
  drawPerson(600);
  drawPerson(645);
  drawGravestone(510, 70, 40);
  drawBody(400);
  drawReaper(270, { scythe: t > 660 });     // he takes out his scythe after 11 seconds
  drawPumpkin(790, GROUND, t > 400);        // the jack-o'-lantern lights up

  // your ghost rises out of your body...
  if (t > 60 && t < 580) {
    let ghostX = 440;
    let ghostY = GROUND - 10 - Math.min(110, (t - 60) * 1.2);
    let ghostSize = 1;

    // ...then gets sucked into the jack-o'-lantern
    if (t > 470) {
      const k = (t - 470) / 110;            // goes from 0 to 1
      ghostX = 440 + 350 * k * k;
      ghostY = 260 + 95 * k * k;
      ghostSize = 1 - 0.9 * k;
    }
    drawGhost(ghostX, ghostY, ghostSize);

    if (t > 170 && t < 270) speechBubble("Wait... is that ME?!", ghostX, ghostY - 60);
    if (t > 400 && t < 470) speechBubble("A jack-o'-lantern...?", ghostX, ghostY - 60);
    if (t > 480) speechBubble("WHOAAA!", ghostX, ghostY - 50);
  }

  if (t < 140) bigText("Halloween night...", WIDTH / 2, 110, "#ffb347", 36);
  if (t > 20 && t < 260) smallText("*sniff*", 622, GROUND - 90);
  if (t > 280 && t < 390) speechBubble("Your time is up.", 310, GROUND - 145);
  if (t > 590 && t < 660) speechBubble("I'm... a PUMPKIN?!", 790, GROUND - 60);
  if (t > 665 && t < 760) speechBubble("You can't escape me!", 310, GROUND - 165);
  if (t > 740) bigText("Press SPACE to choose a mode", WIDTH / 2, 110, "#ff7a1a", 36);
  if (t < 740) smallText("SPACE to skip", WIDTH - 70, HEIGHT - 15);
}


// ------------------------------------------------------------
// 9. END SCREENS
// ------------------------------------------------------------
function drawButton(b, title, desc, size, hot) {
  // a big menu button that glows and grows when you point at it
  const pulse = hot ? 1 + Math.sin(Date.now() / 150) * 0.02 : 1;
  ctx.save();
  ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
  ctx.scale((hot ? 1.1 : 1) * pulse, (hot ? 1.1 : 1) * pulse);
  ctx.shadowColor = "#ff7a1a";
  ctx.shadowBlur = hot ? 25 : 0;
  ctx.fillStyle = hot ? "rgba(90, 30, 0, 0.85)" : "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
  ctx.strokeStyle = hot ? "#ffe14d" : "#ff7a1a";
  ctx.lineWidth = 3;
  ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
  ctx.shadowBlur = 0;
  bigText(title, 0, -5, "#ffe14d", size);
  smallText(desc, 0, 25);
  ctx.restore();
  if (hot && Math.random() < 0.25) addBurst(b.x + Math.random() * b.w, b.y, "#ff7a1a", 1, 1.2, -0.02);
}

function drawSmallButton(b, label) {
  const hot = overBtn(b);
  ctx.fillStyle = hot ? "rgba(255, 122, 26, 0.9)" : "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = hot ? "#ffe14d" : "#ff7a1a";
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  smallText(label, b.x + b.w / 2, b.y + b.h / 2 + 6);
}

function drawPause() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  bigText("PAUSED", WIDTH / 2, 190, "#ff7a1a", 64);
  bigText("Click or press P to resume", WIDTH / 2, 245, "white", 26);
  bigText("M = menu  ·  R = restart  ·  N = sound", WIDTH / 2, 290, "#ffe14d", 22);
}

function drawMenu() {
  drawSky(0);
  drawGround();
  if (Math.random() < 0.2) addEmber();
  drawReaper(20, { scythe: true });
  drawPumpkin(820, GROUND, true);

  ctx.globalAlpha = Math.random() < 0.04 ? 0.5 : 1;   // the title flickers like a bad light
  bigText("DEAD BEFORE DAWN", WIDTH / 2, 85, "#ff7a1a", 40, FONT_TITLE);
  ctx.globalAlpha = 1;

  for (let i = 0; i < MENU_BUTTONS.length; i++) {
    if (overBtn(MENU_BUTTONS[i])) menuPick = i;
  }
  drawButton(MENU_BUTTONS[0], "1 · NORMAL", "1 player vs the Reaper", 26, menuPick === 0);
  drawButton(MENU_BUTTONS[1], "2 · TWO PLAYER", "Pumpkin vs Reaper", 24, menuPick === 1);

  smallText("PUMPKIN (Player 1):  SPACE jump  ·  H hide in pumpkins  ·  T throw Lantern Bomb", WIDTH / 2, 290);
  smallText("REAPER (Player 2):  ← → move  ·  ↑ float (dodge bombs)  ·  ↓ throw scythe", WIDTH / 2, 315);
  smallText("Click a button, press 1 or 2, or use ← → and ENTER", WIDTH / 2, 350);
  drawSmallButton(MUTE_BTN, muted ? "MUTED" : "SOUND ON");
}

function drawGameOver() {
  endTimer++;
  drawSky(frames / (SURVIVE_SECONDS * 60));
  drawGround();
  drawReaper(PLAYER_X - 90, { scythe: true });
  drawGhost(PLAYER_X + 40, GROUND - 40 - Math.min(40, endTimer), 1);

  ctx.fillStyle = "rgba(120, 0, 0, 0.4)";   // red tint
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  bigText(gameMode === "two" ? "REAPER WINS!" : "THE REAPER GOT YOU", WIDTH / 2, 120, "#ff4040", 36, FONT_TITLE);
  bigText("Toffees: " + toffees + "   Survived: " + Math.floor(frames / 60) + "s", WIDTH / 2, 170, "white", 24);
  if (endTimer > 45) bigText("Press SPACE to try again", WIDTH / 2, 215, "#ffb347", 26);
  if (endTimer > 45) bigText("Press M for the menu", WIDTH / 2, 255, "white", 20);
}

function drawWin() {
  endTimer++;
  if (endTimer % 30 === 1) addBurst(random(150, 750), random(60, 200), ["#ffe14d", "#ff7a1a", "#ff4040", "#9aff9a"][Math.floor(random(0, 4))], 28, 6);   // fireworks
  drawSky(1);
  drawGround();

  // the Reaper fades away
  if (endTimer < 120) {
    ctx.globalAlpha = 1 - endTimer / 120;
    drawReaper(80, { scythe: true });
    ctx.globalAlpha = 1;
    speechBubble("Next year...", 130, GROUND - 145);
  }

  drawPumpkin(PLAYER_X, GROUND, true);
  bigText(gameMode === "two" ? "PUMPKIN WINS! DAWN IS HERE!" : "YOU SURVIVED UNTIL DAWN!", WIDTH / 2, 140, "#ffe14d", 46);
  bigText("Toffees: " + toffees, WIDTH / 2, 195, "white", 28);
  if (endTimer > 45) bigText("Press SPACE to play again", WIDTH / 2, 250, "#ff7a1a", 26);
  if (endTimer > 45) bigText("Press M for the menu", WIDTH / 2, 290, "white", 20);
}


// ------------------------------------------------------------
// 10. DRAWING THE WORLD
// ------------------------------------------------------------
function drawSky(progress) {
  // night sky
  ctx.fillStyle = "#1a0f2e";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // sunrise colours fade in as dawn gets closer
  ctx.globalAlpha = progress;
  const dawn = ctx.createLinearGradient(0, 0, 0, GROUND);
  dawn.addColorStop(0, "#5a6ebe");
  dawn.addColorStop(1, "#ffaa6e");
  ctx.fillStyle = dawn;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.globalAlpha = 1;

  // stars fade out
  ctx.fillStyle = "rgba(255, 255, 255, " + (1 - progress) + ")";
  for (const s of stars) ctx.fillRect(s.x, s.y, 2, 2);

  // the moon sinks and the sun rises
  ctx.fillStyle = "#f5f0d2";
  circle(720, 80 + progress * 260, 36);
  if (progress > 0.6) {
    ctx.fillStyle = "#ffd25e";
    circle(180, GROUND + 60 - (progress - 0.6) * 250, 45);
  }
}

function drawGround() {
  // hills in the background (they move slowly)
  ctx.fillStyle = "#1e0e2c";
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  for (let x = 0; x <= WIDTH; x += 10) {
    ctx.lineTo(x, GROUND - 50 - Math.sin((x + scroll * 0.3) / 80) * 20);
  }
  ctx.lineTo(WIDTH, GROUND);
  ctx.fill();

  // the ground and grass
  ctx.fillStyle = "#140b1c";
  ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
  ctx.fillStyle = "#2e4a24";
  ctx.fillRect(0, GROUND, WIDTH, 5);
}


// ------------------------------------------------------------
// 11. DRAWING THE CHARACTERS
//     (Art teammate: change the colours and shapes here!)
// ------------------------------------------------------------
function drawPumpkin(x, y, faceOn, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = "#d85a0b";
  ellipse(-12, -20, 14, 20);              // left side
  ellipse(12, -20, 14, 20);               // right side
  ctx.fillStyle = "#ff7f1f";
  ellipse(0, -20, 16, 21);                // middle
  ctx.fillStyle = "#3f7a2a";
  ctx.fillRect(-3, -48, 6, 10);           // stem
  if (faceOn) {
    ctx.fillStyle = "#ffe14d";
    triangle(-12, -26, -4, -26, -8, -33); // left eye
    triangle(12, -26, 4, -26, 8, -33);    // right eye
    ctx.fillRect(-10, -15, 20, 6);        // mouth
  }
  ctx.restore();
}

function drawGhost(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = "rgba(235, 240, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(0, -30, 22, Math.PI, 0);        // round head
  ctx.lineTo(22, 0);                      // zig-zag bottom
  ctx.lineTo(11, -8);
  ctx.lineTo(0, 0);
  ctx.lineTo(-11, -8);
  ctx.lineTo(-22, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#222";
  ellipse(-8, -32, 4, 6);                 // eyes
  ellipse(8, -32, 4, 6);
  ellipse(0, -18, 5, 7);                  // mouth
  ctx.restore();
}

function drawReaper(x, options) {
  ctx.save();
  const float = Math.sin(Date.now() / 250) * 5;     // he floats up and down
  ctx.translate(x + 40, GROUND - 10 + float - (options.lift || 0));
  if (options.fallen) {                             // knocked down: lie flat
    ctx.translate(0, -20 - float);
    ctx.rotate(Math.PI / 2);
  }

  if (options.scythe) {
    ctx.strokeStyle = "#6b4a2b";                    // handle
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(30, -120);
    ctx.stroke();
    ctx.fillStyle = "#cfd6e0";                      // blade
    ctx.beginPath();
    ctx.moveTo(30, -120);
    ctx.quadraticCurveTo(80, -135, 95, -90);
    ctx.quadraticCurveTo(70, -115, 30, -108);
    ctx.fill();
  }

  ctx.fillStyle = "#15101c";                        // black cloak
  ctx.beginPath();
  ctx.moveTo(-35, 0);
  ctx.quadraticCurveTo(-30, -60, -18, -95);
  ctx.quadraticCurveTo(0, -125, 18, -95);
  ctx.quadraticCurveTo(30, -60, 35, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "black";
  ellipse(2, -90, 13, 16);                          // dark face
  ctx.fillStyle = options.fallen ? "gray" : "red";
  circle(-3, -92, 3);                               // eyes
  circle(7, -92, 3);
  ctx.restore();

  if (options.fallen) bigText("★ ★ ★", x + 130, GROUND - 50, "#ffe14d", 18);   // dizzy stars
}

function drawPerson(x) {
  // a mourner at the funeral
  ctx.fillStyle = "#2b2b3a";
  ctx.beginPath();
  ctx.moveTo(x - 16, GROUND);
  ctx.lineTo(x - 11, GROUND - 55);
  ctx.lineTo(x + 11, GROUND - 55);
  ctx.lineTo(x + 16, GROUND);
  ctx.fill();
  ctx.fillStyle = "#b89478";
  circle(x + 3, GROUND - 61, 10);          // head (bowed)
}

function drawBody(x) {
  // your body lying on the ground
  ctx.fillStyle = "#6a7bb0";
  ctx.fillRect(x, GROUND - 14, 70, 14);
  ctx.fillStyle = "#c9a98a";
  circle(x + 82, GROUND - 10, 11);
}

function drawPatch(p) {
  // a group of pumpkins you can hide in
  drawPumpkin(p.x + 20, GROUND, false, 0.8);
  drawPumpkin(p.x + 62, GROUND, false, 1);
  drawPumpkin(p.x + 118, GROUND, false, 0.9);
  drawPumpkin(p.x + 160, GROUND, false, 0.75);
  if (!p.used) smallText("HIDE HERE", p.x + p.width / 2, GROUND - 62);
}


// ------------------------------------------------------------
// 12. DRAWING OBSTACLES AND ITEMS
// ------------------------------------------------------------
function drawGravestone(x, height, width) {
  ctx.fillStyle = "#7d7f8c";
  ctx.fillRect(x, GROUND - height + width / 2, width, height - width / 2);
  circle(x + width / 2, GROUND - height + width / 2, width / 2);   // round top
  ctx.fillStyle = "#4e505c";
  ctx.font = "14px " + FONT;
  ctx.textAlign = "center";
  ctx.fillText("RIP", x + width / 2, GROUND - height + width / 2 + 6);
}

function drawGrave(x, width) {
  // an open grave - a hole in the ground
  ctx.fillStyle = "#4a3324";
  ellipse(x + width + 12, GROUND, 22, 12);   // pile of dirt
  ctx.fillStyle = "#050208";
  ctx.fillRect(x, GROUND, width, 40);        // the hole
}

function drawBat(x) {
  const flap = Math.sin(Date.now() / 60) * 8;   // wings flap up and down
  const y = GROUND - 105;
  ctx.fillStyle = "#1b1022";
  triangle(x + 20, y, x, y - 8 - flap, x + 8, y + 6);         // left wing
  triangle(x + 20, y, x + 40, y - 8 - flap, x + 32, y + 6);   // right wing
  circle(x + 20, y + 2, 7);                                   // body
  ctx.fillStyle = "red";
  circle(x + 17, y + 1, 1.6);                                 // eyes
  circle(x + 23, y + 1, 1.6);
}

function drawToffee(x, y) {
  ctx.fillStyle = "#ffd84f";
  triangle(x - 7, y, x - 16, y - 7, x - 16, y + 7);   // wrapper ends
  triangle(x + 7, y, x + 16, y - 7, x + 16, y + 7);
  ctx.fillStyle = "#a0612b";
  ctx.fillRect(x - 9, y - 7, 18, 14);                 // toffee
}

function drawScythe(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = "#6b4a2b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.stroke();
  ctx.fillStyle = "#cfd6e0";
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.quadraticCurveTo(30, -25, 5, -28);
  ctx.quadraticCurveTo(22, -18, 14, 0);
  ctx.fill();
  ctx.restore();
}

function drawLantern(x, y) {
  ctx.fillStyle = "#ffe98a";
  ctx.fillRect(x - 8, y - 10, 16, 20);   // glowing glass
  ctx.fillStyle = "#3b2a1a";
  ctx.fillRect(x - 9, y - 13, 18, 4);    // top
  ctx.fillRect(x - 9, y + 9, 18, 4);     // bottom
}


// ------------------------------------------------------------
// 13. SHAPE AND TEXT HELPERS
// ------------------------------------------------------------
function circle(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ellipse(x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function triangle(x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.fill();
}

function bigText(text, x, y, color, size, font = FONT) {
  ctx.font = size + "px " + font;
  ctx.textAlign = "center";
  ctx.shadowColor = color;      // spooky glow
  ctx.shadowBlur = 14;
  ctx.lineWidth = 6;
  ctx.strokeStyle = "black";
  ctx.strokeText(text, x, y);   // black outline
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

function smallText(text, x, y) {
  ctx.font = "18px " + FONT;
  ctx.textAlign = "center";
  ctx.fillStyle = "#e0e0ff";
  ctx.fillText(text, x, y);
}

function hudText(text, x, y, align, size = 24) {
  ctx.font = size + "px " + FONT;
  ctx.textAlign = align;
  ctx.fillStyle = "white";
  ctx.fillText(text, x, y);
}

function speechBubble(text, x, y) {
  ctx.font = "22px " + FONT;
  const w = ctx.measureText(text).width + 24;
  ctx.fillStyle = "white";
  ctx.fillRect(x - w / 2, y - 38, w, 32);
  triangle(x - 8, y - 6, x + 8, y - 6, x, y + 6);   // little pointer
  ctx.fillStyle = "#222";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y - 16);
}


// ------------------------------------------------------------
// 14. THE GAME LOOP - always runs at 60 steps per second
//     (on fast screens, e.g. 120/144 Hz, the old loop ran
//      the game too fast. Now it is capped at 60.)
// ------------------------------------------------------------
const STEP_MS = 1000 / 60;   // how long one game step should take
let lastTime = 0;
let leftover = 0;

function oneStep() {
  ctx.save();
  if (shake > 0) {   // screen shake
    ctx.translate(random(-shake, shake), random(-shake, shake));
    shake *= 0.9;
    if (shake < 0.5) shake = 0;
  }

  if (scene === "intro") {
    updateIntro();
  } else if (scene === "menu") {
    drawMenu();
  } else if (scene === "play") {
    if (!paused) updateGame();
    drawGame();
  } else if (scene === "gameover") {
    drawGameOver();
  } else if (scene === "win") {
    drawWin();
  }

  if (!paused) updateParticles();
  drawParticles();
  if (paused && scene === "play") drawPause();
  ctx.restore();

  if (flash > 0.02) {   // lightning flash
    ctx.fillStyle = "rgba(255, 255, 255, " + flash * 0.4 + ")";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    flash *= 0.88;
  }

  // the mouse turns into a hand when it is on a button
  let hand = false;
  if (scene === "menu") hand = MENU_BUTTONS.some(overBtn) || overBtn(MUTE_BTN);
  if (scene === "play") hand = overBtn(PAUSE_BTN) || overBtn(MUTE_BTN);
  canvas.style.cursor = hand ? "pointer" : "default";
}

function gameLoop(now) {
  if (!lastTime) lastTime = now;
  leftover += Math.min(now - lastTime, 100);   // time since the last frame
  lastTime = now;

  // do one game step for every 1/60th of a second that has passed
  while (leftover >= STEP_MS - 0.5) {
    oneStep();
    leftover -= STEP_MS;
  }

  requestAnimationFrame(gameLoop);   // run again on the next frame
}

requestAnimationFrame(gameLoop);   // start!
