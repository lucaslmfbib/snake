// Leaderboard Manager (Direct API Connection)
class LeaderboardManager {
  constructor() {
    this.storageKey = 'cybersnake_global_ranking_v6';
    this.apiUrl = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fab304d5e3ebb';
  }

  async fetchGlobalRankings() {
    try {
      const res = await fetch(`${this.apiUrl}?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.data && Array.isArray(json.data.rankings)) {
          let list = json.data.rankings;
          list.sort((a, b) => b.score - a.score);
          const top10 = list.slice(0, 10);
          try {
            localStorage.setItem(this.storageKey, JSON.stringify(top10));
          } catch(e) {}
          return top10;
        }
      }
    } catch(e) {
      console.warn('Usando ranking local em cache:', e);
    }
    return this.getLocalRankings();
  }

  getLocalRankings() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) return JSON.parse(data);
    } catch(e) {}
    return [];
  }

  async addScore(playerName, score) {
    if (!playerName || playerName.trim() === '') playerName = 'Jogador';
    const cleanName = playerName.trim().slice(0, 18);

    try {
      let list = await this.fetchGlobalRankings();
      list.push({
        name: cleanName,
        score: Math.floor(score),
        date: new Date().toLocaleDateString('pt-BR')
      });
      list.sort((a, b) => b.score - a.score);
      const top10 = list.slice(0, 10);

      const res = await fetch(this.apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { rankings: top10 } })
      });

      if (res.ok) {
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(top10));
        } catch(e) {}
        return top10;
      }
    } catch(e) {
      console.warn('Erro ao enviar pontuação para a API:', e);
    }

    // Fallback local
    let rankings = this.getLocalRankings();
    rankings.push({
      name: cleanName,
      score: Math.floor(score),
      date: new Date().toLocaleDateString('pt-BR')
    });
    rankings.sort((a, b) => b.score - a.score);
    const top10 = rankings.slice(0, 10);
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(top10));
    } catch(e) {}
    return top10;
  }

  async render(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = '<div class="ranking-loading">Carregando Ranking Geral em tempo real... 🌐</div>';
    
    const rankings = (await this.fetchGlobalRankings()).slice(0, 10);
    containerEl.innerHTML = '';

    if (rankings.length === 0) {
      containerEl.innerHTML = '<div class="ranking-loading">Nenhuma pontuação registrada ainda no ranking geral. Seja o primeiro a jogar! 🏆</div>';
      return;
    }

    rankings.forEach((item, index) => {
      const rank = index + 1;
      let badgeIcon = `#${rank}`;
      let rankClass = '';
      if (rank === 1) { badgeIcon = '🥇'; rankClass = 'rank-top-1'; }
      else if (rank === 2) { badgeIcon = '🥈'; rankClass = 'rank-top-2'; }
      else if (rank === 3) { badgeIcon = '🥉'; rankClass = 'rank-top-3'; }

      const row = document.createElement('div');
      row.className = `ranking-item ${rankClass}`;
      row.innerHTML = `
        <div class="player-left">
          <div class="rank-badge">${badgeIcon}</div>
          <span class="player-name-text">${this.escapeHtml(item.name)}</span>
        </div>
        <span class="player-score-val">${item.score} pts</span>
      `;
      containerEl.appendChild(row);
    });
  }

  escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }
}

