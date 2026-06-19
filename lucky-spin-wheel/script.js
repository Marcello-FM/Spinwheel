/* ============================================
   Lucky Spin Wheel — Main Script
   Premium spin wheel with audio, confetti,
   particle background, and smooth physics.
   ============================================ */

(function () {
    'use strict';

    /* -------------------------------------------
       Configuration
       ------------------------------------------- */
    const CONFIG = {
        spinDuration:  { min: 4000, max: 6000 },  // ms
        fullSpins:     { min: 5,    max: 8 },      // dramatic rotations
        sectorCount:   9,
        sectorAngle:   360 / 9,                    // 40°
        wheelSize:     500,                        // logical canvas px
        outerRingW:    25,                         // decorative ring width
        hubRadius:     55,
        ledCount:      27,                         // lights around ring
        particleCount: 60,
        confettiCount: 160,
    };

    /* -------------------------------------------
       Prize Data (9 sectors)
       ------------------------------------------- */
    const PRIZES = [
        { name: 'Snack',           color: '#E74C3C', accent: '#C0392B' },
        { name: 'Zonk',            color: '#34495E', accent: '#2C3E50' },
        { name: 'Gantungan Kunci', color: '#27AE60', accent: '#1E8449' },
        { name: 'Snack',           color: '#E67E22', accent: '#CA6F1E' },
        { name: 'Stiker',          color: '#8E44AD', accent: '#7D3C98' },
        { name: 'Snack',           color: '#2980B9', accent: '#2471A3' },
        { name: 'Voucher',         color: '#F39C12', accent: '#D4AC0D' },
        { name: 'Zonk',            color: '#34495E', accent: '#2C3E50' },
        { name: 'Snack',           color: '#1ABC9C', accent: '#17A589' },
    ];

    /* ============================================
       Audio Engine — Web Audio API
       ============================================ */
    class AudioEngine {
        constructor() {
            this.ctx = null;
            this.ready = false;
        }

        /** Must be called from a user gesture (click) */
        init() {
            if (this.ready) return;
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.ready = true;
            } catch (_) {
                console.warn('AudioEngine: Web Audio API not available');
            }
        }

        /** Short tick when wheel passes a sector boundary */
        playTick() {
            if (!this.ctx) return;
            try {
                const now  = this.ctx.currentTime;
                const osc  = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.frequency.value = 1100 + Math.random() * 300;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

                osc.start(now);
                osc.stop(now + 0.05);
            } catch (_) { /* silent */ }
        }

        /** Ascending arpeggio on win */
        playWin() {
            if (!this.ctx) return;
            try {
                [523, 659, 784, 1047].forEach((freq, i) => {
                    const t    = this.ctx.currentTime + i * 0.12;
                    const osc  = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.14, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                    osc.start(t);
                    osc.stop(t + 0.35);
                });
            } catch (_) { /* silent */ }
        }

        /** Descending tone on lose */
        playLose() {
            if (!this.ctx) return;
            try {
                [400, 320].forEach((freq, i) => {
                    const t    = this.ctx.currentTime + i * 0.2;
                    const osc  = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'triangle';
                    gain.gain.setValueAtTime(0.09, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                    osc.start(t);
                    osc.stop(t + 0.45);
                });
            } catch (_) { /* silent */ }
        }
    }

    /* ============================================
       Particle Background
       Floating dots with connecting lines
       ============================================ */
    class ParticleBackground {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx    = canvas.getContext('2d');
            this.dots   = [];

            this._resize();
            this._create();
            this._loop();
            window.addEventListener('resize', () => this._resize());
        }

        _resize() {
            this.canvas.width  = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        _create() {
            this.dots = [];
            for (let i = 0; i < CONFIG.particleCount; i++) {
                this.dots.push({
                    x:  Math.random() * this.canvas.width,
                    y:  Math.random() * this.canvas.height,
                    vx: (Math.random() - 0.5) * 0.35,
                    vy: (Math.random() - 0.5) * 0.35,
                    r:  Math.random() * 2.2 + 0.6,
                    a:  Math.random() * 0.4 + 0.08,
                    hue: Math.random() > 0.5 ? 43 : 220, // gold or blue
                });
            }
        }

        _loop() {
            const ctx = this.ctx;
            const W   = this.canvas.width;
            const H   = this.canvas.height;

            ctx.clearRect(0, 0, W, H);

            // Move & draw dots
            for (const d of this.dots) {
                d.x += d.vx;
                d.y += d.vy;
                if (d.x < -10) d.x = W + 10;
                if (d.x > W + 10) d.x = -10;
                if (d.y < -10) d.y = H + 10;
                if (d.y > H + 10) d.y = -10;

                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${d.hue}, 70%, 65%, ${d.a})`;
                ctx.fill();
            }

            // Connecting lines between nearby dots
            const maxDist = 130;
            for (let i = 0; i < this.dots.length; i++) {
                for (let j = i + 1; j < this.dots.length; j++) {
                    const dx = this.dots[i].x - this.dots[j].x;
                    const dy = this.dots[i].y - this.dots[j].y;
                    const dist = dx * dx + dy * dy;       // skip sqrt
                    const maxD2 = maxDist * maxDist;
                    if (dist < maxD2) {
                        const alpha = 0.055 * (1 - dist / maxD2);
                        ctx.beginPath();
                        ctx.moveTo(this.dots[i].x, this.dots[i].y);
                        ctx.lineTo(this.dots[j].x, this.dots[j].y);
                        ctx.strokeStyle = `rgba(212,175,55,${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(() => this._loop());
        }
    }

    /* ============================================
       Confetti Burst System
       ============================================ */
    class ConfettiSystem {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx    = canvas.getContext('2d');
            this.parts  = [];
            this.active = false;
            this.raf    = null;

            this._resize();
            window.addEventListener('resize', () => this._resize());
        }

        _resize() {
            this.canvas.width  = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        burst() {
            this.active = true;
            this.parts  = [];

            const colors = [
                '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1',
                '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3',
                '#54A0FF', '#5F27CD', '#FF9F43', '#EE5A24',
            ];
            const cx = this.canvas.width / 2;
            const cy = this.canvas.height / 2;

            for (let i = 0; i < CONFIG.confettiCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 9 + 4;
                this.parts.push({
                    x:  cx,
                    y:  cy,
                    vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 3,
                    vy: Math.sin(angle) * speed - Math.random() * 5 - 2,
                    w:  Math.random() * 10 + 5,
                    h:  Math.random() * 6  + 3,
                    col:   colors[Math.floor(Math.random() * colors.length)],
                    rot:   Math.random() * 360,
                    rotV:  (Math.random() - 0.5) * 16,
                    alpha: 1,
                    grav:  0.12 + Math.random() * 0.05,
                    drag:  0.978 + Math.random() * 0.015,
                });
            }

            if (!this.raf) this._animate();
        }

        _animate() {
            if (!this.active) return;
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            let alive = 0;
            for (const p of this.parts) {
                p.vx    *= p.drag;
                p.vy    *= p.drag;
                p.vy    += p.grav;
                p.x     += p.vx;
                p.y     += p.vy;
                p.rot   += p.rotV;
                p.alpha -= 0.004;

                if (p.alpha > 0 && p.y < this.canvas.height + 60) {
                    alive++;
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, p.alpha);
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot * Math.PI / 180);
                    ctx.fillStyle = p.col;
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    ctx.restore();
                }
            }

            if (alive > 0) {
                this.raf = requestAnimationFrame(() => this._animate());
            } else {
                this.active = false;
                this.raf    = null;
                this.parts  = [];
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }

    /* ============================================
       Spin Wheel — Canvas Drawing & Spin Logic
       ============================================ */
    class SpinWheel {
        constructor(canvasId, audio) {
            this.canvas   = document.getElementById(canvasId);
            this.ctx      = this.canvas.getContext('2d');
            this.audio    = audio;
            this.rotation = 0;        // cumulative rotation in degrees
            this.spinning = false;

            this._setup();
            this.draw();
        }

        /* Scale canvas for retina / high-DPI */
        _setup() {
            const dpr  = window.devicePixelRatio || 1;
            const size = CONFIG.wheelSize;
            this.canvas.width  = size * dpr;
            this.canvas.height = size * dpr;
            this.canvas.style.width  = '100%';
            this.canvas.style.height = '100%';
            this.ctx.scale(dpr, dpr);

            this.size    = size;
            this.cx      = size / 2;
            this.cy      = size / 2;
            this.outerR  = size / 2 - 8;
            this.innerR  = this.outerR - CONFIG.outerRingW;
            this.hubR    = CONFIG.hubRadius;
        }

        /* ---- Draw the entire wheel (called once) ---- */
        draw() {
            const ctx    = this.ctx;
            const cx     = this.cx;
            const cy     = this.cy;
            const outerR = this.outerR;
            const innerR = this.innerR;
            const hubR   = this.hubR;
            const sA     = (2 * Math.PI) / CONFIG.sectorCount;
            const offset = -Math.PI / 2 - sA / 2; // sector 0 centered at top

            ctx.clearRect(0, 0, this.size, this.size);

            /* ---- Outer decorative ring ---- */
            // Ring background
            ctx.beginPath();
            ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
            ctx.fillStyle = '#0d1535';
            ctx.fill();

            // Gold outer border
            ctx.beginPath();
            ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth   = 3;
            ctx.stroke();

            // Gold inner-ring border
            ctx.beginPath();
            ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth   = 2;
            ctx.stroke();

            // LED "lights" around ring
            const ledR = (outerR + innerR) / 2;
            for (let i = 0; i < CONFIG.ledCount; i++) {
                const a  = (i / CONFIG.ledCount) * Math.PI * 2 - Math.PI / 2;
                const lx = cx + ledR * Math.cos(a);
                const ly = cy + ledR * Math.sin(a);

                // glow
                const isGold = i % 3 === 0;
                if (isGold) {
                    ctx.beginPath();
                    ctx.arc(lx, ly, 7, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,215,0,0.18)';
                    ctx.fill();
                }

                // dot
                ctx.beginPath();
                ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = isGold ? '#FFD700' : 'rgba(255,255,255,0.85)';
                ctx.fill();
            }

            /* ---- Sectors ---- */
            for (let i = 0; i < CONFIG.sectorCount; i++) {
                const start = offset + i * sA;
                const end   = start + sA;
                const prize = PRIZES[i];

                // Fill with radial gradient
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, innerR - 3, start, end);
                ctx.closePath();

                const grad = ctx.createRadialGradient(cx, cy, hubR, cx, cy, innerR);
                grad.addColorStop(0, this._lighten(prize.color, 30));
                grad.addColorStop(1, prize.accent);
                ctx.fillStyle = grad;
                ctx.fill();

                // Subtle border
                ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                ctx.lineWidth   = 1.5;
                ctx.stroke();

                // Text label (auto-sized)
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(start + sA / 2);

                const maxW = innerR - hubR - 30;
                let fs = 14;
                ctx.font = `700 ${fs}px 'Outfit', sans-serif`;
                while (ctx.measureText(prize.name).width > maxW && fs > 9) {
                    fs--;
                    ctx.font = `700 ${fs}px 'Outfit', sans-serif`;
                }

                ctx.textAlign    = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillStyle    = '#fff';
                ctx.shadowColor  = 'rgba(0,0,0,0.55)';
                ctx.shadowBlur   = 4;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillText(prize.name, innerR - 18, 0);
                ctx.restore();
            }

            /* ---- Sector separator lines ---- */
            for (let i = 0; i < CONFIG.sectorCount; i++) {
                const a = offset + i * sA;
                ctx.beginPath();
                ctx.moveTo(cx + hubR * Math.cos(a), cy + hubR * Math.sin(a));
                ctx.lineTo(cx + (innerR - 3) * Math.cos(a), cy + (innerR - 3) * Math.sin(a));
                ctx.strokeStyle = 'rgba(255,255,255,0.22)';
                ctx.lineWidth   = 2;
                ctx.stroke();
            }

            /* ---- Center hub ---- */
            // shadow
            ctx.beginPath();
            ctx.arc(cx, cy, hubR + 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fill();

            // gradient
            const hubG = ctx.createRadialGradient(cx - 10, cy - 10, 4, cx, cy, hubR);
            hubG.addColorStop(0,   '#F0D060');
            hubG.addColorStop(0.5, '#D4AF37');
            hubG.addColorStop(1,   '#8B6914');
            ctx.beginPath();
            ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
            ctx.fillStyle = hubG;
            ctx.fill();

            // border
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth   = 3;
            ctx.stroke();

            // inner highlight ring
            ctx.beginPath();
            ctx.arc(cx, cy, hubR - 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.lineWidth   = 1;
            ctx.stroke();
        }

        /* ---- Lighten a hex colour ---- */
        _lighten(hex, pct) {
            const n   = parseInt(hex.replace('#', ''), 16);
            const amt = Math.round(2.55 * pct);
            const R   = Math.min(255, (n >> 16) + amt);
            const G   = Math.min(255, ((n >> 8) & 0xFF) + amt);
            const B   = Math.min(255, (n & 0xFF) + amt);
            return `rgb(${R},${G},${B})`;
        }

        /* ---- Spin to a target sector ---- */
        spin(targetIdx, onDone) {
            if (this.spinning) return;
            this.spinning = true;

            const degPerSector = CONFIG.sectorAngle;                   // 40
            const landing      = ((360 - targetIdx * degPerSector) % 360);
            const normCur      = ((this.rotation % 360) + 360) % 360;

            // Random offset within sector (±13°) so it doesn't always land dead-center
            const rndOff        = (Math.random() - 0.5) * 26;
            const adjustedLand  = ((landing + rndOff) % 360 + 360) % 360;

            let delta = adjustedLand - normCur;
            if (delta <= 0) delta += 360;

            const nSpins    = CONFIG.fullSpins.min + Math.floor(Math.random() * (CONFIG.fullSpins.max - CONFIG.fullSpins.min + 1));
            const totalDelta = nSpins * 360 + delta;

            const startRot = this.rotation;
            const endRot   = startRot + totalDelta;
            const dur      = CONFIG.spinDuration.min + Math.random() * (CONFIG.spinDuration.max - CONFIG.spinDuration.min);
            const t0       = performance.now();

            let lastSector = -1;

            const step = (now) => {
                const elapsed  = now - t0;
                const progress = Math.min(elapsed / dur, 1);
                const eased    = 1 - Math.pow(1 - progress, 5);       // ease-out quint
                const angle    = startRot + totalDelta * eased;

                this.canvas.style.transform = `rotate(${angle}deg)`;

                // Tick sound at sector crossings
                const normAngle = ((angle % 360) + 360) % 360;
                const curSector = Math.floor(normAngle / degPerSector) % CONFIG.sectorCount;
                if (curSector !== lastSector) {
                    lastSector = curSector;
                    this.audio.playTick();
                }

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    this.rotation = endRot;
                    this.spinning = false;
                    if (onDone) onDone(targetIdx);
                }
            };

            requestAnimationFrame(step);
        }
    }

    /* ============================================
       Result Modal
       ============================================ */
    class ResultModal {
        constructor() {
            this.overlay  = document.getElementById('modal-overlay');
            this.modal    = document.getElementById('modal');
            this.emoji    = document.getElementById('modal-emoji');
            this.title    = document.getElementById('modal-title');
            this.message  = document.getElementById('modal-message');
            this.btn      = document.getElementById('modal-btn');
            this.closeBtn = document.getElementById('modal-close');

            this.btn.addEventListener('click',      () => this.hide());
            this.closeBtn.addEventListener('click',  () => this.hide());
            this.overlay.addEventListener('click', e => {
                if (e.target === this.overlay) this.hide();
            });
        }

        show(prize, isWin) {
            if (isWin) {
                this.emoji.textContent   = '🎉';
                this.title.textContent   = 'Selamat!';
                this.title.className     = 'modal-title win';
                this.message.textContent = `Kamu mendapatkan: ${prize.name}`;
                this.modal.className     = 'modal win';
            } else {
                this.emoji.textContent   = '😢';
                this.title.textContent   = 'Sayang sekali!';
                this.title.className     = 'modal-title';
                this.message.textContent = 'Belum beruntung, coba lagi nanti.';
                this.modal.className     = 'modal';
            }

            // Re-trigger the emoji pop animation
            this.emoji.style.animation = 'none';
            // Force reflow then re-apply
            void this.emoji.offsetWidth;
            this.emoji.style.animation = '';

            this.overlay.classList.add('active');
        }

        hide() {
            this.overlay.classList.remove('active');
        }
    }

    /* ============================================
       App Controller
       ============================================ */
    class App {
        constructor() {
            this.audio    = new AudioEngine();
            this.wheel    = new SpinWheel('wheel-canvas', this.audio);
            this.modal    = new ResultModal();
            this.confetti = new ConfettiSystem(document.getElementById('confetti-canvas'));
            this.bg       = new ParticleBackground(document.getElementById('particles-canvas'));

            this.spinBtn  = document.getElementById('spin-btn');
            this.pointer  = document.getElementById('pointer');

            this.spinBtn.addEventListener('click', () => this._handleSpin());
        }

        _handleSpin() {
            if (this.wheel.spinning) return;

            // Init audio on first user gesture (browser autoplay policy)
            this.audio.init();

            this.spinBtn.disabled = true;

            // Pick random target sector
            const target = Math.floor(Math.random() * CONFIG.sectorCount);
            const prize  = PRIZES[target];
            const isWin  = prize.name !== 'Zonk';

            this.wheel.spin(target, () => {
                // Bounce pointer when wheel stops
                this.pointer.classList.remove('bounce');
                void this.pointer.offsetWidth;
                this.pointer.classList.add('bounce');

                // Slight delay for dramatic effect
                setTimeout(() => {
                    if (isWin) {
                        this.audio.playWin();
                        this.confetti.burst();
                    } else {
                        this.audio.playLose();
                    }
                    this.modal.show(prize, isWin);
                    this.spinBtn.disabled = false;
                }, 450);
            });
        }
    }

    /* ---- Bootstrap ---- */
    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });

})();
