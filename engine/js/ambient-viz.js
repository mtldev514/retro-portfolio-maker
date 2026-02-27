/**
 * Ambient Music-Reactive Circle Visualizer
 * Draws soft, glowing circles behind the header and page background
 * that pulse gently with audio frequency data from the media player.
 */
const ambientViz = {
    bgCanvas: null,
    bgCtx: null,
    hdCanvas: null,
    hdCtx: null,
    bgCircles: [],
    hdCircles: [],
    raf: null,
    _started: false,

    // Color palette (HSL hues) — WMP-inspired warm/cool mix
    palette: [300, 180, 270, 40, 160, 330],

    // Frequency bins mapped to circles (bass → treble, 32-bin FFT)
    bgBins: [1, 2, 4, 8, 16],
    hdBins: [1, 3, 6, 10, 16, 22],

    init() {
        this.bgCanvas = document.getElementById('ambient-bg');
        this.hdCanvas = document.getElementById('ambient-header');
        if (!this.bgCanvas && !this.hdCanvas) return;

        if (this.bgCanvas) {
            this.bgCtx = this.bgCanvas.getContext('2d');
            this._sizeCanvas(this.bgCanvas, window.innerWidth, window.innerHeight);
            this._initBgCircles();
        }
        if (this.hdCanvas) {
            this.hdCtx = this.hdCanvas.getContext('2d');
            const header = this.hdCanvas.parentElement;
            this._sizeCanvas(this.hdCanvas, header.offsetWidth, header.offsetHeight);
            this._initHdCircles();
        }

        window.addEventListener('resize', () => this._onResize());
        this._startLoop();
    },

    _sizeCanvas(canvas, w, h) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
    },

    _onResize() {
        if (this.bgCanvas) {
            this._sizeCanvas(this.bgCanvas, window.innerWidth, window.innerHeight);
        }
        if (this.hdCanvas) {
            const header = this.hdCanvas.parentElement;
            this._sizeCanvas(this.hdCanvas, header.offsetWidth, header.offsetHeight);
        }
    },

    _initBgCircles() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.bgCircles = this.bgBins.map((bin, i) => ({
            x: Math.random() * w,
            y: Math.random() * h,
            baseRadius: 100 + Math.random() * 120,
            currentRadius: 60,
            targetRadius: 60,
            hue: this.palette[i % this.palette.length],
            baseOpacity: 0.10 + Math.random() * 0.08,
            currentOpacity: 0.04,
            targetOpacity: 0.04,
            driftX: (Math.random() - 0.5) * 0.3,
            driftY: (Math.random() - 0.5) * 0.2,
            freqBin: bin,
            phase: Math.random() * Math.PI * 2,
        }));
    },

    _initHdCircles() {
        const header = this.hdCanvas.parentElement;
        const w = header.offsetWidth;
        const h = header.offsetHeight;
        this.hdCircles = this.hdBins.map((bin, i) => ({
            x: (w / (this.hdBins.length + 1)) * (i + 1) + (Math.random() - 0.5) * 30,
            y: h * 0.5 + (Math.random() - 0.5) * h * 0.4,
            baseRadius: 18 + Math.random() * 30,
            currentRadius: 8,
            targetRadius: 8,
            hue: this.palette[i % this.palette.length],
            baseOpacity: 0.25 + Math.random() * 0.20,
            currentOpacity: 0.08,
            targetOpacity: 0.08,
            driftX: (Math.random() - 0.5) * 0.4,
            driftY: (Math.random() - 0.5) * 0.25,
            freqBin: bin,
            phase: Math.random() * Math.PI * 2,
        }));
    },

    /** Read a frequency bin value (0–1) from the media player, or sine fallback */
    _readFreq(bin, time) {
        const m = window.media;
        if (m && m.analyser && m.freqData && m.vizMode === 'real' && !m.audio.paused) {
            m.analyser.getByteFrequencyData(m.freqData);
            const val = bin < m.freqData.length ? m.freqData[bin] : 0;
            return val / 255;
        }
        // Fake mode: smooth sine oscillation when playing
        if (m && !m.audio.paused && m.audio.src) {
            return Math.sin(time * 0.001 * (1 + bin * 0.3) + bin) * 0.5 + 0.5;
        }
        return 0; // idle
    },

    _isPlaying() {
        const m = window.media;
        return m && !m.audio.paused && m.audio.src;
    },

    _startLoop() {
        if (this._started) return;
        this._started = true;
        const animate = (timestamp) => {
            this.raf = requestAnimationFrame(animate);
            this._drawBg(timestamp);
            this._drawHd(timestamp);
        };
        this.raf = requestAnimationFrame(animate);
    },

    _drawBg(time) {
        if (!this.bgCtx) return;
        const ctx = this.bgCtx;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const playing = this._isPlaying();

        // Fade-clear for gentle trails
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(230, 233, 242, 0.15)';
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'source-over';

        for (const c of this.bgCircles) {
            // Read frequency
            const freq = this._readFreq(c.freqBin, time);

            // Target radius/opacity based on music
            if (playing) {
                c.targetRadius = c.baseRadius * (0.6 + freq * 0.8);
                c.targetOpacity = c.baseOpacity * (0.5 + freq * 1.0);
            } else {
                // Idle: gentle breathing via sine
                const breath = Math.sin(time * 0.0005 + c.phase) * 0.15 + 0.85;
                c.targetRadius = c.baseRadius * 0.4 * breath;
                c.targetOpacity = c.baseOpacity * 0.4;
            }

            // Smooth lerp
            c.currentRadius += (c.targetRadius - c.currentRadius) * 0.06;
            c.currentOpacity += (c.targetOpacity - c.currentOpacity) * 0.06;

            // Drift
            c.x += c.driftX;
            c.y += c.driftY;

            // Wrap around edges with margin
            const margin = c.currentRadius * 2;
            if (c.x < -margin) c.x = w + margin;
            if (c.x > w + margin) c.x = -margin;
            if (c.y < -margin) c.y = h + margin;
            if (c.y > h + margin) c.y = -margin;

            // Slow hue rotation
            const hue = (c.hue + time * 0.005) % 360;

            // Draw concentric rings radiating outward
            const rings = 5;
            const spacing = c.currentRadius / rings;
            for (let r = 0; r < rings; r++) {
                const ringRadius = spacing * (r + 1);
                const fade = 1 - (r / rings);       // outer rings fade out
                const alpha = c.currentOpacity * fade * 1.5;
                if (alpha < 0.005) continue;
                const lightness = 45 + fade * 20;   // inner rings brighter
                ctx.strokeStyle = `hsla(${hue}, 75%, ${lightness}%, ${alpha})`;
                ctx.lineWidth = Math.max(1.5, 4 * fade);
                ctx.beginPath();
                ctx.arc(c.x, c.y, ringRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    },

    _drawHd(time) {
        if (!this.hdCtx) return;
        const ctx = this.hdCtx;
        const header = this.hdCanvas.parentElement;
        const w = header.offsetWidth;
        const h = header.offsetHeight;
        const playing = this._isPlaying();

        // Full clear each frame (small area, no trails needed)
        ctx.clearRect(0, 0, w * 2, h * 2);

        // Additive blending for overlapping glow
        ctx.globalCompositeOperation = 'lighter';

        for (const c of this.hdCircles) {
            const freq = this._readFreq(c.freqBin, time);

            if (playing) {
                c.targetRadius = c.baseRadius * (0.5 + freq * 1.2);
                c.targetOpacity = c.baseOpacity * (0.4 + freq * 1.2);
            } else {
                const breath = Math.sin(time * 0.0008 + c.phase) * 0.12 + 0.88;
                c.targetRadius = c.baseRadius * 0.3 * breath;
                c.targetOpacity = c.baseOpacity * 0.25;
            }

            // Smooth lerp
            c.currentRadius += (c.targetRadius - c.currentRadius) * 0.1;
            c.currentOpacity += (c.targetOpacity - c.currentOpacity) * 0.1;

            // Drift within header bounds
            c.x += c.driftX;
            c.y += c.driftY;

            // Soft bounce off header edges
            if (c.x < -c.baseRadius) c.x = w + c.baseRadius;
            if (c.x > w + c.baseRadius) c.x = -c.baseRadius;
            if (c.y < -c.baseRadius) c.y = h + c.baseRadius;
            if (c.y > h + c.baseRadius) c.y = -c.baseRadius;

            const hue = (c.hue + time * 0.01) % 360;

            const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.currentRadius);
            grad.addColorStop(0, `hsla(${hue}, 80%, 60%, ${c.currentOpacity})`);
            grad.addColorStop(0.4, `hsla(${hue}, 70%, 55%, ${c.currentOpacity * 0.6})`);
            grad.addColorStop(1, `hsla(${hue}, 60%, 50%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.currentRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    },
};

window.ambientViz = ambientViz;