// Main Snake Game Engine
class SnakeGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // UI Elements
    this.scoreValEl = document.getElementById('score-val');
    this.highScoreValEl = document.getElementById('highscore-val');
    this.comboValEl = document.getElementById('combo-val');
    this.startOverlay = document.getElementById('start-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.rankingOverlay = document.getElementById('ranking-overlay');
    this.finalScoreEl = document.getElementById('final-score');
    this.newHighScoreMsg = document.getElementById('new-high-score-msg');
    this.modeIconEl = document.getElementById('mode-icon');
    this.modeTextEl = document.getElementById('mode-text');
    this.leaderboardListEl = document.getElementById('leaderboard-list');

    // Inputs
    this.playerNameInput = document.getElementById('player-name-input');
    this.gameoverNameInput = document.getElementById('gameover-name-input');

    // Buttons
    this.btnStart = document.getElementById('btn-start');
    this.btnResume = document.getElementById('btn-resume');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnGameoverRanking = document.getElementById('btn-gameover-ranking');
    this.btnShowRanking = document.getElementById('btn-show-ranking');
    this.btnCloseRanking = document.getElementById('btn-close-ranking');
    this.btnCloseRankingBottom = document.getElementById('btn-close-ranking-bottom');
    this.btnToggleSound = document.getElementById('btn-toggle-sound');
    this.btnToggleMode = document.getElementById('btn-toggle-mode');

    // Leaderboard Manager
    this.leaderboard = new LeaderboardManager();

    // State Variables
    this.gameState = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER', 'RANKING'
    this.controlMode = 'HAND'; // 'HAND' or 'KEYBOARD'
    
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('cybersnake_highscore') || '0', 10);
    this.combo = 1;
    this.comboTimer = null;
    this.eatCount = 0;

    // Load saved player name
    const savedName = localStorage.getItem('cybersnake_player_name') || 'Lucas Martins';
    if (this.playerNameInput) this.playerNameInput.value = savedName;
    if (this.gameoverNameInput) this.gameoverNameInput.value = savedName;

    // Snake Physics
    this.segmentRadius = 12;
    this.speed = 4.5;
    this.angle = 0;
    this.targetAngle = 0;
    this.turnSpeed = 0.15;

    this.snake = [];
    this.targetPos = { x: 400, y: 300 };

    // Food Items
    this.food = null;
    this.specialFood = null;
    this.particles = [];

    this.init();
  }

  init() {
    this.highScoreValEl.textContent = this.formatScore(this.highScore);
    
    // Bind Buttons with touch & click support
    const handleBtn = (btn, callback) => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        callback(e);
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        callback(e);
      });
    };

    handleBtn(this.btnStart, () => this.startGame());
    handleBtn(this.btnResume, () => this.resumeGame());
    handleBtn(this.btnRestart, () => this.startGame());

    // Allow tap anywhere on start screen to start game
    const handleStartOverlayTap = (e) => {
      if (!this.startOverlay || this.startOverlay.classList.contains('hidden')) return;
      const tag = e.target ? e.target.tagName : '';
      if (['INPUT', 'A', 'LABEL', 'BUTTON'].includes(tag)) return;
      this.startGame();
    };
    this.startOverlay.addEventListener('click', handleStartOverlayTap);
    this.startOverlay.addEventListener('touchend', handleStartOverlayTap);

    handleBtn(this.btnShowRanking, () => this.openRankingModal());
    handleBtn(this.btnGameoverRanking, () => this.openRankingModal());
    handleBtn(this.btnCloseRanking, () => this.closeRankingModal());
    handleBtn(this.btnCloseRankingBottom, () => this.closeRankingModal());

    const btnActivateCam = document.getElementById('btn-activate-camera');
    if (btnActivateCam) {
      handleBtn(btnActivateCam, () => {
        if (window.handTracker) window.handTracker.startCamera();
      });
    }

    const syncName = (val) => {
      const cleanName = val ? val.trim() : '';
      if (cleanName) localStorage.setItem('cybersnake_player_name', cleanName);
      if (this.playerNameInput && this.playerNameInput !== document.activeElement) this.playerNameInput.value = val;
      if (this.gameoverNameInput && this.gameoverNameInput !== document.activeElement) this.gameoverNameInput.value = val;
    };

    if (this.playerNameInput) {
      this.playerNameInput.addEventListener('input', (e) => syncName(e.target.value));
      this.playerNameInput.addEventListener('change', (e) => syncName(e.target.value));
    }
    if (this.gameoverNameInput) {
      this.gameoverNameInput.addEventListener('input', (e) => syncName(e.target.value));
      this.gameoverNameInput.addEventListener('change', (e) => syncName(e.target.value));
    }

    this.btnToggleSound.addEventListener('click', () => {
      const isMuted = window.audioSynth.toggleMute();
      this.btnToggleSound.textContent = isMuted ? '🔇' : '🔊';
    });

    this.btnToggleMode.addEventListener('click', () => {
      this.controlMode = this.controlMode === 'HAND' ? 'KEYBOARD' : 'HAND';
      this.modeIconEl.textContent = this.controlMode === 'HAND' ? '🖐️' : '⌨️';
      this.modeTextEl.textContent = this.controlMode === 'HAND' ? 'Mão' : 'Teclado';
    });

    // Keyboard Listeners
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Touch & Drag Controls on Canvas (Backup for mobile)
    const handleTouchControl = (e) => {
      if (this.gameState !== 'PLAYING') return;
      if (e.touches && e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const touchX = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
        const touchY = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
        
        const head = this.snake[0];
        if (head) {
          const dx = touchX - head.x;
          const dy = touchY - head.y;
          if (Math.hypot(dx, dy) > 10) {
            this.targetAngle = Math.atan2(dy, dx);
          }
        }
      }
    };
    this.canvas.addEventListener('touchmove', handleTouchControl, { passive: true });
    this.canvas.addEventListener('touchstart', handleTouchControl, { passive: true });

    // Initialize Hand Tracker
    if (window.handTracker) {
      window.handTracker.init((handData) => this.onHandUpdate(handData));
    }

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    requestAnimationFrame((time) => this.gameLoop(time));
  }

  resizeCanvas() {
    this.canvas.width = 800;
    this.canvas.height = 600;
  }

  formatScore(val) {
    return val.toString().padStart(4, '0');
  }

  async openRankingModal() {
    this.rankingOverlay.classList.remove('hidden');
    await this.leaderboard.render(this.leaderboardListEl);

    // Sync local high score with global high score for this player
    try {
      const currentPlayerName = (localStorage.getItem('cybersnake_player_name') || '').trim();
      const globalRankings = JSON.parse(localStorage.getItem('cybersnake_global_ranking_v6') || '[]');
      if (currentPlayerName) {
        let bestGlobalScore = 0;
        globalRankings.forEach(r => {
          if (r.name.trim() === currentPlayerName && r.score > bestGlobalScore) {
            bestGlobalScore = r.score;
          }
        });
        
        if (bestGlobalScore > this.highScore) {
          this.highScore = bestGlobalScore;
          localStorage.setItem('cybersnake_highscore', this.highScore);
          this.highScoreValEl.textContent = this.formatScore(this.highScore);
        }
      }
    } catch(e) {}
  }

  closeRankingModal() {
    this.rankingOverlay.classList.add('hidden');
  }

  saveScoreToLeaderboard() {
    const name = this.gameoverNameInput.value || this.playerNameInput.value || 'Jogador';
    localStorage.setItem('cybersnake_player_name', name);
    
    this.leaderboard.addScore(name, this.score);
    this.openRankingModal();
  }

  startGame() {
    this.hasSavedThisRound = false;

    // Save current name permanently in localStorage
    const name = this.playerNameInput ? this.playerNameInput.value : '';
    if (name) localStorage.setItem('cybersnake_player_name', name);

    this.score = 0;
    this.combo = 1;
    this.eatCount = 0;
    this.speed = 4.5;
    this.scoreValEl.textContent = this.formatScore(this.score);
    this.comboValEl.textContent = `x${this.combo}`;
    this.newHighScoreMsg.classList.add('hidden');

    this.snake = [];
    const startX = this.canvas.width / 2;
    const startY = this.canvas.height / 2;
    for (let i = 0; i < 6; i++) {
      this.snake.push({ x: startX - i * (this.segmentRadius * 1.5), y: startY });
    }
    this.angle = 0;
    this.targetAngle = 0;

    this.spawnFood();
    this.specialFood = null;
    this.particles = [];

    this.startOverlay.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.gameoverOverlay.classList.add('hidden');
    this.rankingOverlay.classList.add('hidden');

    this.gameState = 'PLAYING';
    window.audioSynth.playStart();
  }

  pauseGame() {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
      this.pauseOverlay.classList.remove('hidden');
    }
  }

  resumeGame() {
    if (this.gameState === 'PAUSED') {
      this.gameState = 'PLAYING';
      this.pauseOverlay.classList.add('hidden');
    }
  }

  gameOver() {
    if (this.gameState === 'GAMEOVER') return;
    this.gameState = 'GAMEOVER';
    this.finalScoreEl.textContent = this.score;

    const name = localStorage.getItem('cybersnake_player_name') || (this.playerNameInput ? this.playerNameInput.value : '') || 'Lucas Martins';

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('cybersnake_highscore', this.highScore.toString());
      this.highScoreValEl.textContent = this.formatScore(this.highScore);
      this.newHighScoreMsg.classList.remove('hidden');
    }

    // Auto save score ONCE per round if score > 0
    if (this.score > 0 && !this.hasSavedThisRound) {
      this.hasSavedThisRound = true;
      this.leaderboard.addScore(name, this.score);
    }

    this.gameoverOverlay.classList.remove('hidden');
    window.audioSynth.playGameOver();
  }

  handleKeyDown(e) {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      if (this.gameState === 'PLAYING') this.pauseGame();
      else if (this.gameState === 'PAUSED') this.resumeGame();
      return;
    }

    if (this.controlMode === 'KEYBOARD' && this.gameState === 'PLAYING') {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (this.targetAngle !== Math.PI / 2) this.targetAngle = -Math.PI / 2;
          break;
        case 'ArrowDown': case 's': case 'S':
          if (this.targetAngle !== -Math.PI / 2) this.targetAngle = Math.PI / 2;
          break;
        case 'ArrowLeft': case 'a': case 'A':
          if (this.targetAngle !== 0) this.targetAngle = Math.PI;
          break;
        case 'ArrowRight': case 'd': case 'D':
          if (this.targetAngle !== Math.PI) this.targetAngle = 0;
          break;
      }
    }
  }

  onHandUpdate(handData) {
    if (this.controlMode === 'HAND' && handData.pos) {
      this.targetPos.x = handData.pos.x * this.canvas.width;
      this.targetPos.y = handData.pos.y * this.canvas.height;

      const head = this.snake[0];
      if (head) {
        const dx = this.targetPos.x - head.x;
        const dy = this.targetPos.y - head.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 15) {
          this.targetAngle = Math.atan2(dy, dx);
        }
      }
    }
  }

  spawnFood() {
    const margin = 40;
    this.food = {
      x: margin + Math.random() * (this.canvas.width - margin * 2),
      y: margin + Math.random() * (this.canvas.height - margin * 2),
      radius: 10,
      pulse: 0
    };
  }

  spawnSpecialFood() {
    const margin = 50;
    this.specialFood = {
      x: margin + Math.random() * (this.canvas.width - margin * 2),
      y: margin + Math.random() * (this.canvas.height - margin * 2),
      radius: 14,
      type: Math.random() > 0.5 ? 'GOLD' : 'SLOW',
      lifetime: 300
    };
  }

  createParticles(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
      const pAngle = Math.random() * Math.PI * 2;
      const pSpeed = 1 + Math.random() * 5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        radius: 2 + Math.random() * 4,
        color: color,
        alpha: 1
      });
    }
  }

  update() {
    if (this.gameState !== 'PLAYING') return;

    const head = this.snake[0];

    let diff = this.targetAngle - this.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.angle += diff * this.turnSpeed;

    const newHeadX = head.x + Math.cos(this.angle) * this.speed;
    const newHeadY = head.y + Math.sin(this.angle) * this.speed;

    if (
      newHeadX - this.segmentRadius < 0 ||
      newHeadX + this.segmentRadius > this.canvas.width ||
      newHeadY - this.segmentRadius < 0 ||
      newHeadY + this.segmentRadius > this.canvas.height
    ) {
      this.createParticles(head.x, head.y, '#ff007f', 30);
      this.gameOver();
      return;
    }

    head.x = newHeadX;
    head.y = newHeadY;

    const minSpacing = this.segmentRadius * 1.3;
    for (let i = 1; i < this.snake.length; i++) {
      const prev = this.snake[i - 1];
      const curr = this.snake[i];

      const dx = prev.x - curr.x;
      const dy = prev.y - curr.y;
      const dist = Math.hypot(dx, dy);

      if (dist > minSpacing) {
        const segAngle = Math.atan2(dy, dx);
        curr.x = prev.x - Math.cos(segAngle) * minSpacing;
        curr.y = prev.y - Math.sin(segAngle) * minSpacing;
      }
    }

    for (let i = 4; i < this.snake.length; i++) {
      const seg = this.snake[i];
      const dist = Math.hypot(head.x - seg.x, head.y - seg.y);
      if (dist < this.segmentRadius * 1.1) {
        this.createParticles(head.x, head.y, '#ff007f', 30);
        this.gameOver();
        return;
      }
    }

    if (this.food) {
      const distFood = Math.hypot(head.x - this.food.x, head.y - this.food.y);
      if (distFood < this.segmentRadius + this.food.radius) {
        const pts = 10 * this.combo;
        this.score += pts;
        this.eatCount++;
        this.scoreValEl.textContent = this.formatScore(this.score);

        window.audioSynth.playEat();
        this.createParticles(this.food.x, this.food.y, '#00ff66', 20);

        this.combo++;
        this.comboValEl.textContent = `x${this.combo}`;
        clearTimeout(this.comboTimer);
        this.comboTimer = setTimeout(() => {
          this.combo = 1;
          this.comboValEl.textContent = `x1`;
        }, 4000);

        const tail = this.snake[this.snake.length - 1];
        this.snake.push({ x: tail.x, y: tail.y });
        this.snake.push({ x: tail.x, y: tail.y });

        if (this.speed < 8.5) this.speed += 0.08;

        if (this.eatCount % 4 === 0 && !this.specialFood) {
          this.spawnSpecialFood();
        }

        this.spawnFood();
      }
    }

    if (this.specialFood) {
      this.specialFood.lifetime--;
      if (this.specialFood.lifetime <= 0) {
        this.specialFood = null;
      } else {
        const distSpec = Math.hypot(head.x - this.specialFood.x, head.y - this.specialFood.y);
        if (distSpec < this.segmentRadius + this.specialFood.radius) {
          window.audioSynth.playSpecial();
          
          if (this.specialFood.type === 'GOLD') {
            this.score += 50 * this.combo;
            this.createParticles(this.specialFood.x, this.specialFood.y, '#ffbe00', 35);
          } else if (this.specialFood.type === 'SLOW') {
            this.speed = Math.max(3.5, this.speed - 1.5);
            this.createParticles(this.specialFood.x, this.specialFood.y, '#00f3ff', 35);
          }

          this.scoreValEl.textContent = this.formatScore(this.score);
          this.specialFood = null;
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();

    if (this.controlMode === 'HAND' && window.handTracker && window.handTracker.isHandDetected) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(this.targetPos.x, this.targetPos.y, 16, 0, Math.PI * 2);
      this.ctx.moveTo(this.targetPos.x - 24, this.targetPos.y);
      this.ctx.lineTo(this.targetPos.x + 24, this.targetPos.y);
      this.ctx.moveTo(this.targetPos.x, this.targetPos.y - 24);
      this.ctx.lineTo(this.targetPos.x, this.targetPos.y + 24);
      this.ctx.stroke();
      this.ctx.restore();
    }

    if (this.food) {
      this.food.pulse += 0.08;
      const pulseRadius = this.food.radius + Math.sin(this.food.pulse) * 2;

      this.ctx.save();
      this.ctx.fillStyle = '#00ff66';
      this.ctx.shadowColor = '#00ff66';
      this.ctx.shadowBlur = 15;
      this.ctx.beginPath();
      this.ctx.arc(this.food.x, this.food.y, pulseRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    if (this.specialFood) {
      const color = this.specialFood.type === 'GOLD' ? '#ffbe00' : '#00f3ff';
      this.ctx.save();
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 20;
      this.ctx.beginPath();
      this.ctx.arc(this.specialFood.x, this.specialFood.y, this.specialFood.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 12px Orbitron';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.specialFood.type === 'GOLD' ? '★' : '⚡', this.specialFood.x, this.specialFood.y);
      this.ctx.restore();
    }

    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    if (this.snake.length > 0) {
      for (let i = this.snake.length - 1; i >= 0; i--) {
        const seg = this.snake[i];
        const isHead = i === 0;
        const radius = isHead ? this.segmentRadius * 1.2 : this.segmentRadius * Math.max(0.6, 1 - (i / this.snake.length) * 0.4);

        this.ctx.save();
        if (isHead) {
          this.ctx.fillStyle = '#00f3ff';
          this.ctx.shadowColor = '#00f3ff';
          this.ctx.shadowBlur = 20;
        } else {
          this.ctx.fillStyle = i % 2 === 0 ? '#00e5ff' : '#ff00aa';
          this.ctx.shadowColor = '#00e5ff';
          this.ctx.shadowBlur = 10;
        }

        this.ctx.beginPath();
        this.ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        if (isHead) {
          const eyeOffset = 6;
          const eyeRadius = 3;
          const eye1X = seg.x + Math.cos(this.angle + 0.6) * eyeOffset;
          const eye1Y = seg.y + Math.sin(this.angle + 0.6) * eyeOffset;
          const eye2X = seg.x + Math.cos(this.angle - 0.6) * eyeOffset;
          const eye2Y = seg.y + Math.sin(this.angle - 0.6) * eyeOffset;

          this.ctx.fillStyle = '#ffffff';
          this.ctx.shadowBlur = 0;
          this.ctx.beginPath();
          this.ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
          this.ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
          this.ctx.fill();
        }

        this.ctx.restore();
      }
    }
  }

  drawGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    const gridSize = 40;

    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  gameLoop(timestamp) {
    this.update();
    this.draw();
    requestAnimationFrame((time) => this.gameLoop(time));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.snakeGame = new SnakeGame();
});
