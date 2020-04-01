var screen = document.getElementById("screen");
var screenWidth = 160;
var screenHeight = 50;
var buffer2 = new Array(screenHeight).fill(null).map(() => Array(screenWidth));

var stats = document.getElementById("stats");
var stats2 = document.getElementById("fps");
var mode = "dark";

var map = "";
map += "################";
map += "#              #";
map += "#   ## ##   #  #";
map += "#   #   #   #  #";
map += "#   #   #   #  #";
map += "#   #   #####  #";
map += "#              #";
map += "#   #     ######";
map += "#         #    #";
map += "#   #          #";
map += "#         #    #";
map += "#   #     #    #";
map += "#         ######";
map += "#   #          #";
map += "#              #";
map += "################";
var mapWidth = 16;
var mapHeight = 16;
var playerViewArea = new Array(mapHeight).fill(null).map(() => Array(mapWidth));

// timing stuff.
var current = null;
var prev = null;

// player
var playerX = 14.0;
var playerY = 10.0;
var playerAngle = 8.024;
var movementFactor = 2.0;
var turnFactor = 2.0;

// view related
var fov = Math.PI / 4.0;
var depth = Math.max(mapWidth, mapHeight);

var inputs = {
  forwards: false,
  backwards: false,
  turnLeft: false,
  turnRight: false
};

function clearViewArea() {
  for(y = 0; y < playerViewArea.length; y++) {
    for (x = 0; x < playerViewArea[y].length; x++) {
      playerViewArea[y][x] = " ";
    }
  }
}

function drawMap(buffer, map, viewArea, atX = 0, atY = 0) {
  for (var y = 0; y < mapHeight; y++) {
    for (var x = 0; x < mapHeight; x++) {
      if (x == Math.round(playerX) && y == Math.round(playerY)) {
        buffer[y + atY][x + atX] = "X";
      } else if (viewArea[y][x] === ".") {
        buffer[y + atY][x + atX] = ".";
      } else {
        buffer[y + atY][x + atX] = map[y * mapWidth + x];
      }
    }
  }
}

function drawBuffer(buffer, width, height) {
  var toDraw = "";
  for (var y = 0; y < height; y++) {
    toDraw += (buffer[y].join("")) + "\n";
  }
  return toDraw;
}

document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case "w":
    case "ArrowUp": 
      inputs.forwards = true;
      break;
    case "s":
    case "ArrowDown":
      inputs.backwards = true;
      break;
    case "a":
    case "ArrowLeft":
      inputs.turnLeft = true;
      break;
    case "d":
    case "ArrowRight":
      inputs.turnRight = true;
      break;
  }
});

var dmButton = document.getElementById("dark-mode");
var lmButton = document.getElementById("light-mode");

dmButton.addEventListener("click", (e) => {
  lmButton.classList.remove("active");
  dmButton.classList.add("active");
  screen.classList.remove("lm");
  screen.classList.add("dm");
});

lmButton.addEventListener("click", (e) => {
  dmButton.classList.remove("active");
  lmButton.classList.add("active");
  screen.classList.remove("dm");
  screen.classList.add("lm");
});


