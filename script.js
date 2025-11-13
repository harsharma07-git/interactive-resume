
/* ===== CANVAS SETUP ===== */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W = window.innerWidth;
let H = window.innerHeight;
canvas.width = W;
canvas.height = H;

window.addEventListener('resize', () => {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  initLayout();
  resetBall();
});

/* ===== ASSETS ===== */
const bgImg = new Image();
bgImg.src = 'assets/field-bg.jpg';

const goalImg = new Image();
goalImg.src = 'assets/goalpost.png';

const ballImg = new Image();
ballImg.src = 'assets/football.png';

const keeperImg = new Image();
keeperImg.src = 'assets/goalkeeper.png';

/* ===== AUDIO ===== */
const kickSound = new Audio('assets/kick.mp3');
const cheerSound = new Audio('assets/cheer.mp3');
const crowdAmbience = new Audio('assets/crowd.mp3');
const hitSound = new Audio('assets/hit.mp3');
const missSound = new Audio('assets/miss.mp3');

crowdAmbience.loop = true;
crowdAmbience.volume = 0.18;

function playOnce(audioObj, cooldown = 350) {
  if (!audioObj) return;
  const now = Date.now();
  if (!audioObj._lastPlayed || now - audioObj._lastPlayed >= cooldown) {
    try {
      audioObj.currentTime = 0;
      audioObj.play().catch(() => {});
    } catch (e) {}
    audioObj._lastPlayed = now;
  }
}

/* ===== DOM ELEMENTS ===== */
const intro = document.getElementById('intro');
const startBtn = document.getElementById('startBtn');
const hudScore = document.getElementById('score');
const hudLevel = document.getElementById('levelNum');
const hudLives = document.getElementById('lives');
const popup = document.getElementById('popup');
const popupTitle = document.getElementById('popup-title');
const popupText = document.getElementById('popup-text');
const closeBtn = document.getElementById('close-btn');
const congrats = document.getElementById('congrats');
const playAgainBtn = document.getElementById('play-again');
const endScreen = document.getElementById('end-screen');
const restartBtn = document.getElementById('restart-btn');
const powerUi = document.getElementById('power-ui');
const powerFill = document.getElementById('power-fill');
const congratsLink = document.getElementById('congrats-link');
const comboDisplay = document.getElementById('comboDisplay');
const comboCount = document.getElementById('comboCount');
const achievementBtn = document.getElementById('achievementBtn');
const achievementCount = document.getElementById('achievementCount');
const achievementPanel = document.getElementById('achievement-panel');
const closeAchievements = document.getElementById('close-achievements');
const achievementList = document.getElementById('achievement-list');
const comboNotification = document.getElementById('combo-notification');
const achievementNotification = document.getElementById('achievement-notification');
const tutorial = document.getElementById('tutorial');
const skipTutorial = document.getElementById('skip-tutorial');
const powerMeter = document.getElementById('power-meter');
const curveMeter = document.getElementById('curve-meter');

/* ===== RESUME DATA ===== */
let resumeData = {};
fetch('data/resume.json')
  .then(r => r.json())
  .then(d => resumeData = d)
  .catch(() => console.warn('resume.json not found'));

/* ===== GAME STATE ===== */
let gameStarted = false;
let score = 0;
let displayedScore = 0;
let level = 1;
let lives = 3;
let attemptsUsed = 0;
let targetsHitThisLevel = 0;
let totalTargetsHit = 0;
let combo = 0;
let comboTimer = 0;
const COMBO_WINDOW = 180;
let bestCombo = 0;

/* ===== LAYOUT ===== */
let goal = {};
let keeper = {};
let ball = {};
let targets = [];
let particles = [];
let goalFlashTimer = 0;
let trajectoryPoints = [];

