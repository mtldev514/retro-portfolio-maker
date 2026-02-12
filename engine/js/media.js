/**
 * Winamp-style Media Controller for Alex's Portfolio
 * Manages audio playlist with seek, time display, and mini visualizer
 * Loads tracks dynamically from data/music.json
 */
const media = {
    audio: new Audio(),
    currentTrackIndex: 0,
    playlist: [],
    rawTracks: [],
    vizInterval: null,

    tf(field) {
        if (!field) return '';
        if (typeof field === 'object' && !Array.isArray(field)) {
            const lang = (window.i18n && i18n.currentLang) || 'en';
            return field[lang] || field.en || '';
        }
        return field;
    },

    async init() {
        await this.loadPlaylist();
        this.setupEventListeners();
        this.updateTrackDisplay();
        this.populateTrackSelector();
        this.startViz();
        console.log(`Winamp initialized with ${this.playlist.length} tracks`);
    },

    buildPlaylist() {
        this.playlist = this.rawTracks.map(t => {
            const title = this.tf(t.title);
            const genre = this.tf(t.genre);
            return {
                name: title + (genre ? ` [${genre}]` : ''),
                src: t.url
            };
        });
    },

    async loadPlaylist() {
        try {
            const res = await fetch('data/music.json');
            const tracks = await res.json();
            if (tracks && tracks.length > 0) {
                this.rawTracks = tracks;
                this.buildPlaylist();
            }
        } catch (e) {
            console.log('Could not load music.json');
        }
    },

    populateTrackSelector() {
        const list = document.getElementById('radio-tracklist');
        if (!list) return;
        list.innerHTML = '';
        if (this.playlist.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'winamp-pl-item winamp-pl-empty';
            empty.textContent = (window.i18n && i18n.translations.sidebar_radio_no_tracks) || 'No tracks available';
            list.appendChild(empty);
            return;
        }
        this.playlist.forEach((track, i) => {
            const item = document.createElement('div');
            item.className = 'winamp-pl-item';
            if (i === this.currentTrackIndex) item.classList.add('active');
            item.dataset.index = i;
            item.innerHTML = `<span class="winamp-pl-num">${i + 1}.</span> ${track.name}`;
            item.ondblclick = () => this.switchTrack(i);
            item.onclick = () => {
                // Single click = select, highlight
                list.querySelectorAll('.winamp-pl-item.selected').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
            };
            list.appendChild(item);
        });
    },

    setupEventListeners() {
        const playPauseBtn = document.querySelector('.radio-playpause');
        const prevBtn = document.querySelector('.radio-prev');
        const nextBtn = document.querySelector('.radio-next');
        const volumeSlider = document.querySelector('.radio-volume');
        const seekBar = document.getElementById('winamp-seek');

        if (playPauseBtn) playPauseBtn.onclick = () => this.togglePlayPause();
        if (prevBtn) prevBtn.onclick = () => this.prev();
        if (nextBtn) nextBtn.onclick = () => this.next();

        if (volumeSlider) {
            volumeSlider.oninput = (e) => {
                this.audio.volume = e.target.value / 100;
            };
        }

        // Seek bar
        if (seekBar) {
            seekBar.oninput = (e) => {
                if (this.audio.duration) {
                    this.audio.currentTime = (e.target.value / 100) * this.audio.duration;
                }
            };
        }

        // Update time, duration, and seek position
        this.audio.ontimeupdate = () => {
            const timeEl = document.getElementById('winamp-time');
            if (timeEl) {
                const m = Math.floor(this.audio.currentTime / 60);
                const s = Math.floor(this.audio.currentTime % 60);
                timeEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
            }
            const durEl = document.getElementById('winamp-duration');
            if (durEl && this.audio.duration) {
                const dm = Math.floor(this.audio.duration / 60);
                const ds = Math.floor(this.audio.duration % 60);
                durEl.textContent = String(dm).padStart(2, '0') + ':' + String(ds).padStart(2, '0');
            }
            const seek = document.getElementById('winamp-seek');
            if (seek && this.audio.duration) {
                seek.value = (this.audio.currentTime / this.audio.duration) * 100;
            }
        };

        // Sync playing class and button icon with actual audio state
        this.audio.onplay = () => {
            this.setPlayingState(true);
            this.updatePlayPauseIcon(true);
        };
        this.audio.onpause = () => {
            this.setPlayingState(false);
            this.updatePlayPauseIcon(false);
        };

        // Auto-advance to next track
        this.audio.onended = () => this.next();
    },

    setPlayingState(isPlaying) {
        const winamp = document.querySelector('.winamp');
        if (winamp) winamp.classList.toggle('playing', isPlaying);
    },

    togglePlayPause() {
        if (this.audio.paused) {
            this.play();
        } else {
            this.audio.pause();
        }
    },

    play() {
        if (!this.audio.src && this.playlist.length > 0) this.switchTrack(0);
        const p = this.audio.play();
        if (p && p.catch) p.catch(e => console.warn('Play blocked:', e));
        this.setPlayingState(true);
    },

    updatePlayPauseIcon(isPlaying) {
        const btn = document.querySelector('.radio-playpause');
        if (!btn) return;
        const svg = btn.querySelector('svg');
        if (!svg) return;
        const playPath = 'M8 5v14l11-7z';
        const pausePath = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z';
        svg.querySelector('path').setAttribute('d', isPlaying ? pausePath : playPath);
        btn.title = isPlaying ? 'Pause' : 'Play';
    },

    prev() {
        if (this.playlist.length === 0) return;
        const prev = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
        this.switchTrack(prev);
    },

    next() {
        if (this.playlist.length === 0) return;
        const next = (this.currentTrackIndex + 1) % this.playlist.length;
        this.switchTrack(next);
    },

    switchTrack(index) {
        this.currentTrackIndex = index;
        const track = this.playlist[index];
        if (!track) return;
        this.audio.src = track.src;
        this.updateTrackDisplay();
        this.play();
        // Highlight active track in playlist
        const list = document.getElementById('radio-tracklist');
        if (list) {
            list.querySelectorAll('.winamp-pl-item').forEach(el => {
                el.classList.toggle('active', parseInt(el.dataset.index) === index);
            });
            // Scroll active into view
            const activeEl = list.querySelector('.winamp-pl-item.active');
            if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
        }
    },

    updateTrackDisplay() {
        const el = document.querySelector('.radio-track-name');
        if (!el) return;
        if (this.playlist.length > 0) {
            const idx = this.currentTrackIndex + 1;
            el.innerText = `${idx}. ${this.playlist[this.currentTrackIndex].name}`;
        } else {
            el.innerText = (window.i18n && i18n.translations.sidebar_radio_no_tracks) || 'No tracks available';
        }
        this.setupTickerScroll(el);
    },

    setupTickerScroll(el) {
        if (!el) el = document.querySelector('.radio-track-name');
        if (!el) return;
        const container = el.parentElement;
        const apply = () => {
            if (!container.clientWidth) return;
            const totalDist = container.clientWidth + el.scrollWidth;
            const speed = Math.max(6, totalDist / 40);
            el.style.setProperty('--ticker-speed', `${speed}s`);
            el.style.setProperty('--ticker-end', `-${el.scrollWidth}px`);
        };
        apply();
        setTimeout(apply, 200);
    },

    // Mini fake visualizer (random bars, Winamp style)
    startViz() {
        const viz = document.getElementById('winamp-viz');
        if (!viz) return;

        // Create 12 bars
        viz.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const bar = document.createElement('div');
            bar.className = 'winamp-viz-bar';
            viz.appendChild(bar);
        }

        const bars = viz.querySelectorAll('.winamp-viz-bar');

        // Animate based on play state
        const animate = () => {
            bars.forEach(bar => {
                let h;
                if (!this.audio.paused && this.audio.src) {
                    h = Math.random() * 100;
                } else {
                    h = 3;
                }
                bar.style.height = h + '%';
            });
        };

        this.vizInterval = setInterval(animate, 120);
    }
};

// media.init() is called by the router during boot — no auto-run needed
window.media = media;