function tick(timestamp) {
  if (!current) {
    current = timestamp;
    delta = 0.01;
  } else {
    prev = current;
    current = timestamp;
    delta = current - prev;
  }

  var fps = 1000 / delta;

  // handle inputs
  if (inputs.forwards) {
    var newX = playerX + Math.sin(-playerAngle) * delta / 1000 * movementFactor;
    var newY = playerY + Math.cos(-playerAngle) * delta / 1000 * movementFactor;

    if (map[Math.round(newY) * mapWidth + Math.round(newX)] != "#") {
      playerX = newX;
      playerY = newY;
    }
  }
  if (inputs.backwards) {
    var newX = playerX - Math.sin(-playerAngle) * delta / 1000 * movementFactor;
    var newY = playerY - Math.cos(-playerAngle) * delta / 1000 * movementFactor;

    if (map[Math.round(newY) * mapWidth + Math.round(newX)] != "#") {
      playerX = newX;
      playerY = newY;
    }
  }
  if (inputs.turnRight) { playerAngle += (0.3 * delta / 1000 * turnFactor); }
  if (inputs.turnLeft) { playerAngle -= (0.3 * delta / 1000 * turnFactor); }

  // reset inputs
  inputs.forwards = false;
  inputs.backwards = false;
  inputs.turnLeft = false;
  inputs.turnRight = false;

  for (var x = 0; x < screenWidth; x++) {
    var rayAngle = (playerAngle - fov / 2.0) + (x / screenWidth) * fov;
    var distanceToWall = 0;
    var hitWall = false;
    var hitBoundary = false;

    // unit vector for ray in player space
    eyeX = Math.sin(-rayAngle);
    eyeY = Math.cos(-rayAngle);

    while (!hitWall && distanceToWall < depth) {
      distanceToWall += 0.1;

      testX = Math.round(playerX + eyeX * distanceToWall);
      testY = Math.round(playerY + eyeY * distanceToWall);

      var tLowX = Math.floor(playerX + eyeX * distanceToWall);
      var tHighX = Math.ceil(playerX + eyeX * distanceToWall);

      var tLowY = Math.floor(playerY + eyeY * distanceToWall);
      var tHighY = Math.ceil(playerY + eyeY * distanceToWall);

      // mark viewed square on map with a '.'
      if(map[tLowY * mapWidth + tLowX] != "#") {
        playerViewArea[tLowY][tLowX] = ".";
      }
      if(map[tHighY * mapWidth + tLowX] != "#") {
        playerViewArea[tHighY][tLowX] = ".";
      }
      if(map[tLowY * mapWidth + tHighX] != "#") {
        playerViewArea[tLowY][tHighX] = ".";
      }
      if(map[tHighY * mapWidth + tHighX] != "#") {
        playerViewArea[tHighY][tHighX] = ".";
      }

      // test if ray is out of bounds
      if (testX < 0 || testX > mapWidth || testY < 0 || testY > mapHeight) {
        hitWall = true;
        distanceToWall = depth;
      } else {
        // Ray is inbounds so test to see if the ray cell is a wall block
        if (map[testY * mapWidth + testX] == '#') {
          hitWall = true;

          var p = [];

          for (var tx = 0; tx < 2; tx++) {
            for (var ty = 0; ty < 2; ty++) {
              var vx = testX + tx - playerX;
              var vy = testY + ty - playerY;
              var d = Math.sqrt(vx * vx + vy * vy);
              var dot = (eyeX * vx / d) + (eyeY * vy / d); // vx /d, vy / d is unit vector of the perfect corner
              p.push({ d: d, dot: dot });
            }
          }
          p.sort(function (a, b) { return a.d < b.d });

          bound = 0.003;

          // 3 possible visible corners of wall cube cube
          if (Math.acos(p[0].dot) < bound) hitBoundary = true;
          if (Math.acos(p[1].dot) < bound) hitBoundary = true;
          //if(Math.acos(p[2].dot) < bound) hitBoundary = true;
        }
      }

      // Calculate distance to ceiling and floor
      var ceiling = screenHeight / 2.0 - screenHeight / distanceToWall;
      var floor = screenHeight - ceiling;

      var wallShade = " ";
      var floorShade = " ";

      if (distanceToWall < depth / 6.0) { wallShade = "\u2588"; }
      else if (distanceToWall < depth / 2.0) { wallShade = "\u2593"; }
      else if (distanceToWall < depth / 1.5) { wallShade = "\u2592"; }
      else if (distanceToWall < depth) { wallShade = "\u2591"; }
      else { wallShade = " "; }

      if (hitBoundary) { wallShade = " "; }

      // Shade for floor
      for (var y = 0; y < screenHeight; y++) {
        if (y < ceiling) {
          buffer2[y][x] = " ";
        } else if (y > ceiling && y < floor) {
          buffer2[y][x] = wallShade;
        } else {
          var b = 1.0 - ((y - screenHeight / 2.0) / (screenHeight / 2.0));

          if (b < 0.25) { floorShade = "#"; }
          else if (b < 0.5) { floorShade = "x"; }
          else if (b < 0.75) { floorShade = "."; }
          else if (b < 0.9) { floorShade = "-"; }
          else { floorShade = "-"; }

          buffer2[y][x] = floorShade;
        }
      }
    }
    drawMap(buffer2, map, playerViewArea, 1, 1);
    clearViewArea();
    screen.textContent = drawBuffer(buffer2, screenWidth, screenHeight);
    stats.textContent = `X=${playerX.toFixed(3)}, Y=${playerY.toFixed(3)}, Angle=${playerAngle.toFixed(3)}`;
    stats2.textContent = `${fps.toFixed(3)} fps`;
  }

  window.requestAnimationFrame(tick);
}

window.requestAnimationFrame(tick);