function initLayout() {
  goal.w = 280;
  goal.h = 100;
  goal.x = (W - goal.w) / 2;
  goal.y = H - 485;

  keeper.w = 60;
  keeper.h = 70;
  const keeperDepthOffset = 10;
  keeper.y = goal.y + goal.h - keeper.h + keeperDepthOffset;
  keeper.x = goal.x + (goal.w - keeper.w) / 2;
  keeper.speed = 2.2;
  keeper.dir = Math.random() > 0.5 ? 1 : -1;
  keeper._justSaved = false;

  ball.r = 16;
  ball.x = W / 2;
  ball.y = H - 60;
  ball.dx = 0;
  ball.dy = 0;
  ball.spin = 0;
  ball.isMoving = false;

  targets = createTargetsForLevel(level);
}

// NEW: Create circular targets with icons
function createTargetsForLevel(lvl) {
  const targetData = [
    { label: 'Projects', icon: '💼', color: '#3b82f6' },
    { label: 'Skills', icon: '⚡', color: '#8b5cf6' },
    { label: 'Education', icon: '🎓', color: '#f59e0b' },
    { label: 'Contact', icon: '📧', color: '#10b981' }
  ];
  
  const arr = [];
  const radius = 32 - (lvl - 1) * 2; // Shrink slightly with level
  const spacing = (goal.w - 40) / (targetData.length + 1);
  
  targetData.forEach((data, i) => {
    const cx = goal.x + spacing * (i + 1);
    const cy = goal.y + 40;
    
    arr.push({
      label: data.label,
      icon: data.icon,
      color: data.color,
      cx, // Center X
      cy, // Center Y
      r: radius,
      speed: 1.2 + (lvl - 1) * 0.2,
      dir: i % 2 === 0 ? 1 : -1,
      active: true,
      glowPhase: Math.random() * Math.PI * 2 // For pulsing glow
    });
  });
  
  return arr;
}

/* ===== PARTICLES ===== */
function spawnParticles(x, y, color = '#ffdd57', count = 14) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 1.2) * 4 - 1,
      life: 30 + Math.random() * 30,
      r: 2 + Math.random() * 3,
      color
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(p.life / 60, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

/* ===== DRAWING ===== */
function drawBackground() {
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#0b6a2b';
    ctx.fillRect(0, 0, W, H);
  }
}

function drawGoal() {
  if (goalImg.complete && goalImg.naturalWidth > 0) {
    ctx.drawImage(goalImg, goal.x, goal.y, goal.w, goal.h);
  } else {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
  }
}

