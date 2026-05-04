let cat, cheese, mouse;

const W = 660;
const H = 420;

const PILLAR_SIZE = 35;

const MOUSE_RADIUS = 26;
const CAT_RADIUS = 32;
const CHEESE_RADIUS = 22;

const MOUSE_W = 95;
const MOUSE_H = 65;

const CAT_W = 115;
const CAT_H = 80;

const CHEESE_W = 60;
const CHEESE_H = 45;

const GRID = 22;

let playerMouse = { x: W / 2, y: H / 2 };

let mouseObj;
let catObj;
let cheeseObj;

let lives = 3;
let score = 0;
let level = 1;
let gameOver = false;

let catPath = [];
let pathTimer = 0;

const pillars = [
  { x: 130, y: 130 },
  { x: 330, y: 130 },
  { x: 530, y: 130 },
  { x: 230, y: 270 },
  { x: 430, y: 270 },
  { x: 130, y: 360 },
  { x: 530, y: 360 }
];

function preload() {
  cat = loadImage("cat.png");
  cheese = loadImage("cheese.png");
  mouse = loadImage("mouse.png");
}

function setup() {
  createCanvas(W, H);
  noCursor();
  startGame();
}

function draw() {
  background("#2d2205");

  if (!gameOver) {
    moveMouse();
    moveCatSmart();
    checkCheese();
    checkCaught();
  }

  drawPillars();
  drawCheese();
  drawMouse();
  drawCat();
  drawUI();

  if (gameOver) drawGameOver();
}

function startGame() {
  lives = 3;
  score = 0;
  level = 1;
  gameOver = false;

  mouseObj = {
    x: W / 2,
    y: H / 2
  };

  catObj = {
    x: 60,
    y: 60,
    angle: 0,
    speed: 2.1
  };

  spawnCheese();
  loop();
}

function mouseMoved() {
  playerMouse.x = mouseX;
  playerMouse.y = mouseY;
}

function mouseDragged() {
  playerMouse.x = mouseX;
  playerMouse.y = mouseY;
}

function mousePressed() {
  playerMouse.x = mouseX;
  playerMouse.y = mouseY;

  if (gameOver) startGame();
}

function keyPressed() {
  if (key === " " && gameOver) startGame();
}

function spawnCheese() {
  let safe = false;

  while (!safe) {
    cheeseObj = {
      x: random(80, W - 80),
      y: random(70, H - 70)
    };

    safe = !hitsAnyPillar(cheeseObj.x, cheeseObj.y, CHEESE_RADIUS);
  }
}

function moveMouse() {
  let dx = playerMouse.x - mouseObj.x;
  let dy = playerMouse.y - mouseObj.y;
  let d = sqrt(dx * dx + dy * dy);

  if (d > 2) {
    let stepX = dx / d * 3.6;
    let stepY = dy / d * 3.6;
    moveEntity(mouseObj, stepX, stepY, MOUSE_RADIUS);
  }
}

function moveCatSmart() {
  pathTimer--;

  if (pathTimer <= 0) {
    catPath = findPath(catObj.x, catObj.y, mouseObj.x, mouseObj.y);
    pathTimer = 12;
  }

  let target = mouseObj;

  if (catPath.length > 1) {
    target = catPath[1];
  }

  let dx = target.x - catObj.x;
  let dy = target.y - catObj.y;
  let d = sqrt(dx * dx + dy * dy);

  if (d > 1) {
    let stepX = dx / d * catObj.speed;
    let stepY = dy / d * catObj.speed;
    moveEntity(catObj, stepX, stepY, CAT_RADIUS);
  }

  catObj.angle = atan2(mouseObj.y - catObj.y, mouseObj.x - catObj.x);
}

function moveEntity(obj, stepX, stepY, radius) {
  let newX = constrain(obj.x + stepX, radius, W - radius);

  if (!hitsAnyPillar(newX, obj.y, radius)) {
    obj.x = newX;
  }

  let newY = constrain(obj.y + stepY, radius, H - radius);

  if (!hitsAnyPillar(obj.x, newY, radius)) {
    obj.y = newY;
  }
}

function hitsAnyPillar(x, y, radius) {
  for (let p of pillars) {
    if (circleTouchesRect(x, y, radius, p)) {
      return true;
    }
  }

  return false;
}

function circleTouchesRect(cx, cy, radius, pillar) {
  let left = pillar.x - PILLAR_SIZE / 2;
  let right = pillar.x + PILLAR_SIZE / 2;
  let top = pillar.y - PILLAR_SIZE / 2;
  let bottom = pillar.y + PILLAR_SIZE / 2;

  let closestX = constrain(cx, left, right);
  let closestY = constrain(cy, top, bottom);

  let dx = cx - closestX;
  let dy = cy - closestY;

  return dx * dx + dy * dy < radius * radius;
}

