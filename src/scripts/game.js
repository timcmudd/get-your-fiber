let canvas;
let ctx;

let turnLabelEl;
let throwsLeftEl;
let scoreKevinEl;
let scoreCaseyEl;
let statusLineEl;
let aimHintEl;
let itemSelectEl;
let resetBtnEl;
let discoBtnEl;
const THROWS_PER_ROUND = 5;

const ITEMS = [
  { name: 'Apple', fiber: 4.4, color: '#d84f4f' },
  { name: 'Pear', fiber: 5.5, color: '#8bb643' },
  { name: 'Raspberry Cup', fiber: 8.0, color: '#bf2d6b' },
  { name: 'Black Beans Scoop', fiber: 7.5, color: '#2e2a35' },
  { name: 'Broccoli Floret', fiber: 2.6, color: '#3f9f46' },
  { name: 'Carrot Stick', fiber: 1.7, color: '#f18d32' },
  { name: 'Avocado Slice', fiber: 6.7, color: '#5a8f3d' },
  { name: 'Oat Bar', fiber: 4.0, color: '#c79a56' },
  { name: 'Chia Pudding Scoop', fiber: 9.8, color: '#8a8a8a' }
];

const opponents = [
  {
    id: 'kevin',
    name: 'Kevin Roose',
    shortName: 'Kevin',
    direction: -1,
    baseX: 230,
    baseY: 312,
    baseMouthY: 344,
    baseMouthR: 24,
    difficulty: 0,
    hits: 0,
    score: 0,
    throwsLeft: THROWS_PER_ROUND,
    x: 230,
    y: 312,
    jacket: '#2f4e8a',
    shirt: '#eff5ff',
    tie: '#2e7dbe',
    hair: '#5a3c28',
    skin: '#eec19e',
    mouth: { x: 230, y: 344, r: 24 }
  },
  {
    id: 'casey',
    name: 'Casey Newton',
    shortName: 'Casey',
    direction: 1,
    baseX: 730,
    baseY: 312,
    baseMouthY: 344,
    baseMouthR: 24,
    difficulty: 0,
    hits: 0,
    score: 0,
    throwsLeft: THROWS_PER_ROUND,
    x: 730,
    y: 312,
    jacket: '#2f3144',
    shirt: '#f6f0e5',
    tie: '#c86f29',
    hair: '#d3aa5a',
    skin: '#f0c6a7',
    mouth: { x: 730, y: 344, r: 24 }
  }
];

const state = {
  activeOpponentIndex: 0,
  phase: 'aiming',
  message: 'Grab the slingshot ring, pull back away from the active target, then release.',
  groundY: 465,
  slingshot: { x: 480, y: 430 },
  baseGravity: 900,
  gravity: 900,
  basePowerScale: 5.6,
  powerScale: 5.6,
  maxDrag: 185,
  hitCount: 0,
  projectileRadius: 14,
  dragStart: null,
  dragCurrent: null,
  hasLaunchedOnce: false,
  projectile: {
    active: false,
    scored: false,
    item: ITEMS[0],
    x: 0,
    y: 0,
    vx: 0,
    vy: 0
  },
  winnerText: '',
  winnerId: null,
  celebrationDuration: 2.8,
  celebrationTimer: 0,
  confetti: [],
  discoMode: false,
  discoTime: 0
};

function setupItemOptions() {
  ITEMS.forEach((item, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = item.name;
    itemSelectEl.appendChild(opt);
  });

  itemSelectEl.value = '0';
}

function resizeCanvas() {
  const wrap = canvas.parentElement;
  const width = Math.min(wrap.clientWidth, 1600);
  canvas.width = width;
  canvas.height = Math.round((width * 9) / 16);

  // Scale game landmarks for responsive rendering and physics.
  const sx = canvas.width / 960;
  const sy = canvas.height / 540;
  state.groundY = 465 * sy;
  state.slingshot.x = 480 * sx;
  state.slingshot.y = 430 * sy;

  opponents.forEach((opponent) => applyOpponentGeometry(opponent, sx, sy));

  state.projectileRadius = 14 * ((sx + sy) * 0.5);
  state.maxDrag = 185 * ((sx + sy) * 0.5);
}

