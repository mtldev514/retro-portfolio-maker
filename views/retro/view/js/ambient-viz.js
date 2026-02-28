/**
 * Ambient Music-Reactive Visualizer — Header Glow
 *
 * Canvas with radial-gradient circles inside #ambient-header that pulse
 * with audio frequency data from the shared audioPlayer engine module.
 *
 * No AudioContext here — frequency reading is handled by audioPlayer.readFrequency().
 */
const ambientViz = {
    hdCanvas: null,
    hdCtx: null,
    hdCircles: [],
    raf: null,
    _started: false,

    palette: [300, 180, 270, 40, 160, 330],
    hdBins: [1, 3, 6, 10, 16, 22, 2, 8, 14, 20],

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
            const parent = this.hdCanvas.parentElement;
            this._sizeCanvas(this.hdCanvas, parent.offsetWidth, parent.offsetHeight);
            this._initHdCircles();
        }
    },

    _initHdCircles() {
        const header = this.hdCanvas.parentElement;
        const w = header.offsetWidth;
        const h = header.offsetHeight;
        this.hdCircles = this.hdBins.map((bin, i) => ({
            x: (w / (this.hdBins.length + 1)) * (i + 1) + (Math.random() - 0.5) * 30,
            y: h * 0.5 + (Math.random() - 0.5) * h * 0.4,
            baseRadius: 30 + Math.random() * 50,
            currentRadius: 8,
            targetRadius: 8,
            hue: this.palette[i % this.palette.length],
            baseOpacity: 0.12 + Math.random() * 0.10,
            currentOpacity: 0.08,
            targetOpacity: 0.08,
            driftX: (Math.random() - 0.5) * 0.2,
            driftY: (Math.random() - 0.5) * 0.12,
            freqBin: bin,
            phase: Math.random() * Math.PI * 2,
        }));
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

    _drawHd(time) {
        if (!this.hdCtx) return;
        const ctx = this.hdCtx;
        const header = this.hdCanvas.parentElement;
        const w = header.offsetWidth;
        const h = header.offsetHeight;
        const player = window.audioPlayer;
        const playing = player && player.isPlaying();

        ctx.clearRect(0, 0, w * 2, h * 2);
        ctx.globalCompositeOperation = 'lighter';

        for (const c of this.hdCircles) {
            const freq = player ? player.readFrequency(c.freqBin, time) : 0;

            if (playing) {
                c.targetRadius = c.baseRadius * (0.4 + freq * 0.6);
                c.targetOpacity = c.baseOpacity * (0.3 + freq * 0.5);
            } else {
                const breath = Math.sin(time * 0.0004 + c.phase) * 0.12 + 0.88;
                c.targetRadius = c.baseRadius * 0.3 * breath;
                c.targetOpacity = c.baseOpacity * 0.25;
            }

            c.currentRadius += (c.targetRadius - c.currentRadius) * 0.04;
            c.currentOpacity += (c.targetOpacity - c.currentOpacity) * 0.04;

            c.x += c.driftX;
            c.y += c.driftY;
            if (c.x < -c.baseRadius) c.x = w + c.baseRadius;
            if (c.x > w + c.baseRadius) c.x = -c.baseRadius;
            if (c.y < -c.baseRadius) c.y = h + c.baseRadius;
            if (c.y > h + c.baseRadius) c.y = -c.baseRadius;

            const hue = (c.hue + time * 0.005) % 360;
            const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.currentRadius);
            grad.addColorStop(0, `hsla(${hue}, 50%, 50%, ${c.currentOpacity})`);
            grad.addColorStop(0.4, `hsla(${hue}, 40%, 45%, ${c.currentOpacity * 0.5})`);
            grad.addColorStop(1, `hsla(${hue}, 30%, 40%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.currentRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    },
};

window.ambientViz = ambientViz;