// NEW: Draw circular targets with glow effect
function drawTargets() {
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  targets.forEach(t => {
    if (!t.active) return;
    
    // Update glow phase for pulsing effect
    t.glowPhase += 0.05;
    const glowIntensity = 0.5 + Math.sin(t.glowPhase) * 0.3;
    
    // Draw glow
    const gradient = ctx.createRadialGradient(t.cx, t.cy, t.r * 0.5, t.cx, t.cy, t.r * 1.5);
    gradient.addColorStop(0, t.color + 'ff');
    gradient.addColorStop(0.5, t.color + '88');
    gradient.addColorStop(1, t.color + '00');
    
    ctx.globalAlpha = glowIntensity;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(t.cx, t.cy, t.r * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Draw main circle
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(t.cx, t.cy, t.r, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw icon
    ctx.fillStyle = '#fff';
    ctx.font = `${t.r * 0.8}px Arial`;
    ctx.fillText(t.icon, t.cx, t.cy - 5);
    
    // Draw label
    ctx.font = 'bold 11px Arial';
    ctx.fillText(t.label, t.cx, t.cy + t.r + 14);
  });
}

function drawKeeper() {
  const leftEdge = goal.x + 12;
  const rightEdge = goal.x + goal.w - keeper.w - 12;
  keeper.x = Math.max(leftEdge, Math.min(keeper.x, rightEdge));

  if (keeperImg.complete && keeperImg.naturalWidth > 0) {
    ctx.drawImage(keeperImg, keeper.x, keeper.y, keeper.w, keeper.h);
  } else {
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(keeper.x, keeper.y, keeper.w, keeper.h);
  }
}

function drawBall() {
  if (ballImg.complete && ballImg.naturalWidth > 0) {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    if (ball.isMoving) {
      ctx.rotate(ball.rotation || 0);
      ball.rotation = (ball.rotation || 0) + 0.2;
    }
    ctx.drawImage(ballImg, -ball.r, -ball.r, ball.r * 2, ball.r * 2);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }

  // Draw shadow
  if (ball.y < H - 30) {
    const shadowY = H - 30;
    const shadowScale = Math.max(0.3, 1 - (shadowY - ball.y) / 400);
    ctx.globalAlpha = 0.3 * shadowScale;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(ball.x, shadowY, ball.r * shadowScale, ball.r * 0.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawGoalFlash() {
  if (goalFlashTimer > 0) {
    const alpha = Math.max(goalFlashTimer / 8, 0) * 0.18;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
  }
}

function drawTrajectory() {
  if (trajectoryPoints.length === 0) return;

  ctx.save();
  ctx.setLineDash([5, 10]);
  ctx.strokeStyle = 'rgba(255, 221, 87, 0.6)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(trajectoryPoints[0].x, trajectoryPoints[0].y);

  for (let i = 1; i < trajectoryPoints.length; i++) {
    const alpha = 1 - (i / trajectoryPoints.length) * 0.7;
    ctx.globalAlpha = alpha;
    ctx.lineTo(trajectoryPoints[i].x, trajectoryPoints[i].y);
  }

  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();

  if (trajectoryPoints.length > 10) {
    const endPoint = trajectoryPoints[trajectoryPoints.length - 1];
    ctx.strokeStyle = 'rgba(255, 221, 87, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(endPoint.x, endPoint.y, 15, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ===== MOVEMENT ===== */
function moveTargets() {
  targets.forEach(t => {
    if (!t.active) return;
    t.cx += t.speed * t.dir;
    
    // Bounce off edges (with padding for circle radius)
    if (t.cx - t.r < goal.x + 20) {
      t.cx = goal.x + 20 + t.r;
      t.dir = 1;
    }
    if (t.cx + t.r > goal.x + goal.w - 20) {
      t.cx = goal.x + goal.w - 20 - t.r;
      t.dir = -1;
    }
  });
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// NEW: Circle-to-circle collision for ball and circular targets
function circleCircleCollide(c1, c2) {
  const dx = c1.x - c2.cx;
  const dy = c1.y - c2.cy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= (c1.r + c2.r);
}

function circleRectCollide(circle, rect) {
  const nearestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return (dx * dx + dy * dy) <= (circle.r * circle.r);
}

function updateKeeper() {
  keeper.x += keeper.speed * keeper.dir;
  const leftBound = goal.x + 12;
  const rightBound = goal.x + goal.w - keeper.w - 12;
  if (keeper.x <= leftBound) keeper.dir = 1;
  if (keeper.x >= rightBound) keeper.dir = -1;

  if (circleRectCollide(ball, keeper) && ball.isMoving) {
    if (!keeper._justSaved) {
      playOnce(hitSound, 250);
      playOnce(missSound, 700);
      keeper._justSaved = true;
      setTimeout(() => keeper._justSaved = false, 360);

      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    }
    attemptsUsed++;
    lives = Math.max(0, 3 - attemptsUsed);
    if (hudLives) hudLives.textContent = lives;

    resetCombo();
    resetBall();
    checkGameOver();
  }
}

function updateBall() {
  if (!ball.isMoving) return;

  ball.dx += ball.spin * 0.05;
  ball.dx *= 0.9998;
  ball.dy *= 0.9998;

  ball.x += ball.dx;
  ball.y += ball.dy;
  ball.dy += 0.42;

  if (ball.y + ball.r > H) {
    ball.y = H - ball.r;
    ball.dy *= -0.55;
    ball.dx *= 0.8;
    ball.spin *= 0.5;

    if (Math.abs(ball.dy) < 0.35 && Math.abs(ball.dx) < 0.35) {
      ball.isMoving = false;
      playOnce(missSound, 500);
      attemptsUsed++;
      lives = Math.max(0, 3 - attemptsUsed);
      if (hudLives) hudLives.textContent = lives;

      resetCombo();
      checkGameOver();
    }
  }

  if (ball.x < -120 || ball.x > W + 120 || ball.y < -300) {
    resetBall();
    playOnce(missSound, 500);
    attemptsUsed++;
    lives = Math.max(0, 3 - attemptsUsed);
    if (hudLives) hudLives.textContent = lives;
    resetCombo();
    checkGameOver();
  }

  // Check collision with circular targets
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (!t.active) continue;
    
    if (circleCircleCollide(ball, t)) {
      playOnce(hitSound, 200);
      playOnce(cheerSound, 700);
      spawnParticles(t.cx, t.cy, t.color, 20);
      t.active = false;
      targetsHitThisLevel++;
      totalTargetsHit++;

      combo++;
      comboTimer = COMBO_WINDOW;
      updateComboDisplay();

      if (combo > bestCombo) {
        bestCombo = combo;
      }

      let points = 150;
      if (combo >= 2) {
        points += combo * 50;
        showComboNotification(combo);
      }

      score += points;
      animateScoreTo(score);
      goalFlashTimer = 10;

      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }

      checkAchievements();
      showPopup(t.label);
      resetBall();

      if (targets.every(tt => !tt.active)) {
        setTimeout(() => showCongrats(), 650);
      }
      break;
    }
  }
}

function updateComboTimer() {
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer === 0) {
      resetCombo();
    }
  }
}

function resetCombo() {
  combo = 0;
  if (comboDisplay) {
    comboDisplay.classList.add('hidden');
  }
}

function updateComboDisplay() {
  if (!comboDisplay || !comboCount) return;

  if (combo >= 2) {
    comboDisplay.classList.remove('hidden');
    comboCount.textContent = combo;
  } else {
    comboDisplay.classList.add('hidden');
  }
}

function showComboNotification(comboValue) {
  if (!comboNotification) return;

  comboNotification.textContent = `${comboValue}x COMBO! +${comboValue * 50} pts`;
  comboNotification.classList.remove('hidden');

  setTimeout(() => {
    comboNotification.classList.add('hidden');
  }, 1500);
}

function resetBall() {
  ball.x = W / 2;
  ball.y = H - 60;
  ball.dx = 0;
  ball.dy = 0;
  ball.spin = 0;
  ball.isMoving = false;
  ball.rotation = 0;
  trajectoryPoints = [];

  if (powerUi) powerUi.classList.add('hidden');
  if (powerFill) powerFill.style.width = '0%';
  if (powerMeter) powerMeter.style.width = '0%';
  if (curveMeter) curveMeter.style.width = '0%';
}

function animateScoreTo(newValue, duration = 450) {
  const start = displayedScore;
  const diff = newValue - start;
  const t0 = performance.now();

  const hudEl = hudScore;
  if (hudEl) {
    hudEl.classList.add('score-flash');
    setTimeout(() => hudEl.classList.remove('score-flash'), 400);
  }

  function step(now) {
    const p = Math.min(1, (now - t0) / duration);
    displayedScore = Math.round(start + diff * p);
    if (hudScore) hudScore.textContent = displayedScore;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ===== POPUP ===== */
function showPopup(section) {
  if (!popup) return;
  popup.classList.remove('hidden');
  popupTitle.textContent = section;

  let content = '';
  switch (section.toLowerCase()) {
    case 'skills':
      content = resumeData.skills ? resumeData.skills.join(', ') : 'Skills info.';
      break;
    case 'projects':
      content = resumeData.projects ?
        resumeData.projects.map(p => `<b>${p.name}</b>: ${p.desc}`).join('<br><br>') :
        'Projects info.';
      break;
    case 'education':
      content = resumeData.education ? resumeData.education.join('<br>') : 'Education info.';
      break;
    case 'contact':
      content = resumeData.contact ?
        `📧 ${resumeData.contact.email}<br>🔗 <a href="${resumeData.contact.linkedin}" target="_blank">LinkedIn</a>` :
        'Contact info.';
      break;
    default:
      content = 'Info';
      break;
  }
  popupText.innerHTML = content;
}

closeBtn && closeBtn.addEventListener('click', () => {
  popup.classList.add('hidden');
  if (targets.every(t => !t.active)) {
    setTimeout(() => nextLevel(), 300);
  }
});

function showCongrats() {
  if (congrats) congrats.classList.remove('hidden');

  document.getElementById('final-score').textContent = score;
  document.getElementById('final-achievements').textContent = unlockedAchievements.length;
  document.getElementById('best-combo').textContent = bestCombo;

  const resumeURL = (resumeData && resumeData.contact && resumeData.contact.linkedin) || '#';
  if (congratsLink) congratsLink.href = resumeURL;

  saveProgress();
}

playAgainBtn && playAgainBtn.addEventListener('click', () => {
  if (congrats) congrats.classList.add('hidden');
  restartGame();
});

function nextLevel() {
  level++;
  if (hudLevel) hudLevel.textContent = level;
  targets = createTargetsForLevel(level);
  targetsHitThisLevel = 0;
  keeper.speed += 0.6;
}

function checkGameOver() {
  if (lives <= 0) {
    if (endScreen) endScreen.classList.remove('hidden');

    document.getElementById('end-score').textContent = score;
    document.getElementById('end-targets').textContent = totalTargetsHit;

    ball.isMoving = false;
    try {
      crowdAmbience.pause();
    } catch (e) {}

    saveProgress();
  }
}

restartBtn && restartBtn.addEventListener('click', () => {
  if (endScreen) endScreen.classList.add('hidden');
  restartGame();
});

function restartGame() {
  score = 0;
  displayedScore = 0;
  if (hudScore) hudScore.textContent = 0;
  level = 1;
  if (hudLevel) hudLevel.textContent = 1;
  lives = 3;
  if (hudLives) hudLives.textContent = 3;
  attemptsUsed = 0;
  targetsHitThisLevel = 0;
  totalTargetsHit = 0;
  combo = 0;
  bestCombo = 0;
  resetCombo();
  targets = createTargetsForLevel(level);
  resetBall();

  if (congrats) congrats.classList.add('hidden');
  if (popup) popup.classList.add('hidden');
  if (endScreen) endScreen.classList.add('hidden');

  try {
    crowdAmbience.currentTime = 0;
    crowdAmbience.play();
  } catch (e) {}
}

/* ===== INPUT HANDLING ===== */
canvas.style.touchAction = 'none';
let aiming = false;
let aimStart = null;
let aimCurrent = null;

function pointerToGame(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX);
  const clientY = e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY);
  return {
    x: (clientX - rect.left) * (W / rect.width),
    y: (clientY - rect.top) * (H / rect.height)
  };
}

function calculateTrajectory(startX, startY, vx, vy, spin) {
  const points = [];
  let x = startX;
  let y = startY;
  let dx = vx;
  let dy = vy;

  for (let i = 0; i < 100; i++) {
    dx += spin * 0.05;
    dx *= 0.9998;
    dy *= 0.9998;
    dy += 0.42;

    x += dx;
    y += dy;

    points.push({
      x,
      y
    });

    if (y > H - 30 || x < -100 || x > W + 100 || y < -100) {
      break;
    }

    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && i > 20) {
      break;
    }
  }

  return points;
}

canvas.addEventListener('pointerdown', ev => {
  if (ball.isMoving || !gameStarted) return;
  ev.preventDefault();
  aiming = true;
  aimStart = pointerToGame(ev);
  aimCurrent = aimStart;

  if (powerUi) powerUi.classList.remove('hidden');
  if (powerFill) powerFill.style.width = '0%';
  if (powerMeter) powerMeter.style.width = '0%';
  if (curveMeter) curveMeter.style.width = '0%';

  canvas.classList.add('aiming');
});

canvas.addEventListener('pointermove', ev => {
  if (!aiming) return;
  aimCurrent = pointerToGame(ev);

  const dx = aimCurrent.x - aimStart.x;
  const dy = aimCurrent.y - aimStart.y;
  const dist = Math.hypot(dx, dy);

  const powerPercent = clamp((dist / 30) * 100, 0, 100);
  if (powerFill) powerFill.style.width = powerPercent + '%';
  if (powerMeter) powerMeter.style.width = powerPercent + '%';

  const curveAmount = Math.abs(aimStart.x - aimCurrent.x) / 50;
  const curvePercent = clamp(curveAmount * 100, 0, 100);
  if (curveMeter) curveMeter.style.width = curvePercent + '%';

  const angle = Math.atan2(aimCurrent.y - ball.y, aimCurrent.x - ball.x);
  const power = clamp(dist / 9, 8, 34);
  const spin = clamp((aimStart.x - aimCurrent.x) / 50, -2.4, 2.4);

  const vx = Math.cos(angle) * power;
  const vy = Math.sin(angle) * power;

  trajectoryPoints = calculateTrajectory(ball.x, ball.y, vx, vy, spin);
});

window.addEventListener('pointerup', ev => {
  if (!aiming) return;
  aiming = false;
  canvas.classList.remove('aiming');

  if (powerUi) powerUi.classList.add('hidden');

  const end = pointerToGame(ev);
  const angle = Math.atan2(end.y - ball.y, end.x - ball.x);
  const rawDist = Math.hypot(end.x - ball.x, end.y - ball.y);
  const power = clamp(rawDist / 9, 8, 34);
  const spin = clamp((aimStart.x - end.x) / 50, -2.4, 2.4);

  ball.dx = Math.cos(angle) * power;
  ball.dy = Math.sin(angle) * power;
  ball.spin = spin;
  ball.isMoving = true;

  trajectoryPoints = [];
  playOnce(kickSound, 240);
});

/* ===== START BUTTON ===== */
startBtn && startBtn.addEventListener('click', () => {
  if (intro) intro.classList.add('hidden');
  gameStarted = true;

  const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
  if (!hasSeenTutorial && tutorial) {
    tutorial.classList.remove('hidden');
  }

  try {
    crowdAmbience.currentTime = 0;
    crowdAmbience.play();
  } catch (e) {}

  loadProgress();
});

/* ===== TUTORIAL ===== */
skipTutorial && skipTutorial.addEventListener('click', () => {
  if (tutorial) tutorial.classList.add('hidden');
  localStorage.setItem('hasSeenTutorial', 'true');
});

/* ===== ACHIEVEMENT SYSTEM ===== */
const achievements = [
  {
    id: 'first_goal',
    title: 'First Goal',
    description: 'Hit your first target',
    icon: '⚽',
    check: () => totalTargetsHit >= 1
  },
  {
    id: 'hat_trick',
    title: 'Hat Trick',
    description: 'Hit 3 targets in one game',
    icon: '🎩',
    check: () => totalTargetsHit >= 3
  },
  {
    id: 'perfect_aim',
    title: 'Perfect Aim',
    description: 'Complete a level without missing',
    icon: '🎯',
    check: () => targetsHitThisLevel === 4 && attemptsUsed === targetsHitThisLevel
  },
  {
    id: 'combo_master',
    title: 'Combo Master',
    description: 'Get a 3x combo',
    icon: '⚡',
    check: () => combo >= 3
  },
  {
    id: 'high_scorer',
    title: 'High Scorer',
    description: 'Score 1000+ points',
    icon: '💯',
    check: () => score >= 1000
  },
  {
    id: 'level_up',
    title: 'Level Up',
    description: 'Reach level 2',
    icon: '📈',
    check: () => level >= 2
  },
  {
    id: 'survivor',
    title: 'Survivor',
    description: 'Complete a level with all 3 lives',
    icon: '❤️',
    check: () => targets.every(t => !t.active) && lives === 3
  },
  {
    id: 'completionist',
    title: 'Completionist',
    description: 'Unlock all resume sections',
    icon: '🏆',
    check: () => targets.every(t => !t.active)
  }
];

let unlockedAchievements = [];

function checkAchievements() {
  achievements.forEach(achievement => {
    if (unlockedAchievements.includes(achievement.id)) return;

    if (achievement.check()) {
      unlockedAchievements.push(achievement.id);
      showAchievementNotification(achievement);
      updateAchievementCount();

      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
      }
    }
  });
}

function showAchievementNotification(achievement) {
  if (!achievementNotification) return;

  const title = achievementNotification.querySelector('.achievement-title');
  const desc = achievementNotification.querySelector('.achievement-desc');
  const icon = achievementNotification.querySelector('.achievement-icon');

  if (title) title.textContent = achievement.title;
  if (desc) desc.textContent = achievement.description;
  if (icon) icon.textContent = achievement.icon;

  achievementNotification.classList.remove('hidden');

  setTimeout(() => {
    achievementNotification.classList.add('hidden');
  }, 3000);
}

function updateAchievementCount() {
  if (achievementCount) {
    achievementCount.textContent = unlockedAchievements.length;
  }
}

function renderAchievements() {
  if (!achievementList) return;

  achievementList.innerHTML = '';

  achievements.forEach(achievement => {
    const unlocked = unlockedAchievements.includes(achievement.id);

    const item = document.createElement('div');
    item.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;

    item.innerHTML = `
      <div class="achievement-item-icon">${achievement.icon}</div>
      <div class="achievement-item-title">${achievement.title}</div>
      <div class="achievement-item-desc">${achievement.description}</div>
    `;

    achievementList.appendChild(item);
  });
}

achievementBtn && achievementBtn.addEventListener('click', () => {
  if (achievementPanel) {
    achievementPanel.classList.remove('hidden');
    renderAchievements();
  }
});

closeAchievements && closeAchievements.addEventListener('click', () => {
  if (achievementPanel) {
    achievementPanel.classList.add('hidden');
  }
});

/* ===== PROGRESS SAVING ===== */
function saveProgress() {
  const progress = {
    bestScore: Math.max(score, parseInt(localStorage.getItem('bestScore') || '0')),
    bestCombo: Math.max(bestCombo, parseInt(localStorage.getItem('bestCombo') || '0')),
    totalTargetsHit: totalTargetsHit + parseInt(localStorage.getItem('totalTargetsHit') || '0'),
    unlockedAchievements: Array.from(new Set([
      ...unlockedAchievements,
      ...(JSON.parse(localStorage.getItem('unlockedAchievements') || '[]'))
    ])),
    gamesPlayed: parseInt(localStorage.getItem('gamesPlayed') || '0') + 1
  };

  localStorage.setItem('bestScore', progress.bestScore.toString());
  localStorage.setItem('bestCombo', progress.bestCombo.toString());
  localStorage.setItem('totalTargetsHit', progress.totalTargetsHit.toString());
  localStorage.setItem('unlockedAchievements', JSON.stringify(progress.unlockedAchievements));
  localStorage.setItem('gamesPlayed', progress.gamesPlayed.toString());
}

function loadProgress() {
  const savedAchievements = JSON.parse(localStorage.getItem('unlockedAchievements') || '[]');
  unlockedAchievements = savedAchievements;
  updateAchievementCount();
}

/* ===== MAIN LOOP ===== */
function loop() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);

  drawBackground();
  drawGoal();
  drawTargets();
  drawKeeper();

  if (aiming) {
    drawTrajectory();
  }

  drawBall();
  drawParticles();

  if (goalFlashTimer > 0) {
    drawGoalFlash();
    goalFlashTimer--;
  }

  if (gameStarted) {
    moveTargets();
    updateKeeper();
    updateBall();
    updateParticles();
    updateComboTimer();
  }

  requestAnimationFrame(loop);
}

/* ===== INITIALIZATION ===== */
function start() {
  initLayout();
  resetBall();
  if (hudScore) hudScore.textContent = 0;
  if (hudLevel) hudLevel.textContent = level;
  if (hudLives) hudLives.textContent = lives;

  loadProgress();

  loop();
}

start();

/* ===== UTILITY FUNCTIONS ===== */
window.__game = {
  resetBall,
  restartGame,
  createTargetsForLevel,
  initLayout,
  saveProgress,
  loadProgress,
  achievements,
  unlockedAchievements
};

console.log('🎮 Enhanced Gamified Resume loaded!');
console.log('🎯 Circular targets with no overlap');
console.log('💾 Progress auto-saves to localStorage');
console.log('🏆 Total achievements:', achievements.length);