function applyOpponentGeometry(opponent, sx, sy) {
  const outwardShift = opponent.difficulty * 26 * sx * opponent.direction;
  const x = opponent.baseX * sx + outwardShift;

  opponent.x = Math.min(canvas.width - 95 * sx, Math.max(95 * sx, x));
  opponent.y = opponent.baseY * sy;
  opponent.mouth.x = opponent.x;
  opponent.mouth.y = opponent.baseMouthY * sy;

  const scale = (sx + sy) * 0.5;
  const shrink = opponent.difficulty * 3.6 * scale;
  opponent.mouth.r = Math.max(9 * scale, opponent.baseMouthR * scale - shrink);
}

function updateGlobalDifficulty() {
  state.gravity = state.baseGravity + state.hitCount * 34;
  state.powerScale = Math.max(4.6, state.basePowerScale - state.hitCount * 0.08);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampDragPoint(point) {
  const origin = state.slingshot;
  const dragVec = { x: point.x - origin.x, y: point.y - origin.y };
  const dragLength = Math.hypot(dragVec.x, dragVec.y);

  if (dragLength <= state.maxDrag) {
    return point;
  }

  const ratio = state.maxDrag / dragLength;
  return {
    x: origin.x + dragVec.x * ratio,
    y: origin.y + dragVec.y * ratio
  };
}

function getAimInstruction(opponent) {
  return `Pull away from ${opponent.shortName} and release. Bigger pull = more power.`;
}

function createConfetti() {
  const pieces = [];
  const colors = ['#ff6d6d', '#ffd166', '#6bcf93', '#57b4ff', '#b38bff', '#ff9f4d'];
  const count = Math.max(70, Math.round(canvas.width / 13));

  for (let i = 0; i < count; i += 1) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height * 0.9,
      vx: (Math.random() - 0.5) * 140,
      vy: 90 + Math.random() * 220,
      size: 4 + Math.random() * 7,
      spin: (Math.random() - 0.5) * 6,
      angle: Math.random() * Math.PI,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  return pieces;
}

function startWinnerCelebration() {
  state.phase = 'celebrating';
  state.celebrationTimer = 0;
  state.confetti = createConfetti();
  state.message = `${state.winnerText} Winner animation...`;
}

function setDiscoMode(nextMode) {
  state.discoMode = nextMode;
  document.body.classList.toggle('disco-theme', state.discoMode);

  if (discoBtnEl) {
    discoBtnEl.classList.toggle('active', state.discoMode);
    discoBtnEl.setAttribute('aria-pressed', String(state.discoMode));
    discoBtnEl.textContent = state.discoMode ? 'Disco Mode On' : 'Disco Mode';
  }
}

function getAimHintText() {
  if (state.phase === 'celebrating') {
    return 'Celebrating winner... Game over screen in a moment.';
  }

  if (state.phase === 'gameover') {
    return 'Game over. Press Reset Game to play again.';
  }

  const active = opponents[state.activeOpponentIndex];
  if (!state.hasLaunchedOnce) {
    return `Start on the glowing slingshot ring. Pull away from ${active.shortName}, then release.`;
  }

  return `Aim tip: pull away from ${active.shortName}. Difficulty increases after every make.`;
}

function launchProjectile() {
  if (!state.dragCurrent || state.phase !== 'aiming') return;

  const origin = state.slingshot;
  const drag = {
    x: state.dragCurrent.x - origin.x,
    y: state.dragCurrent.y - origin.y
  };

  state.projectile.active = true;
  state.projectile.scored = false;
  state.projectile.item = ITEMS[Number(itemSelectEl.value)];
  state.projectile.x = origin.x;
  state.projectile.y = origin.y;
  state.projectile.vx = -drag.x * state.powerScale;
  state.projectile.vy = -drag.y * state.powerScale;
  state.phase = 'flying';
  state.message = 'Projectile in flight...';
  state.hasLaunchedOnce = true;

  state.dragStart = null;
  state.dragCurrent = null;
}

function handleThrowEnd(scored) {
  const active = opponents[state.activeOpponentIndex];
  const points = scored ? Math.round(state.projectile.item.fiber * 10) : 0;
  const throwResultMessage = scored
    ? `${active.name} hit with ${state.projectile.item.name}: ${state.projectile.item.fiber}g fiber for ${points} points.`
    : `${active.name} missed. 0 points this throw.`;

  if (scored) {
    active.hits += 1;
    active.difficulty += 1;
    state.hitCount += 1;
    updateGlobalDifficulty();
    resizeCanvas();

    active.score += points;
  }

  active.throwsLeft -= 1;
  state.projectile.active = false;

  if (active.throwsLeft <= 0) {
    if (state.activeOpponentIndex === 0) {
      state.activeOpponentIndex = 1;
      state.phase = 'aiming';
      state.message = `${throwResultMessage} Kevin turn complete. ${getAimInstruction(opponents[1])}`;
    } else {
      endGame();
      state.message = `${throwResultMessage} ${state.message}`;
    }
  } else {
    state.phase = 'aiming';
    state.message = `${throwResultMessage} ${getAimInstruction(active)}`;
  }

  updateHud();
}

function endGame() {
  const kevin = opponents[0];
  const casey = opponents[1];

  if (kevin.score === casey.score) {
    state.winnerText = `Tie game at ${kevin.score} points each.`;
    state.winnerId = 'tie';
  } else {
    const winner = kevin.score > casey.score ? kevin : casey;
    state.winnerText = `${winner.name} wins with ${winner.score} points!`;
    state.winnerId = winner.id;
  }

  startWinnerCelebration();
}

function updateHud() {
  const active = opponents[state.activeOpponentIndex];
  if (state.phase === 'gameover') {
    turnLabelEl.textContent = 'Game Over';
  } else if (state.phase === 'celebrating') {
    turnLabelEl.textContent = 'Winner';
  } else {
    turnLabelEl.textContent = active.name;
  }

  throwsLeftEl.textContent = state.phase === 'aiming' || state.phase === 'flying'
    ? String(active.throwsLeft)
    : '0';
  scoreKevinEl.textContent = String(opponents[0].score);
  scoreCaseyEl.textContent = String(opponents[1].score);
  statusLineEl.textContent = state.message;
  if (aimHintEl) {
    aimHintEl.textContent = getAimHintText();
  }
}

function resetGame() {
  opponents.forEach((opponent) => {
    opponent.score = 0;
    opponent.throwsLeft = THROWS_PER_ROUND;
    opponent.hits = 0;
    opponent.difficulty = 0;
  });

  state.activeOpponentIndex = 0;
  state.phase = 'aiming';
  state.message = getAimInstruction(opponents[0]);
  state.winnerText = '';
  state.winnerId = null;
  state.celebrationTimer = 0;
  state.confetti = [];
  state.dragStart = null;
  state.dragCurrent = null;
  state.hasLaunchedOnce = false;
  state.hitCount = 0;
  updateGlobalDifficulty();

  state.projectile.active = false;
  state.projectile.scored = false;
  state.projectile.item = ITEMS[Number(itemSelectEl.value)];
  resizeCanvas();
  updateHud();
}

function getPointerPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function isWithinSlingshot(point) {
  return distance(point, state.slingshot) <= 58;
}

function onPointerDown(event) {
  if (state.phase !== 'aiming') return;

  const point = getPointerPoint(event);
  if (!isWithinSlingshot(point)) {
    state.message = `Start drag on the slingshot ring. ${getAimInstruction(opponents[state.activeOpponentIndex])}`;
    updateHud();
    return;
  }

  state.dragStart = point;
  state.dragCurrent = point;
  canvas.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!state.dragStart || state.phase !== 'aiming') return;

  const point = getPointerPoint(event);
  state.dragCurrent = clampDragPoint(point);
}

