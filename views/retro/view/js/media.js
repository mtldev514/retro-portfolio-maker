/**
 * Winamp-style Media Controller — Retro View
 *
 * Thin UI wrapper over the shared audioPlayer engine module.
 * Manages the Winamp DOM (seek bar, time display, playlist, transport buttons)
 * while delegating all audio operations to window.audioPlayer.
 *
 * No AudioContext or createMediaElementSource here — that's the engine's job.
 */
const media = {
    async init() {
        const player = window.audioPlayer;
        if (!player) { console.warn('audioPlayer not available'); return; }

        // Wire callbacks before init so we catch the first playlist load
        player.onPlaylistLoaded = () => {
            this.populateTrackSelector();
            this.updateTrackDisplay();
        };
        player.onTrackChange = () => {
            this.updateTrackDisplay();
            this.highlightActiveTrack();
        };
        player.onPlayStateChange = (playing) => {
            this.setPlayingState(playing);
            this.updatePlayPauseIcon(playing);
        };
        player.onTimeUpdate = (currentTime, duration) => {
            this.updateTime(currentTime, duration);
        };

        await player.init();
        this.setupUI();
        this.updateTrackDisplay();
        console.log(`Winamp initialized with ${player.playlist.length} tracks`);
    },

    // ─── UI Setup ─────────────────────────────────────
    setupUI() {
        const player = window.audioPlayer;
        const playPauseBtn = document.querySelector('.radio-playpause');
        const prevBtn = document.querySelector('.radio-prev');
        const nextBtn = document.querySelector('.radio-next');
        const volumeSlider = document.querySelector('.radio-volume');
        const seekBar = document.getElementById('winamp-seek');

        if (playPauseBtn) playPauseBtn.onclick = () => player.togglePlayPause();
        if (prevBtn) prevBtn.onclick = () => player.prev();
        if (nextBtn) nextBtn.onclick = () => player.next();

        if (volumeSlider) {
            volumeSlider.oninput = (e) => { player.audio.volume = e.target.value / 100; };
        }

        if (seekBar) {
            seekBar.oninput = (e) => {
                if (player.audio.duration) {
                    player.audio.currentTime = (e.target.value / 100) * player.audio.duration;
                }
            };
        }
    },

    // ─── Time & Seek Display ──────────────────────────
    updateTime(currentTime, duration) {
        const timeEl = document.getElementById('winamp-time');
        if (timeEl) {
            const m = Math.floor(currentTime / 60);
            const s = Math.floor(currentTime % 60);
            timeEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        }
        const durEl = document.getElementById('winamp-duration');
        if (durEl && duration) {
            const dm = Math.floor(duration / 60);
            const ds = Math.floor(duration % 60);
            durEl.textContent = String(dm).padStart(2, '0') + ':' + String(ds).padStart(2, '0');
        }
        const seek = document.getElementById('winamp-seek');
        if (seek && duration) {
            seek.value = (currentTime / duration) * 100;
        }
    },

    // ─── Play State ───────────────────────────────────
    setPlayingState(isPlaying) {
        const winamp = document.querySelector('.winamp');
        if (winamp) winamp.classList.toggle('playing', isPlaying);
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

    // ─── Track Display ────────────────────────────────
    updateTrackDisplay() {
        const player = window.audioPlayer;
        const el = document.querySelector('.radio-track-name');
        if (!el) return;
        if (player.playlist.length > 0) {
            const idx = player.currentTrackIndex + 1;
            el.innerText = `${idx}. ${player.playlist[player.currentTrackIndex].name}`;
        } else {
            el.innerText = (window.i18n && i18n.translations.sidebar_radio_no_tracks) || 'No tracks available';
        }
    },

    // ─── Playlist DOM ─────────────────────────────────
    populateTrackSelector() {
        const player = window.audioPlayer;
        const list = document.getElementById('radio-tracklist');
        if (!list) return;
        list.innerHTML = '';
        if (player.playlist.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'winamp-pl-item winamp-pl-empty';
            empty.textContent = (window.i18n && i18n.translations.sidebar_radio_no_tracks) || 'No tracks available';
            list.appendChild(empty);
            return;
        }
        player.playlist.forEach((track, i) => {
            const item = document.createElement('div');
            item.className = 'winamp-pl-item';
            if (i === player.currentTrackIndex) item.classList.add('active');
            item.dataset.index = i;
            item.innerHTML = `<span class="winamp-pl-num">${i + 1}.</span> ${track.name}`;
            item.ondblclick = () => player.switchTrack(i);
            item.onclick = () => {
                list.querySelectorAll('.winamp-pl-item.selected').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
            };
            list.appendChild(item);
        });
    },

    highlightActiveTrack() {
        const player = window.audioPlayer;
        const list = document.getElementById('radio-tracklist');
        if (!list) return;
        list.querySelectorAll('.winamp-pl-item').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.index) === player.currentTrackIndex);
        });
        const activeEl = list.querySelector('.winamp-pl-item.active');
        if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }
};

// media.init() is called by init.js during boot
window.media = media;
