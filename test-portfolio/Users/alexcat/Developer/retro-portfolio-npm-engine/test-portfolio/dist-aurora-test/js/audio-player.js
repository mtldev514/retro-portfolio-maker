/**
 * Shared Audio Player — Engine Module
 *
 * Manages playlist loading from AppConfig, playback controls, and
 * Web Audio API frequency analysis for visualizers.
 *
 * Views wire their own UI to this player via callbacks.
 * Available as `window.audioPlayer` after loading.
 *
 * Usage:
 *   await audioPlayer.init();
 *   audioPlayer.onTrackChange = (track, index) => updateMyUI(track);
 *   audioPlayer.onPlayStateChange = (playing) => toggleIcon(playing);
 *   audioPlayer.play();
 */
const audioPlayer = {
    audio: Object.assign(new Audio(), { crossOrigin: 'anonymous' }),
    playlist: [],
    rawTracks: [],
    currentTrackIndex: 0,

    // Web Audio API (lazy — created on first play)
    audioCtx: null,
    analyser: null,
    sourceNode: null,
    freqData: null,
    vizMode: 'fake', // 'real' once AudioContext connected

    // Private
    _noCors: false,

    // ─── Callbacks (set by view) ────────────────────
    onTrackChange: null,     // (track, index) => {}
    onPlayStateChange: null, // (isPlaying) => {}
    onPlaylistLoaded: null,  // (playlist) => {}
    onTimeUpdate: null,      // (currentTime, duration) => {}
    onError: null,           // (error) => {}

    // ─── Multilingual helper ────────────────────────
    tf(field) {
        if (!field) return '';
        if (typeof field === 'object' && !Array.isArray(field)) {
            const lang = (window.i18n && i18n.currentLang) || 'en';
            return field[lang] || field.en || '';
        }
        return field;
    },

    // ─── Initialization ─────────────────────────────
    async init() {
        await this.loadPlaylist();
        this._setupAudioEvents();
        if (this.onPlaylistLoaded) this.onPlaylistLoaded(this.playlist);
    },

    async loadPlaylist() {
        try {
            const allAudio = await window.AppConfig.fetchMediaTypeItems('audio');
            if (!allAudio || allAudio.length === 0) return;

            // Try category-filtered playlist (ordered by user)
            const audioDisplay = window.AppConfig.getMediaTypeDisplay?.('audio');
            const categoryId = audioDisplay?.sidebarPlayer?.categoryId;

            if (categoryId) {
                try {
                    const refs = await window.AppConfig.fetchCategoryRefs(categoryId);
                    const itemMap = new Map(allAudio.map(i => [i.id, i]));
                    const tracks = refs.map(uuid => itemMap.get(uuid)).filter(Boolean);
                    if (tracks.length > 0) {
                        this.rawTracks = tracks;
                        this._buildPlaylist();
                        return;
                    }
                } catch {
                    // Category refs failed — fall through to all audio
                }
            }

            // Fallback: use all audio items
            this.rawTracks = allAudio.filter(t => t.url);
            this._buildPlaylist();
        } catch (e) {
            console.warn('Could not load audio playlist:', e.message || e);
            if (this.onError) this.onError(e);
        }
    },

    _buildPlaylist() {
        this.playlist = this.rawTracks.map(t => {
            const title = this.tf(t.title);
            const genre = this.tf(t.genre);
            return {
                name: title + (genre ? ` [${genre}]` : ''),
                shortName: title,
                src: t.url,
                raw: t
            };
        });
    },

    // ─── Audio Events ───────────────────────────────
    _setupAudioEvents() {
        this.audio.onplay = () => {
            if (this.onPlayStateChange) this.onPlayStateChange(true);
        };
        this.audio.onpause = () => {
            if (this.onPlayStateChange) this.onPlayStateChange(false);
        };
        this.audio.ontimeupdate = () => {
            if (this.onTimeUpdate) this.onTimeUpdate(this.audio.currentTime, this.audio.duration);
        };
        this.audio.onended = () => this.next();
        this.audio.onerror = () => {
            if (this.audio.crossOrigin && !this._noCors) {
                console.warn('Audio CORS load failed, rebuilding without crossOrigin');
                this._rebuildAudioElement();
            }
        };
    },

    // ─── Playback Controls ──────────────────────────
    async play() {
        if (!this.audio.src && this.playlist.length > 0) {
            this.switchTrack(0);
            return;
        }
        this._ensureAudioContext();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            try { await this.audioCtx.resume(); } catch (_) {}
        }
        const p = this.audio.play();
        if (p && p.catch) p.catch(e => console.warn('Play blocked:', e));
    },

    pause() {
        this.audio.pause();
    },

    togglePlayPause() {
        if (this.audio.paused) {
            this.play();
        } else {
            this.pause();
        }
    },

    switchTrack(index) {
        this.currentTrackIndex = index;
        const track = this.playlist[index];
        if (!track) return;
        this.audio.src = track.src;
        if (this.onTrackChange) this.onTrackChange(track, index);
        this.play();
    },

    prev() {
        if (this.playlist.length === 0) return;
        const idx = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
        this.switchTrack(idx);
    },

    next() {
        if (this.playlist.length === 0) return;
        const idx = (this.currentTrackIndex + 1) % this.playlist.length;
        this.switchTrack(idx);
    },

    // ─── State Queries ──────────────────────────────
    isPlaying() {
        return this.audio && !this.audio.paused && !!this.audio.src;
    },

    currentTrack() {
        return this.playlist[this.currentTrackIndex] || null;
    },

    // ─── Web Audio API ──────────────────────────────
    /**
     * Lazily connect Web Audio analyser on first play.
     * createMediaElementSource() permanently captures audio output —
     * if it fails after capture, we must rebuild the Audio element.
     */
    _ensureAudioContext() {
        if (this.audioCtx) return;
        if (this._noCors) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            const ctx = new AC();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.6;
            const source = ctx.createMediaElementSource(this.audio);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            this.audioCtx = ctx;
            this.analyser = analyser;
            this.sourceNode = source;
            this.freqData = new Uint8Array(analyser.frequencyBinCount);
            this.vizMode = 'real';
        } catch (e) {
            console.warn('AudioContext unavailable, using fake viz:', e.message);
            this.vizMode = 'fake';
        }
    },

    /**
     * Read a frequency bin value (0–1) for visualizers.
     * Returns real data if Web Audio connected, sine fallback if playing
     * without analyser, or 0 if idle.
     */
    readFrequency(bin, time) {
        if (this.vizMode === 'real' && this.analyser && this.freqData && this.isPlaying()) {
            this.analyser.getByteFrequencyData(this.freqData);
            const val = bin < this.freqData.length ? this.freqData[bin] : 0;
            return val / 255;
        }
        if (this.isPlaying()) {
            return Math.sin(time * 0.001 * (1 + bin * 0.3) + bin) * 0.5 + 0.5;
        }
        return 0;
    },

    // ─── CORS Fallback ──────────────────────────────
    /**
     * Recreate Audio element without crossOrigin for direct playback.
     * Called when CORS headers are missing and crossOrigin fails.
     */
    _rebuildAudioElement() {
        const wasPlaying = !this.audio.paused;
        const src = this.audio.src;
        const vol = this.audio.volume;
        this.audio.pause();
        this.audio.removeAttribute('src');
        if (this.sourceNode) { try { this.sourceNode.disconnect(); } catch (_) {} }
        if (this.analyser) { try { this.analyser.disconnect(); } catch (_) {} }
        if (this.audioCtx) { try { this.audioCtx.close(); } catch (_) {} }
        this.audioCtx = null;
        this.analyser = null;
        this.sourceNode = null;
        this.freqData = null;
        this.vizMode = 'fake';
        this._noCors = true;
        this.audio = new Audio();
        this.audio.volume = vol;
        this._setupAudioEvents();
        if (src) {
            this.audio.src = src;
            if (wasPlaying) this.audio.play().catch(() => {});
        }
    }
};

window.audioPlayer = audioPlayer;
