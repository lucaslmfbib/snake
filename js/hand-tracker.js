class HandTracker {
  constructor() {
    this.videoElement = document.getElementById('webcam-video');
    this.canvasElement = document.getElementById('hand-canvas');
    this.canvasCtx = this.canvasElement.getContext('2d');
    this.statusBadge = document.getElementById('hand-status');
    this.startStatusBadge = document.getElementById('start-hand-status');
    this.cameraTestHint = document.getElementById('camera-test-hint');
    this.btnStart = document.getElementById('btn-start');
    this.crosshair = document.getElementById('crosshair');
    this.sensitivitySlider = document.getElementById('sensitivity-slider');

    this.hands = null;
    this.camera = null;
    this.isHandDetected = false;
    
    // Position of tracked finger (0.0 to 1.0)
    this.targetPos = { x: 0.5, y: 0.5 };
    this.direction = null; // 'UP', 'DOWN', 'LEFT', 'RIGHT'
    
    this.onHandMoveCallback = null;
    
    this.sensitivity = 3;
    if (this.sensitivitySlider) {
      this.sensitivitySlider.addEventListener('input', (e) => {
        this.sensitivity = parseFloat(e.target.value);
      });
    }
  }

  async init(onHandMove) {
    this.onHandMoveCallback = onHandMove;

    if (typeof Hands === 'undefined') {
      console.error('MediaPipe Hands não foi carregado corretamente.');
      this.statusBadge.textContent = 'Erro de Carga';
      return false;
    }

    try {
      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      this.hands.onResults((results) => this.onResults(results));

      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          await this.hands.send({ image: this.videoElement });
        },
        width: 640,
        height: 480
      });

      await this.camera.start();
      this.statusBadge.textContent = 'Aguardando Mão...';
      this.statusBadge.className = 'status-badge waiting';
      return true;
    } catch (err) {
      console.error('Erro ao acessar a câmera:', err);
      this.statusBadge.textContent = 'Sem Câmera';
      this.statusBadge.className = 'status-badge waiting';
      return false;
    }
  }

  onResults(results) {
    // Resize canvas to match video stream dimensions
    const width = this.videoElement.videoWidth || 640;
    const height = this.videoElement.videoHeight || 480;
    
    if (this.canvasElement.width !== width || this.canvasElement.height !== height) {
      this.canvasElement.width = width;
      this.canvasElement.height = height;
    }

    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, width, height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      if (!this.isHandDetected) {
        this.isHandDetected = true;
        if (this.statusBadge) {
          this.statusBadge.textContent = 'Mão Ativa 🖐️';
          this.statusBadge.className = 'status-badge active';
        }
        if (this.startStatusBadge) {
          this.startStatusBadge.textContent = '✅ MÃO DETECTADA!';
          this.startStatusBadge.className = 'status-badge active';
        }
        if (this.cameraTestHint) {
          this.cameraTestHint.innerHTML = '✨ <strong>Perfeito! Sua mão foi capturada em tempo real!</strong> Você já pode iniciar o jogo!';
          this.cameraTestHint.classList.add('success-text');
        }
        if (this.btnStart) {
          this.btnStart.classList.add('ready-btn');
        }
        if (this.crosshair) this.crosshair.classList.add('active');
      }

      const landmarks = results.multiHandLandmarks[0];
      
      // Index finger tip is landmark 8, Wrist is landmark 0
      const indexTip = landmarks[8];
      const wrist = landmarks[0];

      // Note: Video & canvas are CSS mirrored scaleX(-1), so x in canvas goes from right to left natively.
      // We flip X so 0 = left and 1 = right from player's physical perspective.
      const rawX = 1 - indexTip.x; 
      const rawY = indexTip.y;

      // Smooth position interpolator
      this.targetPos.x += (rawX - this.targetPos.x) * 0.4;
      this.targetPos.y += (rawY - this.targetPos.y) * 0.4;

      // Update crosshair PIP position
      const pipX = (1 - indexTip.x) * 100;
      const pipY = indexTip.y * 100;
      this.crosshair.style.left = `${pipX}%`;
      this.crosshair.style.top = `${pipY}%`;

      // Determine 4-way direction based on vector from Wrist (0) to Index Tip (8)
      const dx = (1 - indexTip.x) - (1 - wrist.x);
      const dy = indexTip.y - wrist.y;

      let newDir = null;
      if (Math.abs(dx) > Math.abs(dy)) {
        newDir = dx > 0.03 ? 'RIGHT' : (dx < -0.03 ? 'LEFT' : null);
      } else {
        newDir = dy > 0.03 ? 'DOWN' : (dy < -0.03 ? 'UP' : null);
      }

      if (newDir) {
        this.direction = newDir;
      }

      // Draw Neon Skeleton on PIP Canvas
      this.drawHandSkeleton(landmarks, width, height);

      // Trigger callback
      if (this.onHandMoveCallback) {
        this.onHandMoveCallback({
          pos: this.targetPos,
          direction: this.direction,
          rawTip: { x: rawX, y: rawY }
        });
      }
    } else {
      if (this.isHandDetected) {
        this.isHandDetected = false;
        if (this.statusBadge) {
          this.statusBadge.textContent = 'Procurando...';
          this.statusBadge.className = 'status-badge waiting';
        }
        if (this.startStatusBadge) {
          this.startStatusBadge.textContent = '🖐️ Posicione a mão...';
          this.startStatusBadge.className = 'status-badge waiting';
        }
        if (this.cameraTestHint) {
          this.cameraTestHint.innerHTML = '💡 Permita o acesso à câmera e posicione a sua mão na frente da câmera para testar!';
          this.cameraTestHint.classList.remove('success-text');
        }
        if (this.btnStart) {
          this.btnStart.classList.remove('ready-btn');
        }
        if (this.crosshair) this.crosshair.classList.remove('active');
      }
    }

    this.canvasCtx.restore();
  }

  drawHandSkeleton(landmarks, width, height) {
    const ctx = this.canvasCtx;

    // Connections between joints
    const HAND_CONNECTIONS = [
      [0,1],[1,2],[2,3],[3,4],        // Thumb
      [0,5],[5,6],[6,7],[7,8],        // Index
      [5,9],[9,10],[10,11],[11,12],   // Middle
      [9,13],[13,14],[14,15],[15,16], // Ring
      [13,17],[17,18],[18,19],[19,20],// Pinky
      [0,17]
    ];

    // Draw lines
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    for (const [i, j] of HAND_CONNECTIONS) {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
    }
    ctx.stroke();

    // Draw Glowing Landmark Dots
    ctx.shadowBlur = 10;
    landmarks.forEach((lm, idx) => {
      ctx.fillStyle = idx === 8 ? '#ff007f' : '#00ff66';
      ctx.shadowColor = idx === 8 ? '#ff007f' : '#00ff66';
      ctx.beginPath();
      ctx.arc(lm.x * width, lm.y * height, idx === 8 ? 7 : 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
}

window.handTracker = new HandTracker();