function onPointerUp(event) {
  if (!state.dragStart || state.phase !== 'aiming') return;

  launchProjectile();
  canvas.releasePointerCapture(event.pointerId);
}

function onPointerCancel(event) {
  state.dragStart = null;
  state.dragCurrent = null;
  if (event.pointerId !== undefined) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function update(dt) {
  state.discoTime += dt;

  if (state.phase === 'celebrating') {
    state.celebrationTimer += dt;

    state.confetti.forEach((piece) => {
      piece.vy += 180 * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.angle += piece.spin * dt;

      if (piece.y > canvas.height + 40) {
        piece.y = -30 - Math.random() * 80;
        piece.x = Math.random() * canvas.width;
        piece.vy = 90 + Math.random() * 220;
      }
    });

    if (state.celebrationTimer >= state.celebrationDuration) {
      state.phase = 'gameover';
      state.message = `${state.winnerText} Press Reset Game to play again.`;
      updateHud();
    }

    return;
  }

  if (!state.projectile.active || state.phase !== 'flying') {
    return;
  }

  const p = state.projectile;
  p.vy += state.gravity * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  const active = opponents[state.activeOpponentIndex];
  const mouth = active.mouth;

  if (!p.scored && distance({ x: p.x, y: p.y }, mouth) <= mouth.r + state.projectileRadius * 0.55) {
    p.scored = true;
    handleThrowEnd(true);
    return;
  }

  if (p.y + state.projectileRadius >= state.groundY) {
    p.y = state.groundY - state.projectileRadius;
    handleThrowEnd(false);
    return;
  }

  if (p.x < -state.projectileRadius || p.x > canvas.width + state.projectileRadius) {
    handleThrowEnd(false);
  }
}

function drawBackground() {
  if (state.discoMode) {
    drawClubBackground();
    return;
  }

  drawOutdoorBackground();
}

function drawOutdoorBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#d7ecff');
  grad.addColorStop(1, '#9ec8ef');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#88b465';
  ctx.fillRect(0, state.groundY, canvas.width, canvas.height - state.groundY);

  ctx.fillStyle = '#6f994e';
  ctx.fillRect(0, state.groundY + 14, canvas.width, 6);
}

function drawClubBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#120d23');
  grad.addColorStop(0.5, '#1c1237');
  grad.addColorStop(1, '#250f30');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const beamColors = ['#ff4f9fcc', '#57b4ffcc', '#ffd166cc', '#6bcf93cc', '#a884ffcc'];
  for (let i = 0; i < 6; i += 1) {
    const anchorX = canvas.width * (0.12 + i * 0.16);
    const sweep = Math.sin(state.discoTime * 1.6 + i) * canvas.width * 0.22;
    const tipX = anchorX + sweep;

    ctx.fillStyle = beamColors[i % beamColors.length];
    ctx.beginPath();
    ctx.moveTo(anchorX - 8, 0);
    ctx.lineTo(anchorX + 8, 0);
    ctx.lineTo(tipX + 66, state.groundY + 4);
    ctx.lineTo(tipX - 66, state.groundY + 4);
    ctx.closePath();
    ctx.fill();
  }

  const floorTop = state.groundY;
  ctx.fillStyle = '#111623';
  ctx.fillRect(0, floorTop, canvas.width, canvas.height - floorTop);

  const tile = Math.max(24, Math.round(canvas.width / 30));
  for (let y = floorTop; y < canvas.height; y += tile) {
    for (let x = 0; x < canvas.width; x += tile) {
      const wave = Math.sin(state.discoTime * 2.4 + x * 0.02 + y * 0.03);
      const hue = 220 + Math.round(wave * 90);
      ctx.fillStyle = `hsla(${hue}, 78%, 56%, 0.34)`;
      ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
    }
  }

  const ballX = canvas.width * 0.5;
  const ballY = canvas.height * 0.14;
  const ballR = Math.max(18, canvas.width * 0.03);
  ctx.strokeStyle = '#7f8aa6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ballX, 0);
  ctx.lineTo(ballX, ballY - ballR);
  ctx.stroke();

  ctx.fillStyle = '#c8d0e7';
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2 + state.discoTime * 0.6;
    const rx = Math.cos(a) * ballR * 0.68;
    const ry = Math.sin(a) * ballR * 0.68;
    ctx.fillStyle = i % 2 === 0 ? '#8fa6d8' : '#f9f3cd';
    ctx.fillRect(ballX + rx - 3, ballY + ry - 3, 6, 6);
  }

  drawSpeakerStack(42, state.groundY - 140, 66, 136);
  drawSpeakerStack(canvas.width - 108, state.groundY - 140, 66, 136);
}