function findPath(startX, startY, endX, endY) {
  let cols = floor(W / GRID);
  let rows = floor(H / GRID);

  let start = worldToGrid(startX, startY);
  let end = worldToGrid(endX, endY);

  let open = [start];
  let cameFrom = {};
  let cost = {};

  let startKey = keyOf(start);
  cost[startKey] = 0;

  while (open.length > 0) {
    open.sort((a, b) => {
      let ak = keyOf(a);
      let bk = keyOf(b);
      return cost[ak] + heuristic(a, end) - (cost[bk] + heuristic(b, end));
    });

    let current = open.shift();

    if (current.c === end.c && current.r === end.r) {
      return rebuildPath(cameFrom, current);
    }

    let neighbours = [
      { c: current.c + 1, r: current.r },
      { c: current.c - 1, r: current.r },
      { c: current.c, r: current.r + 1 },
      { c: current.c, r: current.r - 1 },
      { c: current.c + 1, r: current.r + 1 },
      { c: current.c - 1, r: current.r - 1 },
      { c: current.c + 1, r: current.r - 1 },
      { c: current.c - 1, r: current.r + 1 }
    ];

    for (let next of neighbours) {
      if (next.c < 0 || next.r < 0 || next.c >= cols || next.r >= rows) continue;

      let world = gridToWorld(next);

      if (hitsAnyPillar(world.x, world.y, CAT_RADIUS + 3)) continue;

      let currentKey = keyOf(current);
      let nextKey = keyOf(next);
      let newCost = cost[currentKey] + dist(current.c, current.r, next.c, next.r);

      if (cost[nextKey] === undefined || newCost < cost[nextKey]) {
        cost[nextKey] = newCost;
        cameFrom[nextKey] = current;
        open.push(next);
      }
    }
  }

  return [{ x: catObj.x, y: catObj.y }, { x: mouseObj.x, y: mouseObj.y }];
}

function rebuildPath(cameFrom, current) {
  let path = [];

  while (current) {
    path.push(gridToWorld(current));
    current = cameFrom[keyOf(current)];
  }

  path.reverse();
  return path;
}

function worldToGrid(x, y) {
  return {
    c: floor(x / GRID),
    r: floor(y / GRID)
  };
}

function gridToWorld(cell) {
  return {
    x: cell.c * GRID + GRID / 2,
    y: cell.r * GRID + GRID / 2
  };
}

function keyOf(cell) {
  return cell.c + "," + cell.r;
}

function heuristic(a, b) {
  return abs(a.c - b.c) + abs(a.r - b.r);
}

function checkCheese() {
  if (dist(mouseObj.x, mouseObj.y, cheeseObj.x, cheeseObj.y) < MOUSE_RADIUS + CHEESE_RADIUS) {
    score += 10;
    spawnCheese();

    if (score % 50 === 0) {
      level++;
      catObj.speed += 0.3;
    }
  }
}

function checkCaught() {
  if (dist(mouseObj.x, mouseObj.y, catObj.x, catObj.y) < MOUSE_RADIUS + CAT_RADIUS - 8) {
    lives--;

    if (lives <= 0) {
      gameOver = true;
    } else {
      mouseObj.x = W / 2;
      mouseObj.y = H / 2;
      catObj.x = 60;
      catObj.y = 60;
    }
  }
}

function drawPillars() {
  rectMode(CENTER);
  fill("#4b79bc");
  noStroke();

  for (let p of pillars) {
    rect(p.x, p.y, PILLAR_SIZE, PILLAR_SIZE);
  }

  rectMode(CORNER);
}

function drawMouse() {
  push();
  translate(mouseObj.x, mouseObj.y);

  let angle = atan2(playerMouse.y - mouseObj.y, playerMouse.x - mouseObj.x);
  rotate(angle);

  drawImageFit(mouse, 0, 0, MOUSE_W, MOUSE_H);

  pop();
}

function drawCat() {
  push();
  translate(catObj.x, catObj.y);
  rotate(catObj.angle);

  drawImageFit(cat, 0, 0, CAT_W, CAT_H);

  pop();
}

function drawCheese() {
  drawImageFit(cheese, cheeseObj.x, cheeseObj.y, CHEESE_W, CHEESE_H);
}

function drawImageFit(img, x, y, maxW, maxH) {
  imageMode(CENTER);

  let scaleAmount = min(maxW / img.width, maxH / img.height);
  let newW = img.width * scaleAmount;
  let newH = img.height * scaleAmount;

  image(img, x, y, newW, newH);
}

function drawUI() {
  fill(255);
  noStroke();
  textSize(14);
  textAlign(LEFT, TOP);

  let hearts = "❤".repeat(lives) + "♡".repeat(max(0, 3 - lives));

  text(`Lives: ${hearts}   Score: ${score}`, 12, 10);

  textAlign(RIGHT, TOP);
  text(`Level ${level}`, W - 12, 10);
}

function drawGameOver() {
  fill(0, 170);
  rect(0, 0, W, H);

  textAlign(CENTER, CENTER);
  fill("#ff7777");
  textSize(34);
  text("You were caught!", W / 2, H / 2 - 30);

  fill("#f5e8c0");
  textSize(20);
  text(`Score: ${score}`, W / 2, H / 2 + 10);

  textSize(15);
  text("Click or press Space to restart", W / 2, H / 2 + 45);
}