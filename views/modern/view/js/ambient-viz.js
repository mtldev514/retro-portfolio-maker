/**
 * Modern View — Header Ambient Orbs
 *
 * A few soft glowing circles behind the site header that gently
 * react to audio from the shared audioPlayer engine module.
 *
 * No AudioContext here — frequency reading is handled by audioPlayer.readFrequency().
 */
const ambientViz = {
    canvas: null,
    ctx: null,
    orbs: [],
    raf: null,

    init() {
        const header = document.querySelector('.site-header');
        if (!header) return;

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'ambient-header-canvas';
        header.style.position = 'relative';
        header.insertBefore(this.canvas, header.firstChild);

        this.ctx = this.canvas.getContext('2d');
        this._resize(header);
        this._seedOrbs(header);

        window.addEventListener('resize', () => {
            this._resize(header);
            this._seedOrbs(header);
        });

        const loop = (t) => { this.raf = requestAnimationFrame(loop); this._draw(t); };
        this.raf = requestAnimationFrame(loop);
    },

    _resize(header) {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const w = header.offsetWidth;
        const h = header.offsetHeight;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.scale(dpr, dpr);
    },

    _seedOrbs(header) {
        const w = header.offsetWidth;
        const h = header.offsetHeight;
        const hues = [35, 280, 180, 45, 200];
        this.orbs = hues.map((hue, i) => ({
            x: (w / (hues.length + 1)) * (i + 1) + (Math.random() - 0.5) * 60,
            y: h * 0.5 + (Math.random() - 0.5) * h * 0.5,
            baseR: 50 + Math.random() * 50,
            r: 20, tr: 20,
            hue,
            baseA: 0.25 + Math.random() * 0.15,
            a: 0.10, ta: 0.10,
            dx: (Math.random() - 0.5) * 0.12,
            dy: (Math.random() - 0.5) * 0.06,
            bin: [1, 4, 8, 14, 20][i],
            phase: Math.random() * Math.PI * 2,
        }));
    },

    _draw(t) {
        const ctx = this.ctx;
        if (!ctx) return;
        const header = this.canvas.parentElement;
        const w = header.offsetWidth;
        const h = header.offsetHeight;
        const player = window.audioPlayer;
        const playing = player && player.isPlaying();

        ctx.clearRect(0, 0, w * 2, h * 2);
        ctx.globalCompositeOperation = 'lighter';

        for (const o of this.orbs) {
            const f = player ? player.readFrequency(o.bin, t) : 0;

            if (playing) {
                o.tr = o.baseR * (0.5 + f * 0.5);
                o.ta = o.baseA * (0.4 + f * 0.6);
            } else {
                const b = Math.sin(t * 0.0004 + o.phase) * 0.15 + 0.85;
                o.tr = o.baseR * 0.45 * b;
                o.ta = o.baseA * 0.4;
            }

            o.r += (o.tr - o.r) * 0.04;
            o.a += (o.ta - o.a) * 0.04;
            o.x += o.dx;
            o.y += o.dy;
            if (o.x < -o.baseR) o.x = w + o.baseR;
            if (o.x > w + o.baseR) o.x = -o.baseR;
            if (o.y < -o.baseR) o.y = h + o.baseR;
            if (o.y > h + o.baseR) o.y = -o.baseR;

            const hue = (o.hue + t * 0.005) % 360;
            const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
            g.addColorStop(0, `hsla(${hue}, 50%, 55%, ${o.a})`);
            g.addColorStop(0.5, `hsla(${hue}, 40%, 50%, ${o.a * 0.5})`);
            g.addColorStop(1, `hsla(${hue}, 30%, 45%, 0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};

window.ambientViz = ambientViz;
