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
  const locationDescriptionEl = document.getElementById('location-description');
  const musicToggleEl = document.getElementById('music-toggle');
  const musicVolumeEl = document.getElementById('music-volume');

  // Utility helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const randRange = (a, b) => a + Math.random() * (b - a);
  const dist2 = (x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1;
    return dx * dx + dy * dy;
  };
  const length = (x, y) => Math.hypot(x, y);

  // Music Manager for biome-based ambient soundscapes
  class MusicManager {
    constructor() {
      this.audioContext = null;
      this.masterGain = null;
      this.currentScene = null;
      this.enabled = true;
      this.volume = 0.5;
      this.scheduledSounds = [];
    }

    async resume() {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = this.enabled ? this.volume * 0.3 : 0; // Keep overall volume modest
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    }

    setEnabled(enabled) {
      this.enabled = enabled;
      if (this.masterGain) {
        this.masterGain.gain.value = enabled ? this.volume * 0.3 : 0;
      }
    }

    setVolume(volume) {
      this.volume = volume;
      if (this.masterGain && this.enabled) {
        this.masterGain.gain.value = volume * 0.3;
      }
    }

    setBiome(biome) {
      this.stopCurrentScene();
      if (!this.audioContext || !this.enabled) return;

      const biomeKey = biome.name.split(',')[0].toLowerCase(); // e.g., "canterbury"
      
      switch (biomeKey) {
        case 'canterbury':
          this.startCanterburyScene();
          break;
        case 'manaus':
          this.startManausScene();
          break;
        case 'phoenix':
          this.startPhoenixScene();
          break;
        case 'yakutsk':
          this.startYakutskScene();
          break;
        case 'lagos':
          this.startLagosScene();
          break;
      }
    }

    stopCurrentScene() {
      // Clear any scheduled sounds
      this.scheduledSounds.forEach(id => clearInterval(id));
      this.scheduledSounds = [];
      
      // Stop current scene (oscillators will be garbage collected)
      this.currentScene = null;
    }

    // Canterbury: calm major chord pad + gentle sine arpeggio
    startCanterburyScene() {
      if (!this.audioContext) return;
      
      const now = this.audioContext.currentTime;
      
      // Major chord pad (C-E-G)
      const createPadOsc = (freq) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        gain.gain.value = 0.15;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        return { osc, gain, filter };
      };

      // Pad oscillators
      createPadOsc(130.81); // C3
      createPadOsc(164.81); // E3
      createPadOsc(196.00); // G3

      // Gentle arpeggio
      const arpeggioFreqs = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      let arpeggioIndex = 0;
      
      const playArpeggioNote = () => {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const now = this.audioContext.currentTime;
        
        osc.type = 'sine';
        osc.frequency.value = arpeggioFreqs[arpeggioIndex];
        gain.gain.value = 0;
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        // Envelope: fade in and out
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        osc.start(now);
        osc.stop(now + 1.5);
        
        arpeggioIndex = (arpeggioIndex + 1) % arpeggioFreqs.length;
      };

      // Play arpeggio notes every 2-3 seconds
      playArpeggioNote();
      const arpeggioInterval = setInterval(() => {
        playArpeggioNote();
      }, randRange(2000, 3500));
      
      this.scheduledSounds.push(arpeggioInterval);
    }

    // Manaus: soft marimba-like plucks with light noise "rain" shimmer
    startManausScene() {
      if (!this.audioContext) return;

      // Rain shimmer (filtered noise)
      const noise = this.audioContext.createBufferSource();
      const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < output.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const noiseFilter = this.audioContext.createBiquadFilter();
      const noiseGain = this.audioContext.createGain();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 8000;
      noiseFilter.Q.value = 0.5;
      noiseGain.gain.value = 0.03;

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start();

      // Marimba-like plucks
      const pentatonicFreqs = [220, 247.5, 275, 330, 370]; // A pentatonic
      
      const playMarimbaNote = () => {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const now = this.audioContext.currentTime;
        
        osc.type = 'sine';
        osc.frequency.value = pentatonicFreqs[Math.floor(Math.random() * pentatonicFreqs.length)];
        filter.type = 'lowpass';
        filter.frequency.value = 1200;
        gain.gain.value = 0;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        // Sharp attack, quick decay like marimba
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc.start(now);
        osc.stop(now + 0.8);
      };

      // Random marimba plucks
      const marimbaInterval = setInterval(() => {
        playMarimbaNote();
      }, randRange(3000, 6000));
      
      this.scheduledSounds.push(marimbaInterval);
    }

    // Phoenix: sparse minor pentatonic with warm low-pass pad
    startPhoenixScene() {
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      
      // Warm pad
      const padOsc = this.audioContext.createOscillator();
      const padGain = this.audioContext.createGain();
      const padFilter = this.audioContext.createBiquadFilter();
      
      padOsc.type = 'sawtooth';
      padOsc.frequency.value = 110; // A2
      padFilter.type = 'lowpass';
      padFilter.frequency.value = 300;
      padGain.gain.value = 0.08;
      
      padOsc.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(this.masterGain);
      padOsc.start(now);

      // Minor pentatonic sparse notes
      const minorPentatonic = [220, 261.63, 293.66, 369.99, 415.30]; // A minor pentatonic
      
      const playDesertNote = () => {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const now = this.audioContext.currentTime;
        
        osc.type = 'triangle';
        osc.frequency.value = minorPentatonic[Math.floor(Math.random() * minorPentatonic.length)];
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        gain.gain.value = 0;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        // Slow fade in and out
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.5);
        gain.gain.linearRampToValueAtTime(0.001, now + 3);
        
        osc.start(now);
        osc.stop(now + 3);
      };

      // Very sparse desert notes
      const desertInterval = setInterval(() => {
        playDesertNote();
      }, randRange(5000, 10000));
      
      this.scheduledSounds.push(desertInterval);
    }

    // Yakutsk: cold glassy bell tones with high-pass filtered noise wind
    startYakutskScene() {
      if (!this.audioContext) return;

      // Wind noise
      const noise = this.audioContext.createBufferSource();
      const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < output.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const windFilter = this.audioContext.createBiquadFilter();
      const windGain = this.audioContext.createGain();
      windFilter.type = 'highpass';
      windFilter.frequency.value = 2000;
      windGain.gain.value = 0.04;

      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(this.masterGain);
      noise.start();

      // Cold bell tones
      const bellFreqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      const playBellTone = () => {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const now = this.audioContext.currentTime;
        
        osc.type = 'sine';
        osc.frequency.value = bellFreqs[Math.floor(Math.random() * bellFreqs.length)];
        filter.type = 'highpass';
        filter.frequency.value = 400;
        gain.gain.value = 0;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        // Bell-like envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        
        osc.start(now);
        osc.stop(now + 2.5);
      };

      // Sparse cold bells
      const bellInterval = setInterval(() => {
        playBellTone();
      }, randRange(4000, 8000));
      
      this.scheduledSounds.push(bellInterval);
    }

    // Lagos: subtle percussive pulse with warm mid pad
    startLagosScene() {
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      
      // Warm environmental hum
      const humOsc = this.audioContext.createOscillator();
      const humGain = this.audioContext.createGain();
      const humFilter = this.audioContext.createBiquadFilter();
      
      humOsc.type = 'triangle';
      humOsc.frequency.value = 155.56; // E♭3
      humFilter.type = 'bandpass';
      humFilter.frequency.value = 400;
      humFilter.Q.value = 2;
      humGain.gain.value = 0.06;
      
      humOsc.connect(humFilter);
      humFilter.connect(humGain);
      humGain.connect(this.masterGain);
      humOsc.start(now);

      // Subtle pulse
      const playPulse = () => {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const now = this.audioContext.currentTime;
        
        osc.type = 'triangle';
        osc.frequency.value = 65.41; // C2
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        gain.gain.value = 0;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        // Quick pulse
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.3);
      };

      // Regular but subtle pulse
      const pulseInterval = setInterval(() => {
        playPulse();
      }, randRange(2500, 4000));
      
      this.scheduledSounds.push(pulseInterval);
    }
  }

  // Create music manager instance
  const music = new MusicManager();

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

  // Biome/Location system - Real cities with matching environments
  const BIOMES = [
    {
      name: 'Canterbury, New Zealand',
      color: '#7fb069',
      healthRate: 0.5, // Health gained per second
      description: 'Rolling green countryside with clean air and abundant farmland - a peaceful haven for recovery',
      spawnChance: 0.3
    },
    {
      name: 'Manaus, Brazil',
      color: '#2d5016',
      healthRate: 0, // Neutral
      description: 'Dense Amazon rainforest with dangerous wildlife, extreme humidity, and navigation challenges',
      spawnChance: 0.25
    },
    {
      name: 'Phoenix, Arizona',
      color: '#d4a574',
      healthRate: -2, // Health lost per second
      description: 'Scorching desert heat with water scarcity, deadly temperatures, and sandstorms',
      spawnChance: 0.2
    },
    {
      name: 'Yakutsk, Russia',
      color: '#a8dadc',
      healthRate: -3, // Health lost per second
      description: 'World\'s coldest city with temperatures below -60°F, frostbite danger, and frozen infrastructure',
      spawnChance: 0.15
    },
    {
      name: 'Lagos, Nigeria',
      color: '#606c38',
      healthRate: -5, // Health lost per second
      description: 'Coastal megacity with severe pollution, flooding, disease outbreaks, and contaminated water',
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
    locationDescriptionEl.textContent = biome.description;
    
    // Change background to reflect biome
    document.body.style.background = `radial-gradient(1200px 800px at 70% 10%, ${biome.color}33 0%, #0f1221 60%, #0b0e1a 100%)`;
    
    // Start biome-specific music
    music.setBiome(biome);
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
    
    // Resume audio context (user gesture for autoplay policy)
    music.resume();
    
    // Choose spawn biome
    const spawnBiome = chooseRandomBiome();
    setCurrentBiome(spawnBiome);
    
    // Reset health
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
    
    // Music controls
    musicToggleEl.addEventListener('click', () => {
      music.enabled = !music.enabled;
      music.setEnabled(music.enabled);
      musicToggleEl.textContent = `Music: ${music.enabled ? 'On' : 'Off'}`;
      musicToggleEl.setAttribute('aria-pressed', music.enabled.toString());
    });
    
    musicVolumeEl.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value) / 100;
      music.setVolume(volume);
    });
  }

  // Initialize the game
  initStartScreen();
})();