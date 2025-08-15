(() => {
  // Canvas setup
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // UI elements
  const countFoodEl = document.getElementById('count-food');
  const countWaterEl = document.getElementById('count-water');
  const countWoodEl = document.getElementById('count-wood');
  const fpsEl = document.getElementById('fps');
  const startScreenEl = document.getElementById('start-screen');
  const startBtnEl = document.getElementById('start-btn');
  const characterStatsEl = document.getElementById('character-stats');
  const healthFillEl = document.getElementById('health-fill');
  const healthTextEl = document.getElementById('health-text');
  const currentLocationEl = document.getElementById('current-location');
  const survivalOddsEl = document.getElementById('survival-odds');

  // Utility helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const randRange = (a, b) => a + Math.random() * (b - a);
  const dist2 = (x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1;
    return dx * dx + dy * dy;
  };
  const length = (x, y) => Math.hypot(x, y);

  // Character generation system
  const CHARACTER_TRAITS = {
    skinTones: [
      { name: 'Light', color: '#fdbcb4', hex: '#fdbcb4' },
      { name: 'Medium', color: '#edb98a', hex: '#edb98a' },
      { name: 'Tan', color: '#d08b5b', hex: '#d08b5b' },
      { name: 'Dark', color: '#8d5524', hex: '#8d5524' },
      { name: 'Deep', color: '#5d4037', hex: '#5d4037' }
    ],
    hairColors: [
      { name: 'Blonde', color: '#faf0be', hex: '#faf0be' },
      { name: 'Brown', color: '#8b4513', hex: '#8b4513' },
      { name: 'Black', color: '#2f2f2f', hex: '#2f2f2f' },
      { name: 'Red', color: '#cc4125', hex: '#cc4125' },
      { name: 'Auburn', color: '#a52a2a', hex: '#a52a2a' },
      { name: 'Gray', color: '#808080', hex: '#808080' }
    ],
    builds: [
      { name: 'Slim', multiplier: 0.8 },
      { name: 'Average', multiplier: 1.0 },
      { name: 'Stocky', multiplier: 1.2 },
      { name: 'Athletic', multiplier: 0.9 },
      { name: 'Heavy', multiplier: 1.3 }
    ],
    heights: [
      { name: 'Short', multiplier: 0.7 },
      { name: 'Average', multiplier: 1.0 },
      { name: 'Tall', multiplier: 1.3 },
      { name: 'Very Tall', multiplier: 1.5 }
    ]
  };

  function generateRandomCharacter() {
    const skinTone = CHARACTER_TRAITS.skinTones[Math.floor(Math.random() * CHARACTER_TRAITS.skinTones.length)];
    const hairColor = CHARACTER_TRAITS.hairColors[Math.floor(Math.random() * CHARACTER_TRAITS.hairColors.length)];
    const build = CHARACTER_TRAITS.builds[Math.floor(Math.random() * CHARACTER_TRAITS.builds.length)];
    const height = CHARACTER_TRAITS.heights[Math.floor(Math.random() * CHARACTER_TRAITS.heights.length)];
    
    const strength = Math.floor(Math.random() * 20) + 60; // 60-79
    const agility = Math.floor(Math.random() * 20) + 60; // 60-79
    const endurance = Math.floor(Math.random() * 20) + 60; // 60-79
    const intelligence = Math.floor(Math.random() * 20) + 60; // 60-79
    
    return {
      skinTone,
      hairColor,
      build,
      height,
      strength,
      agility,
      endurance,
      intelligence
    };
  }

  function displayCharacterStats(character) {
    characterStatsEl.innerHTML = `
      <div class="character-stat">
        <span class="character-stat-name">Skin:</span>
        <span>${character.skinTone.name}</span>
      </div>
      <div class="character-stat">
        <span class="character-stat-name">Hair:</span>
        <span>${character.hairColor.name}</span>
      </div>
      <div class="character-stat">
        <span class="character-stat-name">Build:</span>
        <span>${character.build.name}</span>
      </div>
      <div class="character-stat">
        <span class="character-stat-name">Height:</span>
        <span>${character.height.name}</span>
      </div>
      <div class="character-stat">
        <span class="character-stat-name">Strength:</span>
        <span>${character.strength}</span>
      </div>
      <div class="character-stat">
        <span class="character-stat-name">Agility:</span>
        <span>${character.agility}</span>
      </div>
      <div class="character-stat">
        <span class="character-stat-name">Endurance:</span>
        <span>${character.endurance}</span>
      </div>
      <div class="character-stat">
        <span class="character-stat-name">Intelligence:</span>
        <span>${character.intelligence}</span>
      </div>
    `;
  }

  // Biome/Location system
  const BIOMES = [
    {
      name: 'Peaceful Meadow',
      color: '#7fb069',
      healthRate: 0.5, // Health gained per second
      maxHealth: 150, // Higher max health in safe areas
      description: 'A safe, green meadow with healing herbs',
      spawnChance: 0.3
    },
    {
      name: 'Dense Forest',
      color: '#2d5016',
      healthRate: 0, // Neutral
      maxHealth: 100, // Standard max health
      description: 'A thick forest with moderate danger',
      spawnChance: 0.25
    },
    {
      name: 'Rocky Desert',
      color: '#d4a574',
      healthRate: -2, // Health lost per second
      maxHealth: 80, // Reduced max health in harsh areas
      description: 'A harsh desert that drains your energy',
      spawnChance: 0.2
    },
    {
      name: 'Frozen Tundra',
      color: '#a8dadc',
      healthRate: -3, // Health lost per second
      maxHealth: 70, // Further reduced in very harsh areas
      description: 'A freezing wasteland',
      spawnChance: 0.15
    },
    {
      name: 'Toxic Swamp',
      color: '#606c38',
      healthRate: -5, // Health lost per second
      maxHealth: 60, // Lowest max health in most dangerous area
      description: 'A dangerous swamp filled with poison',
      spawnChance: 0.1
    }
  ];

  // Health system
  const health = {
    current: 100,
    max: 100,
    lastUpdate: 0
  };

  // Current biome
  let currentBiome = null;

  function chooseRandomBiome() {
    let totalChance = BIOMES.reduce((sum, biome) => sum + biome.spawnChance, 0);
    let random = Math.random() * totalChance;
    
    for (const biome of BIOMES) {
      random -= biome.spawnChance;
      if (random <= 0) {
        return biome;
      }
    }
    return BIOMES[0]; // Fallback to first biome
  }

  function calculateSurvivalOdds(biome) {
    // Base survival calculation based on health rate
    if (biome.healthRate > 0) {
      // Healing biomes have very high survival odds
      return 95;
    } else if (biome.healthRate === 0) {
      // Neutral biomes have good survival odds
      return 75;
    } else {
      // Harmful biomes: worse survival odds based on how negative the health rate is
      // healthRate of -2 = 60%, -3 = 45%, -5 = 25%
      const baseOdds = 85;
      const penalty = Math.abs(biome.healthRate) * 10;
      return Math.max(15, baseOdds - penalty);
    }
  }

  function updateHealthSystem(dt) {
    if (!currentBiome) return;
    
    const now = performance.now();
    health.lastUpdate = now;
    
    // Apply health rate from current biome
    health.current += currentBiome.healthRate * dt;
    health.current = Math.max(0, Math.min(health.max, health.current));
    
    // Update UI
    const healthPercent = (health.current / health.max) * 100;
    healthFillEl.style.width = `${healthPercent}%`;
    healthTextEl.textContent = Math.round(health.current);
    
    // Game over check
    if (health.current <= 0) {
      gameOver();
    }
  }

  function gameOver() {
    gameRunning = false;
    alert(`Game Over! You survived in the ${currentBiome.name}.\nFinal Health: 0\nItems Collected: Food ${INVENTORY.food}, Water ${INVENTORY.water}, Wood ${INVENTORY.wood}`);
    
    // Reset and show start screen
    health.current = health.max;
    INVENTORY.food = 0;
    INVENTORY.water = 0;
    INVENTORY.wood = 0;
    updateInventoryUI();
    startScreenEl.classList.remove('hidden');
  }

  function setCurrentBiome(biome) {
    currentBiome = biome;
    currentLocationEl.textContent = biome.name;
    
    // Update max health based on biome
    const oldMaxHealth = health.max;
    health.max = biome.maxHealth;
    
    // Adjust current health proportionally if max health changed
    if (oldMaxHealth !== health.max) {
      const healthRatio = health.current / oldMaxHealth;
      health.current = Math.min(health.max, healthRatio * health.max);
    }
    
    // Calculate and display survival odds
    const survivalOdds = calculateSurvivalOdds(biome);
    survivalOddsEl.textContent = `${survivalOdds}%`;
    
    // Change background to reflect biome
    document.body.style.background = `radial-gradient(1200px 800px at 70% 10%, ${biome.color}33 0%, #0f1221 60%, #0b0e1a 100%)`;
  }

  // World bounds
  const world = {
    w: () => canvas.width,
    h: () => canvas.height,
    padding: 24
  };

  // Player config
  const player = {
    x: world.w() * 0.5,
    y: world.h() * 0.5,
    r: 14,
    speed: 260, // px/sec
    velX: 0,
    velY: 0,
    maxVel: 400,
    target: null, // {x,y}
    lastClickTime: 0,
    character: null, // Will be set when game starts
  };

  // Target indicator pulses
  const indicators = []; // {x,y,ttl,life,color}
  function addIndicator(x, y, color = '#ff6b6b', ttl = 0.7) {
    indicators.push({ x, y, ttl, life: 0, color });
  }

  // Inventory / Items
  const INVENTORY = { food: 0, water: 0, wood: 0 };
  function updateInventoryUI() {
    countFoodEl.textContent = INVENTORY.food;
    countWaterEl.textContent = INVENTORY.water;
    countWoodEl.textContent = INVENTORY.wood;
  }
  updateInventoryUI();

  const ITEM_TYPES = [
    { key: 'food', color: '#2ecc71', emoji: '🍎', radius: 12, weight: 1.0 },
    { key: 'water', color: '#3498db', emoji: '💧', radius: 12, weight: 1.0 },
    { key: 'wood', color: '#c28c53', emoji: '🪵', radius: 14, weight: 0.8 },
  ];

  const items = []; // {id,type,x,y,radius,color,emoji,spawnTime}
  let nextItemId = 1;

  function chooseWeighted(arr, weightKey = 'weight') {
    const total = arr.reduce((s, it) => s + (it[weightKey] ?? 1), 0);
    let r = Math.random() * total;
    for (const it of arr) {
      r -= (it[weightKey] ?? 1);
      if (r <= 0) return it;
    }
    return arr[arr.length - 1];
  }

  function canPlace(x, y, radius) {
    const pad = 6;
    if (x < world.padding + radius || x > world.w() - world.padding - radius) return false;
    if (y < world.padding + radius || y > world.h() - world.padding - radius) return false;
    // Avoid spawning right on top of player
    const minDist = player.r + radius + 30;
    if (dist2(x, y, player.x, player.y) < minDist * minDist) return false;
    // Avoid overlapping existing items too much
    for (const it of items) {
      const minD = radius + it.radius + pad;
      if (dist2(x, y, it.x, it.y) < minD * minD) return false;
    }
    return true;
  }

  function spawnItem() {
    if (items.length >= 60) return;
    const type = chooseWeighted(ITEM_TYPES);
    let tries = 0;
    while (tries++ < 40) {
      const x = randRange(world.padding, world.w() - world.padding);
      const y = randRange(world.padding, world.h() - world.padding);
      if (canPlace(x, y, type.radius)) {
        items.push({
          id: nextItemId++,
          type: type.key,
          color: type.color,
          emoji: type.emoji,
          radius: type.radius,
          x, y,
          spawnTime: performance.now(),
        });
        break;
      }
    }
  }

  // Spawner timing
  let spawnAccumulator = 0;
  let spawnInterval = 1200; // ms
  const spawnIntervalMin = 600;
  const spawnIntervalMax = 1800;

  function randomizeSpawnInterval() {
    spawnInterval = Math.floor(randRange(spawnIntervalMin, spawnIntervalMax));
  }
  randomizeSpawnInterval();

  // Input handling
  function screenToWorld(ev) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(ev.clientX - rect.left, 0, world.w()),
      y: clamp(ev.clientY - rect.top, 0, world.h()),
    };
  }

  function setMoveTarget(x, y, indicatorColor) {
    player.target = { x, y };
    addIndicator(x, y, indicatorColor);
    player.lastClickTime = performance.now();
  }

  canvas.addEventListener('click', (ev) => {
    const p = screenToWorld(ev);
    setMoveTarget(p.x, p.y, '#6c7cff'); // left click = blue target
  });

  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    const p = screenToWorld(ev);
    setMoveTarget(p.x, p.y, '#ff6b6b'); // right click = red target
  });

  // Simple movement towards target with acceleration/deceleration
  const ACCEL = 2400;
  const DECEL = 2600;

  function updatePlayer(dt) {
    // Compute desired velocity towards target
    let desiredVX = 0, desiredVY = 0;
    if (player.target) {
      const dx = player.target.x - player.x;
      const dy = player.target.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d > 1e-3) {
        desiredVX = (dx / d) * player.speed;
        desiredVY = (dy / d) * player.speed;
      }
      // Arrive behavior: slow down near target
      const arriveRadius = 60;
      if (d < arriveRadius) {
        const scale = clamp(d / arriveRadius, 0.2, 1.0);
        desiredVX *= scale;
        desiredVY *= scale;
      }
      if (d < 4) {
        // Reached target
        player.target = null;
        desiredVX = 0;
        desiredVY = 0;
      }
    }

    // Accelerate towards desired velocity
    const ax = clamp(desiredVX - player.velX, -ACCEL, ACCEL);
    const ay = clamp(desiredVY - player.velY, -ACCEL, ACCEL);
    player.velX += ax * dt;
    player.velY += ay * dt;

    // Apply deceleration if no target
    if (!player.target) {
      const v = Math.hypot(player.velX, player.velY);
      if (v > 0) {
        const decel = DECEL * dt;
        const nv = Math.max(0, v - decel);
        const s = nv / (v || 1);
        player.velX *= s;
        player.velY *= s;
      }
    }

    // Clamp velocity
    const v2 = player.velX * player.velX + player.velY * player.velY;
    if (v2 > player.maxVel * player.maxVel) {
      const v = Math.sqrt(v2);
      player.velX = (player.velX / v) * player.maxVel;
      player.velY = (player.velY / v) * player.maxVel;
    }

    // Integrate position
    player.x += player.velX * dt;
    player.y += player.velY * dt;

    // Clamp within world
    const pad = player.r + 2;
    player.x = clamp(player.x, pad, world.w() - pad);
    player.y = clamp(player.y, pad, world.h() - pad);
  }

  // Particles on collect
  const particles = []; // {x,y,dx,dy,life,ttl,color}
  function burst(x, y, color) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = randRange(60, 160);
      particles.push({
        x, y,
        dx: Math.cos(a) * s,
        dy: Math.sin(a) * s,
        life: 0,
        ttl: randRange(0.3, 0.6),
        color,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      p.x += p.dx * dt;
      p.y += p.dy * dt;
      // drag
      p.dx *= (1 - 3.5 * dt);
      p.dy *= (1 - 3.5 * dt);
      if (p.life >= p.ttl) {
        particles.splice(i, 1);
      }
    }
  }

  // Collect items on overlap
  function tryCollect() {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const minD = player.r + it.radius;
      if (dist2(player.x, player.y, it.x, it.y) <= minD * minD) {
        INVENTORY[it.type] = (INVENTORY[it.type] || 0) + 1;
        updateInventoryUI();
        burst(it.x, it.y, it.color);
        
        // Health benefits from items
        if (it.type === 'food') {
          health.current = Math.min(health.max, health.current + 15);
        } else if (it.type === 'water') {
          health.current = Math.min(health.max, health.current + 10);
        } else if (it.type === 'wood') {
          health.current = Math.min(health.max, health.current + 5);
        }
        updateHealthSystem(0);
        
        items.splice(i, 1);
      }
    }
  }

  // Drawing helpers
  function drawGrid() {
    const step = 48;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.lineWidth = 1;
    for (let x = (Math.floor(0 / step) * step); x < world.w(); x += step) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, world.h());
      ctx.stroke();
    }
    for (let y = (Math.floor(0 / step) * step); y < world.h(); y += step) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(world.w(), y + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawIndicators(dt) {
    for (let i = indicators.length - 1; i >= 0; i--) {
      const ind = indicators[i];
      ind.life += dt;
      const t = clamp(ind.life / ind.ttl, 0, 1);
      const r0 = 8 + t * 28;
      const alpha = 1 - t;
      ctx.beginPath();
      ctx.arc(ind.x, ind.y, r0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${hexToRgb(ind.color)}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (t >= 1) indicators.splice(i, 1);
    }
  }

  function drawPlayer() {
    if (!player.character) return; // Don't draw if no character generated yet
    
    const char = player.character;
    const heightMult = char.height.multiplier;
    const buildMult = char.build.multiplier;
    
    // Shadow
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 8, player.r * buildMult, player.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // Body (torso)
    const bodyHeight = player.r * 1.2 * heightMult;
    const bodyWidth = player.r * 0.8 * buildMult;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 2, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4a4a4a'; // Shirt color
    ctx.fill();

    // Head
    const headRadius = player.r * 0.6;
    ctx.beginPath();
    ctx.arc(player.x, player.y - bodyHeight + headRadius, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = char.skinTone.color;
    ctx.fill();

    // Hair
    ctx.beginPath();
    ctx.arc(player.x, player.y - bodyHeight + headRadius - 2, headRadius * 1.1, Math.PI, Math.PI * 2);
    ctx.fillStyle = char.hairColor.color;
    ctx.fill();

    // Eyes
    const eyeY = player.y - bodyHeight + headRadius - 2;
    ctx.beginPath();
    ctx.arc(player.x - 3, eyeY, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#2d2f3f';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 3, eyeY, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#2d2f3f';
    ctx.fill();

    // Arms
    const armLength = player.r * 0.8;
    const armY = player.y - bodyHeight * 0.2;
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = char.skinTone.color;
    ctx.moveTo(player.x - bodyWidth, armY);
    ctx.lineTo(player.x - bodyWidth - armLength * 0.5, armY + armLength * 0.3);
    ctx.stroke();
    ctx.moveTo(player.x + bodyWidth, armY);
    ctx.lineTo(player.x + bodyWidth + armLength * 0.5, armY + armLength * 0.3);
    ctx.stroke();

    // Legs
    const legLength = player.r * 1.0 * heightMult;
    const legY = player.y + bodyHeight;
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#2a2a2a'; // Pants color
    ctx.moveTo(player.x - bodyWidth * 0.3, legY);
    ctx.lineTo(player.x - bodyWidth * 0.2, legY + legLength);
    ctx.stroke();
    ctx.moveTo(player.x + bodyWidth * 0.3, legY);
    ctx.lineTo(player.x + bodyWidth * 0.2, legY + legLength);
    ctx.stroke();

    // Direction indicator (small arrow above head)
    if (player.target) {
      const vx = player.velX, vy = player.velY;
      const v = length(vx, vy);
      if (v > 1) {
        const ex = vx / v;
        const ey = vy / v;
        const arrowY = player.y - bodyHeight - headRadius - 8;
        const arrowSize = 5;
        
        ctx.beginPath();
        ctx.fillStyle = '#6c7cff';
        ctx.moveTo(player.x + ex * arrowSize, arrowY + ey * arrowSize);
        ctx.lineTo(player.x - ex * arrowSize + ey * arrowSize * 0.5, arrowY - ey * arrowSize - ex * arrowSize * 0.5);
        ctx.lineTo(player.x - ex * arrowSize - ey * arrowSize * 0.5, arrowY - ey * arrowSize + ex * arrowSize * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Target line
    if (player.target) {
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.target.x, player.target.y);
      ctx.strokeStyle = 'rgba(108,124,255,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawItems(now) {
    for (const it of items) {
      // Glow pulse
      const age = (now - it.spawnTime) / 1000;
      const glow = (Math.sin(age * 4) * 0.5 + 0.5) * 0.25 + 0.35;

      // Shadow
      ctx.beginPath();
      ctx.arc(it.x, it.y + 3, it.radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();

      // Bubble
      const colorRgb = hexToRgb(it.color);
      ctx.beginPath();
      ctx.arc(it.x, it.y, it.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${colorRgb}, 0.85)`;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(${colorRgb}, ${0.5 + glow * 0.3})`;
      ctx.stroke();

      // Emoji/icon
      ctx.font = `${Math.floor(it.radius * 1.4)}px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(it.emoji, it.x, it.y + 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const t = p.life / p.ttl;
      const alpha = 1 - t;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${hexToRgb(p.color)}, ${alpha.toFixed(3)})`;
      ctx.arc(p.x, p.y, 2 + 2 * (1 - alpha), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `${r}, ${g}, ${b}`;
  }

  // Game state management
  let gameStarted = false;
  let gameRunning = false;

  function startGame() {
    // Generate character
    player.character = generateRandomCharacter();
    
    // Choose spawn biome
    const spawnBiome = chooseRandomBiome();
    setCurrentBiome(spawnBiome);
    
    // Reset health to biome's max health
    health.current = health.max;
    updateHealthSystem(0);
    
    // Reset player position
    player.x = world.w() * 0.5;
    player.y = world.h() * 0.5;
    player.velX = 0;
    player.velY = 0;
    player.target = null;
    
    // Reset inventory
    INVENTORY.food = 0;
    INVENTORY.water = 0;
    INVENTORY.wood = 0;
    updateInventoryUI();
    
    // Hide start screen
    startScreenEl.classList.add('hidden');
    
    // Clear any existing items and respawn
    items.length = 0;
    for (let i = 0; i < 12; i++) spawnItem();
    
    // Start game
    gameStarted = true;
    gameRunning = true;
    
    // Start main loop if not already running
    if (!lastTime) {
      lastTime = performance.now();
      requestAnimationFrame(frame);
    }
  }

  // Main loop
  let lastTime = 0;
  let fpsAccum = 0, fpsFrames = 0, fpsValue = 0;

  function frame(now) {
    if (!gameRunning) return;
    
    const dt = Math.min(0.033, (now - lastTime) / 1000); // clamp to 30 FPS delta
    lastTime = now;

    // Update
    spawnAccumulator += dt * 1000;
    if (spawnAccumulator >= spawnInterval) {
      spawnAccumulator = 0;
      spawnItem();
      randomizeSpawnInterval();
    }

    updatePlayer(dt);
    tryCollect();
    updateParticles(dt);
    updateHealthSystem(dt);

    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawItems(now);
    drawParticles();
    drawIndicators(dt);
    drawPlayer();

    // FPS meter
    fpsAccum += dt; fpsFrames++;
    if (fpsAccum >= 0.5) {
      fpsValue = Math.round(fpsFrames / fpsAccum);
      fpsEl.textContent = `${fpsValue} FPS`;
      fpsAccum = 0; fpsFrames = 0;
    }

    requestAnimationFrame(frame);
  }

  // Initialize start screen
  function initStartScreen() {
    const previewCharacter = generateRandomCharacter();
    displayCharacterStats(previewCharacter);
    
    startBtnEl.addEventListener('click', startGame);
  }

  // Initialize the game
  initStartScreen();
})();