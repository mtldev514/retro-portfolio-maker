/**
 * Modern View Mini Radio — UI Wrapper
 *
 * Compact audio player widget for the header.
 * Delegates all audio operations to the shared audioPlayer engine module.
 *
 * No AudioContext or createMediaElementSource here — that's the engine's job.
 */
const radio = {
    async init() {
        const widget = document.getElementById('radio-widget');
        if (!widget) return;

        const player = window.audioPlayer;
        if (!player) return;

        // Wire callbacks before init
        player.onPlaylistLoaded = (playlist) => {
            if (playlist.length === 0) widget.style.display = 'none';
        };
        player.onTrackChange = () => this.updateDisplay();
        player.onPlayStateChange = () => this.updatePlayButton();

        await player.init();

        if (player.playlist.length === 0) {
            widget.style.display = 'none';
            return;
        }

        this.setupUI();
        this.updateDisplay();
    },

    setupUI() {
        const player = window.audioPlayer;
        const playBtn = document.getElementById('radio-play');
        const prevBtn = document.getElementById('radio-prev');
        const nextBtn = document.getElementById('radio-next');
        const trackName = document.getElementById('radio-track');

        if (playBtn) playBtn.addEventListener('click', () => player.togglePlayPause());
        if (prevBtn) prevBtn.addEventListener('click', () => player.prev());
        if (nextBtn) nextBtn.addEventListener('click', () => player.next());
        if (trackName) trackName.addEventListener('click', () => this.togglePlaylist());
    },

    updateDisplay() {
        const player = window.audioPlayer;
        const trackEl = document.getElementById('radio-track');
        if (!trackEl || player.playlist.length === 0) return;
        const track = player.playlist[player.currentTrackIndex];
        if (track) trackEl.textContent = track.shortName || track.name;
        this.updatePlayButton();
        this.highlightPlaylistItem();
    },

    updatePlayButton() {
        const btn = document.getElementById('radio-play');
        if (btn) btn.textContent = window.audioPlayer.isPlaying() ? '⏸' : '▶';
    },

    togglePlaylist() {
        const list = document.getElementById('radio-playlist');
        if (!list) return;

        if (list.classList.contains('open')) {
            list.classList.remove('open');
            return;
        }

        // Build playlist items on first open
        if (list.children.length === 0) {
            const player = window.audioPlayer;
            player.playlist.forEach((track, i) => {
                const item = document.createElement('div');
                item.className = 'radio-playlist-item';
                item.textContent = track.shortName || track.name;
                item.addEventListener('click', () => player.switchTrack(i));
                list.appendChild(item);
            });
        }

        list.classList.add('open');
        this.highlightPlaylistItem();
    },

    highlightPlaylistItem() {
        const list = document.getElementById('radio-playlist');
        if (!list) return;
        const idx = window.audioPlayer.currentTrackIndex;
        list.querySelectorAll('.radio-playlist-item').forEach((el, i) => {
            el.classList.toggle('active', i === idx);
        });
    }
};

window.radio = radio;
