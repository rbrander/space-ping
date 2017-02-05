// app.js

const RADS_PER_DEG = (Math.PI/180);
const BULLET_VELOCITY = 20; // pixels per frame
const BULLET_LENGTH = 10; // pixels
const MAX_RADIANS = Math.PI * 2;
const BULLET_STRENGTH = 1;
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
  if (!imgTitleLoaded) return;
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

const drawShip = (shipDetails) => {
  if (isShipDead(shipDetails)) return;
  ctx.save();

  // translate and rotate
  ctx.translate(shipDetails.x, shipDetails.y);
  const rotation = RADS_PER_DEG * shipDetails.angle;
  ctx.rotate(rotation);

  // draw a triangle
  ctx.strokeStyle = 'lightgreen';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(10, 10);
  ctx.lineTo(0, 5);
  ctx.lineTo(-10, 10);
  ctx.lineTo(0, -20);
  ctx.stroke();
  ctx.fillStyle = 'darkgreen';
  ctx.fill();

  // draw the shields
  ctx.strokeStyle = 'lightblue';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, shipDetails.shields, 0, MAX_RADIANS, true);
  ctx.stroke();

  ctx.rotate(-rotation);
  ctx.translate(-shipDetails.x, -shipDetails.y);

  ctx.restore();
};

const draw = (tick) => {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStars();

  drawShip(ship);
  drawShip(enemyShip);
  drawBullets(bullets);

  drawLogo(tick, 700, 4000);
};
/**************************************/

const keys = {};
const onKeyDown = (e) => {
  if (e.which == KEYS.SPACE)
    e.preventDefault();
  keys[e.which] = true;
};

const onKeyUp = (e) => {
  if (e.which == KEYS.SPACE)
    e.preventDefault();
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

const update = (tick) => {
  bullets = moveBullets(bullets);
  bullets = removeHitBullets(bullets, [enemyShip]);

  // process keys
  if (Object.keys(keys).length > 0) {
    const angularVelocity = 3;
    const thrustVelocity = 5;
    for (key in keys) {
      switch (key) {
        case KEYS.UP:
          // add thrust
          const angle = RADS_PER_DEG * (ship.angle - 90);
          const xVelocity = Math.cos(angle) * thrustVelocity;
          const yVelocity = Math.sin(angle) * thrustVelocity;
          /*
          ship.x += xVelocity;
          ship.y += yVelocity;
          */
          ship.xVelocity += xVelocity;
          ship.yVelocity += yVelocity;
          delete keys[KEYS.UP];
          break;
        case KEYS.DOWN:
          // stop thrust and/or reverse thrust
          break;
        case KEYS.LEFT:
          // rotate counter clock-wise
          ship.angle -= angularVelocity;
          break;
        case KEYS.RIGHT:
          // rotate clock-wise
          ship.angle += angularVelocity;
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
  console.log('Space Ping');
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);
  window.addEventListener('resize', onResize, false);
  onResize();
  createStars();
  requestAnimationFrame(loop);
})();