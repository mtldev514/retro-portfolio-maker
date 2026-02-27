/**
 * Ambient Music-Reactive Visualizer — Header Glow
 *
 * Canvas with radial-gradient circles inside #ambient-header that pulse
 * with audio frequency data from the media player.
 */
const ambientViz = {
    hdCanvas: null,
    hdCtx: null,
    hdCircles: [],

    raf: null,
    _started: false,

    // Color palette (HSL hues) — WMP-inspired warm/cool mix
    palette: [300, 180, 270, 40, 160, 330],

    // Frequency bins for header circles
    hdBins: [1, 3, 6, 10, 16, 22],

    init() {
        this.hdCanvas = document.getElementById('ambient-header');
        if (!this.hdCanvas) return;

        this.hdCtx = this.hdCanvas.getContext('2d');
        const header = this.hdCanvas.parentElement;
        this._sizeCanvas(this.hdCanvas, header.offsetWidth, header.offsetHeight);
        this._initHdCircles();

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
        if (this.hdCanvas) {
            const header = this.hdCanvas.parentElement;
            this._sizeCanvas(this.hdCanvas, header.offsetWidth, header.offsetHeight);
        }
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
            this._drawHd(timestamp);
        };
        this.raf = requestAnimationFrame(animate);
    },

    // ─── Header Glow (Canvas) ────────────────────────────

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