function drawSpeakerStack(x, y, w, h) {
  ctx.fillStyle = '#191919';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#424242';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#0f0f0f';
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.32, w * 0.22, 0, Math.PI * 2);
  ctx.arc(x + w * 0.5, y + h * 0.7, w * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6a6a6a';
  ctx.stroke();
}

function drawSpeechBubble(opponent, text) {
  ctx.font = 'bold 13px Trebuchet MS, sans-serif';
  const lines = wrapTextLines(text, 180);
  const longest = lines.reduce((acc, line) => Math.max(acc, ctx.measureText(line).width), 0);
  const bubbleW = Math.max(136, longest + 28);
  const bubbleH = 20 + lines.length * 18;
  const bx = opponent.x - bubbleW / 2;
  const by = opponent.y - 150;

  ctx.fillStyle = '#fffdf7';
  ctx.strokeStyle = '#3b3525';
  ctx.lineWidth = 2;
  roundRect(ctx, bx, by, bubbleW, bubbleH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(opponent.x - 8, by + bubbleH);
  ctx.lineTo(opponent.x + 4, by + bubbleH + 16);
  ctx.lineTo(opponent.x + 14, by + bubbleH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#2a2518';
  ctx.textAlign = 'center';
  lines.forEach((line, index) => {
    ctx.fillText(line, opponent.x, by + 24 + index * 16);
  });
}

function wrapTextLines(text, maxWidth, maxLines = 3) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });

  if (current) {
    lines.push(current);
  }

  if (lines.length <= maxLines) return lines;

  const capped = lines.slice(0, maxLines);
  capped[maxLines - 1] = `${lines.slice(maxLines - 1).join(' ').slice(0, 28)}...`;
  return capped;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawOpponent(opponent, isActive) {
  ctx.save();

  if (!isActive) {
    ctx.globalAlpha = 0.62;
  }

  ctx.fillStyle = opponent.jacket;
  ctx.beginPath();
  ctx.moveTo(opponent.x - 66, opponent.y + 110);
  ctx.quadraticCurveTo(opponent.x, opponent.y + 58, opponent.x + 66, opponent.y + 110);
  ctx.lineTo(opponent.x + 58, opponent.y + 178);
  ctx.lineTo(opponent.x - 58, opponent.y + 178);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = opponent.shirt;
  ctx.beginPath();
  ctx.moveTo(opponent.x - 21, opponent.y + 106);
  ctx.lineTo(opponent.x + 21, opponent.y + 106);
  ctx.lineTo(opponent.x + 16, opponent.y + 166);
  ctx.lineTo(opponent.x - 16, opponent.y + 166);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = opponent.tie;
  ctx.beginPath();
  ctx.moveTo(opponent.x, opponent.y + 112);
  ctx.lineTo(opponent.x + 8, opponent.y + 138);
  ctx.lineTo(opponent.x, opponent.y + 168);
  ctx.lineTo(opponent.x - 8, opponent.y + 138);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = opponent.skin;
  ctx.fillRect(opponent.x - 10, opponent.y + 56, 20, 28);

  ctx.fillStyle = opponent.skin;
  ctx.beginPath();
  ctx.ellipse(opponent.x, opponent.y + 10, 44, 52, 0, 0, Math.PI * 2);
  ctx.fill();

  if (opponent.id === 'kevin') {
    ctx.fillStyle = opponent.hair;
    ctx.beginPath();
    ctx.moveTo(opponent.x - 44, opponent.y - 18);
    ctx.quadraticCurveTo(opponent.x - 18, opponent.y - 58, opponent.x + 40, opponent.y - 32);
    ctx.quadraticCurveTo(opponent.x + 22, opponent.y - 20, opponent.x + 8, opponent.y - 10);
    ctx.quadraticCurveTo(opponent.x - 12, opponent.y - 28, opponent.x - 44, opponent.y - 18);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#6d4831';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(opponent.x - 24, opponent.y - 24);
    ctx.quadraticCurveTo(opponent.x - 8, opponent.y - 30, opponent.x + 14, opponent.y - 24);
    ctx.stroke();
  } else {
    // Casey: spiky hair + trimmed beard/mustache silhouette.
    ctx.fillStyle = opponent.hair;
    ctx.beginPath();
    ctx.moveTo(opponent.x - 44, opponent.y - 38);
    ctx.lineTo(opponent.x - 34, opponent.y - 60);
    ctx.lineTo(opponent.x - 18, opponent.y - 44);
    ctx.lineTo(opponent.x - 6, opponent.y - 64);
    ctx.lineTo(opponent.x + 10, opponent.y - 44);
    ctx.lineTo(opponent.x + 26, opponent.y - 62);
    ctx.lineTo(opponent.x + 42, opponent.y - 38);
    ctx.quadraticCurveTo(opponent.x + 34, opponent.y - 18, opponent.x + 20, opponent.y - 14);
    ctx.quadraticCurveTo(opponent.x, opponent.y - 20, opponent.x - 20, opponent.y - 14);
    ctx.quadraticCurveTo(opponent.x - 34, opponent.y - 18, opponent.x - 44, opponent.y - 38);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(opponent.x - 16, opponent.y + 32, 11, 12, 0.15, 0, Math.PI * 2);
    ctx.ellipse(opponent.x + 16, opponent.y + 32, 11, 12, -0.15, 0, Math.PI * 2);
    ctx.ellipse(opponent.x, opponent.y + 44, 17, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(opponent.x - 10, opponent.y + 24, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(opponent.x + 10, opponent.y + 24, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#1f1f1f';
  ctx.beginPath();
  ctx.arc(opponent.x - 16, opponent.y + 4, 4, 0, Math.PI * 2);
  ctx.arc(opponent.x + 16, opponent.y + 4, 4, 0, Math.PI * 2);
  ctx.fill();

  if (opponent.id === 'casey') {
    ctx.strokeStyle = '#2e2e2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(opponent.x - 16, opponent.y + 4, 11, 0, Math.PI * 2);
    ctx.arc(opponent.x + 16, opponent.y + 4, 11, 0, Math.PI * 2);
    ctx.moveTo(opponent.x - 5, opponent.y + 4);
    ctx.lineTo(opponent.x + 5, opponent.y + 4);
    ctx.stroke();
  }

  ctx.strokeStyle = '#8b4f2b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(opponent.x - 6, opponent.y + 16);
  ctx.lineTo(opponent.x - 2, opponent.y + 22);
  ctx.lineTo(opponent.x + 3, opponent.y + 21);
  ctx.stroke();

  ctx.fillStyle = '#3a1a14';
  ctx.beginPath();
  ctx.ellipse(opponent.mouth.x, opponent.mouth.y, opponent.mouth.r, opponent.mouth.r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#f7b59c';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#d45e63';
  ctx.beginPath();
  ctx.ellipse(opponent.mouth.x, opponent.mouth.y + 5, opponent.mouth.r * 0.45, opponent.mouth.r * 0.2, 0, 0, Math.PI);
  ctx.fill();

  if (isActive) {
    ctx.strokeStyle = '#ffe08f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(opponent.x, opponent.y + 10, 62, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#f7f1e4';
  roundRect(ctx, opponent.x - 78, opponent.y + 126, 156, 34, 10);
  ctx.fill();
  ctx.strokeStyle = '#4a4433';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#171717';
  ctx.font = 'bold 15px Trebuchet MS, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(opponent.name, opponent.x, opponent.y + 148);

  ctx.restore();
}

function drawSlingshot() {
  const { x, y } = state.slingshot;
  const leftFork = { x: x - 10, y: y - 56 };
  const rightFork = { x: x + 10, y: y - 56 };
  const pouch = state.dragCurrent && state.phase === 'aiming' ? state.dragCurrent : { x, y: y - 40 };

  ctx.strokeStyle = '#5f3f21';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(x - 22, y + 36);
  ctx.lineTo(x - 16, y - 20);
  ctx.lineTo(x - 5, y - 56);
  ctx.moveTo(x + 22, y + 36);
  ctx.lineTo(x + 16, y - 20);
  ctx.lineTo(x + 5, y - 56);
  ctx.stroke();

  ctx.strokeStyle = '#2c2c2c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(leftFork.x, leftFork.y);
  ctx.lineTo(pouch.x - 8, pouch.y);
  ctx.moveTo(rightFork.x, rightFork.y);
  ctx.lineTo(pouch.x + 8, pouch.y);
  ctx.stroke();

  ctx.fillStyle = '#3b3228';
  ctx.beginPath();
  ctx.ellipse(pouch.x, pouch.y, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state.phase === 'aiming' && !state.dragCurrent) {
    ctx.strokeStyle = '#f8e7b5';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.arc(x, y - 40, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (state.dragCurrent && state.phase === 'aiming') {
    drawTrajectoryPreview();

    ctx.strokeStyle = '#363636';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 40);
    ctx.lineTo(state.dragCurrent.x, state.dragCurrent.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawTrajectoryPreview() {
  const origin = state.slingshot;
  const drag = {
    x: state.dragCurrent.x - origin.x,
    y: state.dragCurrent.y - origin.y
  };

  let px = origin.x;
  let py = origin.y;
  let vx = -drag.x * state.powerScale;
  let vy = -drag.y * state.powerScale;

  ctx.fillStyle = '#0d0d0daa';

  for (let i = 0; i < 28; i += 1) {
    vy += state.gravity * 0.07;
    px += vx * 0.07;
    py += vy * 0.07;

    if (py > state.groundY || px < 0 || px > canvas.width) break;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(2.2, 5 - i * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProjectile() {
  if (!state.projectile.active) return;
  const p = state.projectile;

  ctx.fillStyle = p.item.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, state.projectileRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#242424';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCelebrationLayer() {
  state.confetti.forEach((piece) => {
    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.angle);
    ctx.fillStyle = piece.color;
    ctx.fillRect(-piece.size * 0.5, -piece.size * 0.5, piece.size, piece.size * 0.65);
    ctx.restore();
  });

  const bannerW = Math.min(canvas.width * 0.72, 760);
  const bannerX = canvas.width * 0.5 - bannerW * 0.5;
  const bannerY = Math.max(14, canvas.height * 0.08);

  ctx.fillStyle = '#fff7dfeb';
  roundRect(ctx, bannerX, bannerY, bannerW, 76, 14);
  ctx.fill();
  ctx.strokeStyle = '#705f2f';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#2a2216';
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px Trebuchet MS, sans-serif';
  ctx.fillText('Winner!', canvas.width * 0.5, bannerY + 30);
  ctx.font = 'bold 20px Trebuchet MS, sans-serif';
  ctx.fillText(state.winnerText, canvas.width * 0.5, bannerY + 58);
}

function drawUIHints() {
  const active = opponents[state.activeOpponentIndex];
  const passive = opponents[1 - state.activeOpponentIndex];

  if (state.phase === 'celebrating') {
    if (state.winnerId === 'tie') {
      drawSpeechBubble(opponents[0], 'Tie game!');
      drawSpeechBubble(opponents[1], 'Tie game!');
    } else {
      drawSpeechBubble(opponents[0], state.winnerId === 'kevin' ? 'Winner!' : 'Good game!');
      drawSpeechBubble(opponents[1], state.winnerId === 'casey' ? 'Winner!' : 'Good game!');
    }
  } else if (state.phase !== 'gameover') {
    drawSpeechBubble(active, 'Aim for my mouth target!');
    drawSpeechBubble(passive, 'Waiting my turn');
  } else {
    drawSpeechBubble(opponents[0], state.winnerText.includes('Kevin') ? 'Winner!' : 'Good game!');
    drawSpeechBubble(opponents[1], state.winnerText.includes('Casey') ? 'Winner!' : 'Good game!');
  }

  if (state.phase === 'aiming') {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state.slingshot.x, state.slingshot.y - 78);
    ctx.lineTo(state.slingshot.x, state.slingshot.y - 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(state.slingshot.x - 7, state.slingshot.y - 58);
    ctx.lineTo(state.slingshot.x, state.slingshot.y - 50);
    ctx.lineTo(state.slingshot.x + 7, state.slingshot.y - 58);
    ctx.stroke();
  }
}

function draw() {
  drawBackground();
  const highlightActive = state.phase === 'aiming' || state.phase === 'flying';
  drawOpponent(opponents[0], state.activeOpponentIndex === 0 && highlightActive);
  drawOpponent(opponents[1], state.activeOpponentIndex === 1 && highlightActive);
  drawSlingshot();
  drawProjectile();
  drawUIHints();
  if (state.phase === 'celebrating') {
    drawCelebrationLayer();
  }
}

let previousTime = performance.now();

function gameLoop(now) {
  const dt = Math.min((now - previousTime) / 1000, 0.032);
  previousTime = now;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

function initGame() {
  canvas = document.getElementById('gameCanvas');
  turnLabelEl = document.getElementById('turnLabel');
  throwsLeftEl = document.getElementById('throwsLeft');
  scoreKevinEl = document.getElementById('scoreKevin');
  scoreCaseyEl = document.getElementById('scoreCasey');
  statusLineEl = document.getElementById('statusLine');
  aimHintEl = document.getElementById('aimHint');
  itemSelectEl = document.getElementById('itemSelect');
  resetBtnEl = document.getElementById('resetBtn');
  discoBtnEl = document.getElementById('discoBtn');

  if (!canvas || !turnLabelEl || !itemSelectEl || !resetBtnEl || !discoBtnEl) {
    console.error('Game init failed: missing required DOM elements.');
    return;
  }

  ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Game init failed: canvas 2D context unavailable.');
    return;
  }

  itemSelectEl.addEventListener('change', () => {
    state.projectile.item = ITEMS[Number(itemSelectEl.value)];
  });

  resetBtnEl.addEventListener('click', resetGame);
  discoBtnEl.addEventListener('click', () => {
    setDiscoMode(!state.discoMode);
  });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('pointerleave', onPointerCancel);

  window.addEventListener('resize', () => {
    const wasDragging = Boolean(state.dragCurrent);
    resizeCanvas();
    if (wasDragging) {
      state.dragStart = null;
      state.dragCurrent = null;
    }
  });

  setupItemOptions();
  updateGlobalDifficulty();
  resizeCanvas();
  setDiscoMode(false);
  state.message = getAimInstruction(opponents[0]);
  updateHud();
  previousTime = performance.now();
  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame, { once: true });
} else {
  initGame();
}
