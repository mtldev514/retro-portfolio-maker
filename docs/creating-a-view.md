# Creating a View

A view is a visual theme for the portfolio. It's a folder of HTML, CSS, and JS files that the build script copies into `dist/`. The engine provides data loading, translations, and page lifecycle — the view provides the look and feel.

Two built-in views ship with the engine: `retro` (DOS/terminal aesthetic) and `modern` (dark editorial, 2025-style).

## Quick Start

```
views/my-view/
  index.js              # entry point (2 lines)
  view/
    index.html          # page shell
    style.css           # all styles
    js/
      init.js           # boot sequence
      render.js         # gallery rendering
      router.js         # SPA navigation (optional)
    pages/
      detail.html       # detail page template (optional)
```

### 1. Entry point

```js
// views/my-view/index.js
const path = require('path');
module.exports = { viewPath: path.join(__dirname, 'view') };
```

### 2. Activate it

In the project's `config/app.json`, add at the **top level** (not inside `"app"`):

```json
{
  "view": "my-view",
  "app": { ... }
}
```

If omitted, defaults to `"retro"`.

---

## What the Build Does

1. Copies your entire `view/` directory into `dist/`
2. Injects **core JS modules** into `dist/js/` (won't overwrite if your view provides its own):
   - `config-loader.js` (AppConfig)
   - `i18n.js` (translations)
   - `page.js` (loading screen lifecycle)
   - `audio-player.js` (shared audio engine with Web Audio)
3. Injects **filter buttons** into `#filter-nav` (if your HTML has one)
4. Copies user data directories (`config/`, `data/`, `lang/`, `styles/`) into `dist/`

---

## Required DOM Elements

Your `index.html` must include these:

```html
<!-- Loading screen (dismissed by page.js) -->
<div id="loading-screen">
    <!-- your loading UI here -->
</div>

<!-- Main content area (gallery + detail rendered here) -->
<div id="app">
    <!-- Filter buttons auto-injected by build -->
    <div id="filter-nav"></div>
</div>
```

| Element | Purpose |
|---------|---------|
| `#loading-screen` | Shown during init. Removed by `page.dismissLoadingScreen()` |
| `#app` | Main container. Router swaps content in/out of here |
| `#filter-nav` | Build injects category filter buttons here. Optional — build skips injection if absent |

### Filter Buttons (auto-generated)

The build reads `config/categories.json` + `config/display.json` and generates buttons like:

```html
<button class="filter-btn active" data-filter="all" title="All">✱</button>
<button class="filter-btn" data-filter="photography" title="Photography">📷</button>
```

Your CSS styles these. Your JS wires click handlers.

---

## Core APIs

Four JS modules are always available. They're injected by the build into `dist/js/`.

### AppConfig (`config-loader.js`)

Load first — everything else depends on it.

```js
await AppConfig.load()                           // must be called first, returns boolean

// Categories & Media Types
AppConfig.getAllCategories()                      // [{id, name, icon, mediaType}]
AppConfig.getAllMediaTypes()                      // [{id, viewer, supportsGallery}]
AppConfig.getCategory(id)                        // single category object
AppConfig.getMediaType(id)                       // single media type object

// Data fetching
AppConfig.fetchMediaTypeItems(mediaTypeId)       // [{id, title, url, created, ...}]
AppConfig.fetchCategoryRefs(categoryId)          // [uuid, uuid, ...] — ordered item IDs

// Display schema (drives card/detail rendering)
AppConfig.getDisplaySchema(categoryId)           // {icon, card, detail}

// Settings
AppConfig.getSetting('pagination.pageSize')      // value from app.json (e.g. 24)
AppConfig.getSetting('paths.dataDir')            // "data"
```

### i18n (`i18n.js`)

Attribute-based translation system.

```js
await i18n.init()                                // loads default language, translates DOM
i18n.currentLang                                 // "en"
i18n.translations                                // {key: "value", ...}
i18n.changeLang('fr')                            // async — switches language, updates DOM
i18n.updateDOM()                                 // re-scan [data-i18n] after DOM changes
```

In HTML, mark translatable elements:

```html
<h1 data-i18n="header_title">My Portfolio</h1>
<span data-i18n="footer_copy">&copy; 2026 My Portfolio</span>
```

`i18n.updateDOM()` finds all `[data-i18n]` elements and replaces their text with the translation for that key.

### page (`page.js`)

Page lifecycle state machine.

```js
page.state                    // "loading" | "revealing" | "ready" | "navigating"
page.reducedMotion            // true if prefers-reduced-motion
page.dismissLoadingScreen()   // call after init is complete
page.onReady(fn)              // callback when state reaches "ready"
```

### audioPlayer (`audio-player.js`)

Shared audio engine for music playback and frequency analysis.

Views wire their own UI to this player via callbacks — **never** create an `AudioContext` or call `createMediaElementSource()` in view code. The engine handles Web Audio, CORS fallback, and audio element lifecycle.

```js
await audioPlayer.init()                         // load playlist, set up audio events

// Playback controls
audioPlayer.play()                               // lazy AudioContext init on first play
audioPlayer.pause()
audioPlayer.togglePlayPause()
audioPlayer.switchTrack(index)                   // set src, fire onTrackChange, play
audioPlayer.prev()                               // wraparound to previous track
audioPlayer.next()                               // wraparound to next track

// State queries
audioPlayer.isPlaying()                          // true if audio playing
audioPlayer.currentTrack()                       // current playlist entry or null
audioPlayer.playlist                             // [{name, shortName, src, raw}]
audioPlayer.currentTrackIndex                    // current index into playlist

// Frequency data (for visualizers)
audioPlayer.readFrequency(bin, time)             // 0–1 value for frequency bin
// Returns real FFT data if Web Audio connected,
// sine fallback if playing without analyser,
// 0 if idle.

// Callbacks (set by view before calling init)
audioPlayer.onTrackChange = (track, index) => {} // track switched
audioPlayer.onPlayStateChange = (isPlaying) => {} // play/pause state changed
audioPlayer.onPlaylistLoaded = (playlist) => {}  // playlist ready
audioPlayer.onTimeUpdate = (currentTime, duration) => {} // playback position
audioPlayer.onError = (error) => {}              // load/play error
```

**Important:** The audio player owns the single `AudioContext` and `AnalyserNode`. Visualizers in any view call `audioPlayer.readFrequency(bin, time)` to get spectrum data — no Web Audio code needed in view files.

---

## Data Flow

This is how items get from data files to the screen:

```
1. AppConfig.getAllMediaTypes()
   → [{id: "image"}, {id: "audio"}, ...]

2. AppConfig.fetchMediaTypeItems("image")
   → [{id: "uuid-1", title: "Pelican", url: "photo.jpg", ...}, ...]

3. AppConfig.getAllCategories()
   → [{id: "photography", mediaType: "image"}, ...]

4. AppConfig.fetchCategoryRefs("photography")
   → ["uuid-1", "uuid-3", "uuid-7"]

5. Resolve UUIDs: match ref UUIDs to media type items
   → tagged items: [{...item, _category: "photography"}, ...]

6. Render cards from tagged items
```

**Categories** are user-facing groupings (painting, music). **Media types** are the rendering layer (image viewer, audio player). Multiple categories can share one media type.

**Category ref files** (`data/{categoryId}.json`) are ordered UUID arrays that link items to categories and control display order.

---

## Display Schema

`config/display.json` tells your renderer how to display each category's cards and detail pages. Access it via `AppConfig.getDisplaySchema(categoryId)`.

### Card Schema

```json
{
  "card": {
    "visual": "image",
    "subtitle": { "field": "medium", "format": "parenthesized" },
    "badges": [{ "field": "status", "map": { "wip": "🔒" } }],
    "actions": [{
      "condition": { "field": "type", "equals": "public" },
      "links": [
        { "field": "github", "labelKey": "link_github", "icon": "github" },
        { "field": "website", "labelKey": "link_website", "icon": "external-link" }
      ]
    }]
  }
}
```

| `visual` value | Meaning |
|----------------|---------|
| `"image"` | Show thumbnail from `item.url` |
| `"play-button"` | Show play icon (for audio items) |
| `"icon"` | Show category emoji |

### Detail Schema

```json
{
  "detail": {
    "hero": "image-gallery",
    "meta": [
      { "field": "created", "icon": "📅", "labelKey": "detail_date" }
    ],
    "sections": [
      { "field": "description", "renderer": "text-block", "labelKey": "detail_description" }
    ]
  }
}
```

| `hero` value | Meaning |
|--------------|---------|
| `"image-gallery"` | Large image with lightbox on click |
| `"play-inline"` | Embedded `<audio>` player |
| `"none"` | No hero section |

---

## Multilingual Fields

Item fields like `title` and `description` can be multilingual objects:

```json
{ "en": "My Painting", "fr": "Mon Tableau" }
```

Resolve them to the current language:

```js
function t(field) {
    if (!field) return '';
    if (typeof field === 'object' && !Array.isArray(field)) {
        const lang = (window.i18n && i18n.currentLang) || 'en';
        return field[lang] || field.en || '';
    }
    return field;
}
```

---

## Init Sequence

Your `init.js` should follow this order:

```js
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load config (everything depends on it)
    await AppConfig.load();

    // 2. Build language selector from AppConfig.languages
    // (populate your language UI here)

    // 3. Load translations
    await i18n.init();

    // 4. Set up your view's UI (theme toggle, etc.)

    // 5. Render gallery (calls AppConfig to fetch items)
    await renderer.init();

    // 6. Init any extra features (radio, visualizer, etc.)

    // 7. Dismiss loading screen — MUST be last
    page.dismissLoadingScreen();
});
```

---

## Gallery Rendering

Your renderer creates `.gallery-item` elements with `data-category` attributes:

```html
<div class="gallery-item" data-category="photography">
    <div class="gallery-item-visual">
        <img src="photo.jpg" alt="Pelican" loading="lazy">
    </div>
    <div class="gallery-item-info">
        <div class="gallery-item-title">Pelican</div>
    </div>
</div>
```

### Filter Wiring

The build generates filter buttons. Your JS wires them:

```js
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        // Toggle active class, re-render grid with filtered items
    });
});
```

### Pagination

Show items in batches (default page size from `AppConfig.getSetting('pagination.pageSize')`). Add a "Load More" button or use IntersectionObserver for auto-load.

---

## SPA Routing (Optional)

If your view uses client-side routing (grid <-> detail), the pattern is:

1. Intercept internal `<a>` clicks, call `history.pushState()`
2. Listen for `popstate` (back/forward)
3. On detail route: fetch `pages/detail.html`, swap into `#app`
4. On grid route: restore gallery

Set `page.state = 'navigating'` during transitions, `'ready'` after.

---

## Language Selector Pattern

Build a dropdown from config:

```js
function initLanguageSelector() {
    const dropdown = document.querySelector('.settings-dropdown');
    const langs = AppConfig.languages?.supportedLanguages || [];
    langs.forEach(lang => {
        const option = document.createElement('div');
        option.className = 'settings-option';
        option.onclick = () => i18n.changeLang(lang.code);
        option.innerHTML = `<span class="lang-flag">${lang.flag}</span> ${lang.name}`;
        dropdown.appendChild(option);
    });
}
```

---

## Script Loading Order

In your `index.html`:

```html
<!-- Config loader MUST be first (sync, not deferred) -->
<script src="js/config-loader.js"></script>

<!-- Core modules (deferred) -->
<script src="js/i18n.js" defer></script>
<script src="js/page.js" defer></script>
<script src="js/audio-player.js" defer></script>

<!-- Your view modules (deferred, loaded after core) -->
<script src="js/render.js" defer></script>
<script src="js/router.js" defer></script>
<script src="js/init.js" defer></script>  <!-- MUST be last -->
```

`config-loader.js` is **not deferred** because `AppConfig` must be available globally before other scripts run. All others use `defer` to maintain order while loading in parallel.

---

## Checklist

Before shipping your view:

- [ ] `views/{name}/index.js` exports `{ viewPath }`
- [ ] `index.html` has `#loading-screen` and `#app`
- [ ] `index.html` has `#filter-nav` (if you want auto-generated filter buttons)
- [ ] `init.js` calls `AppConfig.load()`, `i18n.init()`, `page.dismissLoadingScreen()` in order
- [ ] Gallery items use `.gallery-item` with `data-category` attribute
- [ ] Filter buttons use `.filter-btn` with `data-filter` attribute
- [ ] `[data-i18n]` on all user-facing text
- [ ] Detail page has `.detail-title` and `.detail-hero`
- [ ] Set `"view": "{name}"` in `config/app.json` (top-level, not inside `"app"`)
- [ ] `npm test` with default view still passes (your view is additive)
