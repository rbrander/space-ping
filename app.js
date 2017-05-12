// app.js
const RADS_PER_DEG = (Math.PI / 180);
const BULLET_VELOCITY = 20; // pixels per frame
const BULLET_STRENGTH = 1;
const THRUST_VELOCITY = 3; // how fast you move forward when you press up
const ANGULAR_VELOCITY = 3; // how fast you can turn left/right
const BULLET_LENGTH = 6; // pixels
const MAX_RADIANS = (Math.PI * 2);
const NUM_STARS = 255;
const KEYS = {
  UP: '38',
  LEFT: '37',
  RIGHT: '39',
  DOWN: '40',
  SPACE: '32',
};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let bullets = [];
const ship = {
  x: 400,
  y: 400,
  angle: 20, // up is 0 degrees, right is 90, down is 180, left is 270
  shields: 50,
  xVelocity: 0,
  yVelocity: 0,
};
const enemyShip = {
  x: 600,
  y: 400,
  angle: 340,
  shields: 50,
  xVelocity: -1,
  yVelocity: -2,
};
const stars = [];

const imgTitle = new Image();
let imgTitleLoaded = false;
imgTitle.onload = (e) => {
  imgTitleLoaded = true;
};
imgTitle.src = 'Space-Ping.png';

/**************************************/

const drawStars = () => {
  ctx.save();

  stars.forEach(star => {
    const brightness = 155 + star.intensity; // 155 is (255 max rgb - 100 max intensity)
    ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${star.intensity/100})`
    ctx.beginPath();

    const radius = ~~((100-star.intensity) / 40) + 1;
    // if (star.intensity > 80) ctx.fillStyle = 'pink';
    ctx.arc(star.x, star.y, radius, 0, MAX_RADIANS, true);
    ctx.fill();
  });

  ctx.restore();
};

const drawLogo = (tick, tickStart, tickEnd) => {
  // check if image is loaded
  if (!imgTitleLoaded) return;
  // check if time is within display bounds
  if ((tick < tickStart) || (tick > tickEnd)) return;

  ctx.save();

  const tickOffset = tick - tickStart;
  const duration = tickEnd - tickStart;
  const thirdDuration = ~~(duration / 3);
  const fadeInTime = thirdDuration; // milliseconds
  const fadeOutTime = thirdDuration; // milliseconds
  const fadeOutOffset = (duration - fadeOutTime);

  // fade in
  if (tickOffset < fadeInTime) {
    ctx.globalAlpha =  (tickOffset / fadeInTime);
  }

  // no fade
  if (tickOffset >= fadeInTime && tickOffset <= fadeOutOffset) {
    ctx.globalAlpha = 1.0;
  }

  // fade out
  if (tickOffset > (duration - fadeOutTime)) {
    ctx.globalAlpha = ((fadeOutTime - (tickOffset - fadeOutOffset)) / fadeOutTime);
  }

  ctx.drawImage(imgTitle, (canvas.width - imgTitle.width) / 2, canvas.height / 6);

  ctx.restore();
}

const drawBullets = (bullets) => {
  ctx.save();

  bullets.forEach(bullet => {
    // draw a yellow line from bullet.x and bullet.y
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'yellow';
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    const endXOffset = Math.cos((bullet.angle - 90) * RADS_PER_DEG) * BULLET_LENGTH;
    const endYOffset = Math.sin((bullet.angle - 90) * RADS_PER_DEG) * BULLET_LENGTH;
    ctx.lineTo(bullet.x + endXOffset, bullet.y + endYOffset);
    ctx.stroke();
  });

  ctx.restore();
}

const isShipDead = (ship) => ship.shields <= 0;

const getShieldDiameter = (shieldStrength) => {
  // short-circuit for dead ships
  if (shieldStrength <= 0) return 0;


  // since the longest part of the ship, from center, is 20px,
  // the shield will not shrink below 25px
  return shieldStrength <= 25 ? 25 : shieldStrength;
};

const drawShip = (shipDetails, isPlayer) => {
  if (isShipDead(shipDetails)) return;
  ctx.save();

  // translate and rotate
  ctx.translate(shipDetails.x, shipDetails.y);
  const rotation = RADS_PER_DEG * shipDetails.angle;
  ctx.rotate(rotation);

  // draw a triangle
  ctx.strokeStyle = isPlayer ? 'lightblue' : 'lightgreen';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(10, 10);
  ctx.lineTo(0, 5);
  ctx.lineTo(-10, 10);
  ctx.lineTo(0, -20);
  ctx.stroke();
  ctx.fillStyle = isPlayer ? 'darkblue' : 'darkgreen';
  ctx.fill();

  // draw the shields
  const shieldRadius = getShieldDiameter(shipDetails.shields);
  const shieldGradient = ctx.createRadialGradient(0, 0, 20, 0, 0, shieldRadius);
  shieldGradient.addColorStop(0, "transparent");
  shieldGradient.addColorStop(1, "lightblue");

  ctx.beginPath();
  ctx.arc(0, 0, shieldRadius, 0, MAX_RADIANS, true);
  ctx.fillStyle = shieldGradient;
  ctx.fill();

  ctx.rotate(-rotation);
  ctx.translate(-shipDetails.x, -shipDetails.y);

  ctx.restore();
};

let lastTick = 0;
const drawStats = (tick, ship, enemyShip) => {
  ctx.save();

  const fps = (1000/(tick-lastTick));

  ctx.font = '16px Arial';
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'top';
  ctx.fillText('FPS: ' + fps.toString(), 20, 20);
  ctx.fillText('Your Shields: ' + ship.shields.toString(), 20, 50);
  ctx.fillText('Enemy Shields: ' + enemyShip.shields.toString(), 20, 66);
  ctx.fillText(`(xVel, yVel): (${ship.xVelocity}, ${ship.yVelocity})`, 20, 110);

  lastTick = tick;

  ctx.restore();
}

const draw = (tick) => {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStars();

  drawShip(ship, true);
  drawShip(enemyShip, false);
  drawBullets(bullets);

  drawLogo(tick, 700, 7000);
  drawStats(tick, ship, enemyShip);
};
/**************************************/

const keys = {};
const onKeyDown = (e) => {
  keys[e.which] = true;
};

const onKeyUp = (e) => {
  delete keys[e.which];
}

const onResize = (e) => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

const fireBullet = (shipDetails) => {
  if (bullets.length < 10) {
    bullets.push({
      x: shipDetails.x + Math.cos((shipDetails.angle - 90) * RADS_PER_DEG) * 20, /* 20 = nose of the ship */
      y: shipDetails.y + Math.sin((shipDetails.angle - 90) * RADS_PER_DEG) * 20, /* 20 = nose of the ship */
      angle: shipDetails.angle,
    });
  }
};

const moveBullets = (bullets) => {
  const moveBullet = (bullet) => ({
    x: bullet.x + Math.cos((bullet.angle - 90) * RADS_PER_DEG) * BULLET_VELOCITY,
    y: bullet.y + Math.sin((bullet.angle - 90) * RADS_PER_DEG) * BULLET_VELOCITY,
    angle: bullet.angle,
  });
  const removeBulletsOffScreen = (bullet) => (
    ((bullet.x >= 0) && (bullet.x < canvas.width)) &&
    ((bullet.y >= 0) && (bullet.y < canvas.height))
  );

  return bullets
    .map(moveBullet)
    .filter(removeBulletsOffScreen);
};

const removeHitBullets = (bullets, ships) => {
  // for each bullet, check if it touches the any of the ships shields by radius
  return bullets.filter(bullet => {
    // bullet has x, y, and angle

    const shipHit = ships.reduce((shipHit, ship) => {
      if (shipHit) return shipHit;
      // use pythagorean theorm to determine if a bullet is within a shields radius
      const xDiff = ship.x - bullet.x;
      const yDiff = ship.y - bullet.y;
      const len = Math.sqrt(((xDiff * xDiff) + (yDiff * yDiff)));
      const hitShip = (len <= ship.shields);
      if (hitShip) {
        // if in sheilds and the shields are > BULLET_STRENGTH, deduct BULLET_STRENGTH, else kill player
        if (ship.shields > BULLET_STRENGTH + BULLET_LENGTH) {
          ship.shields -= BULLET_STRENGTH;
        } else {
          ship.shields = 0;
        }
      }
      return hitShip;
    }, false);
    // keep the bullet if it didn't hit a ship
    return !shipHit;
  });
}

const moveShip = (ship) => {
  // move player according to velocity
  ship.x += ship.xVelocity;
  ship.y += ship.yVelocity;

  // check ship bounds
  if (ship.x < 0)
    ship.x += canvas.width;
  else if (ship.x > canvas.width)
    ship.x -= canvas.width;
  if (ship.y < 0)
    ship.y += canvas.height;
  else if (ship.y > canvas.height)
    ship.y -= canvas.height;
};

const processKeys = (keys) => {
  if (Object.keys(keys).length > 0) {
    for (key in keys) {
      switch (key) {
        case KEYS.UP:
          // add thrust
          const angle = RADS_PER_DEG * (ship.angle - 90);
          const xVelocity = Math.cos(angle) * THRUST_VELOCITY;
          const yVelocity = Math.sin(angle) * THRUST_VELOCITY;
          ship.xVelocity += xVelocity;
          ship.yVelocity += yVelocity;
          delete keys[KEYS.UP];
          break;
        case KEYS.DOWN:
          // stop thrust and/or reverse thrust
          ship.xVelocity = 0;
          ship.yVelocity = 0;
          delete keys[KEYS.DOWN];
          break;
        case KEYS.LEFT:
          // rotate counter clock-wise
          ship.angle -= ANGULAR_VELOCITY;
          break;
        case KEYS.RIGHT:
          // rotate clock-wise
          ship.angle += ANGULAR_VELOCITY;
          break;
        case KEYS.SPACE:
          // fire a bullet
          fireBullet(ship);
          // stop moving
          ship.xVelocity = ship.yVelocity = 0;
          break;
        default:
          break;
      }
    }
  }
};

const collisionDetection = (firstShip, secondShip) => {
  // short-circuit if one of them is dead
  if (isShipDead(firstShip) || isShipDead(secondShip)) return;
  // the closest the two ships are permitted to be is the sum of their radii
  const hitDist = getShieldDiameter(firstShip.shields) + getShieldDiameter(secondShip.shields);
  const xDiff = (firstShip.x - secondShip.x);
  const yDiff = (firstShip.y - secondShip.y);
  const dist = ~~Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));
  if (dist <= hitDist) {
    // it's a hit! invert the velocity a bit
    firstShip.xVelocity *= -0.4;
    firstShip.yVelocity *= -0.6;
    secondShip.xVelocity *= -0.6;
    secondShip.yVelocity *= -0.4;
    moveShip(firstShip);
    moveShip(secondShip);
  }
};

const update = (tick) => {
  bullets = moveBullets(bullets);
  bullets = removeHitBullets(bullets, [enemyShip]);

  processKeys(keys);
  collisionDetection(ship, enemyShip);

  moveShip(ship);
  moveShip(enemyShip);

};


/**************************************/
const loop = (tick) => {
  update(tick);
  draw(tick);
  requestAnimationFrame(loop);
};
/**************************************/

const createStars = () => {
  for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
      x: ~~(Math.random() * canvas.width),
      y: ~~(Math.random() * canvas.height),
      intensity: ~~(Math.random() * 100),
    });
  }
}

(function(){
  console.info('Space Ping');
  document.body.addEventListener('keydown', onKeyDown, false);
  document.body.addEventListener('keyup', onKeyUp, false);
  window.addEventListener('resize', onResize, false);
  onResize();
  createStars();
  requestAnimationFrame(loop);
})();