# Adding a New View to the Engine

This guide explains how to properly add a new view (complete layout alternative) to the retro-portfolio-maker engine.

## Quick Overview

A **view** is a complete alternative layout/design for a portfolio. The engine supports multiple views:
- Each view has its own HTML structure, CSS, and JavaScript
- Users select their view in `config/app.json` via the `"view"` field
- Built-in views live in `engine/views/{viewName}/`

Think of views as "themes" if they're just styling, or "layouts" if they change the DOM structure. Both are implemented the same way.

---

## Directory Structure

All views follow this standardized structure:

```
views/my-view/
├── index.js                    # Entry point (required)
└── view/                        # View files directory (required)
    ├── index.html              # Main HTML file
    ├── style.css               # Main stylesheet
    ├── js/
    │   ├── init.js             # Initialization logic
    │   ├── render.js           # Rendering functions
    │   ├── router.js           # Route handling
    │   └── (other modules)
    ├── pages/
    │   └── detail.html         # Detail page template (if needed)
    └── styles/                 # Optional: theme registry & overrides
        ├── styles.json         # Theme list & default
        ├── theme.json          # CSS token overrides
        └── *.css               # Theme CSS files
```

### Key Files

#### `views/{viewName}/index.js`

This is the entry point. It must export a `viewPath` pointing to the `view/` subdirectory:

```javascript
const path = require('path');
module.exports = { viewPath: path.join(__dirname, 'view') };
```

**Do not deviate from this pattern.** The build system expects exactly this structure.

#### `views/{viewName}/view/index.html`

Your main HTML file. Must include:
- Standard `<meta charset>` and viewport
- `<script src="js/config-loader.js"></script>` (sync, no defer)
- Deferred scripts for core modules: `page.js`, `i18n.js`, etc.
- View-specific scripts: `init.js`, `render.js`, `router.js`

Example head section:
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title data-i18n="header_title">Portfolio</title>

    <!-- Stylesheets -->
    <link rel="stylesheet" href="style.css">

    <!-- Config loader MUST be first (no defer) -->
    <script src="js/config-loader.js"></script>

    <!-- Core modules (deferred) -->
    <script src="js/i18n.js" defer></script>
    <script src="js/page.js" defer></script>

    <!-- View modules (deferred, after core) -->
    <script src="js/render.js" defer></script>
    <script src="js/router.js" defer></script>
    <script src="js/init.js" defer></script>
</head>
```

#### `views/{viewName}/view/js/init.js`

Orchestrates view initialization. Called after all modules load. Example:

```javascript
page.onReady(() => {
  // Initialize your view
  render.init();
  router.init();
});
```

#### `views/{viewName}/view/style.css`

Main stylesheet. Should use CSS custom properties (variables) for colors, fonts, and spacing so users can override via `theme.json`.

Example:
```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #000000;
  --accent: #0066cc;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.button {
  background: var(--accent);
}
```

---

## Core Modules Available to All Views

These modules are injected by the build system and are available to every view:

### `config-loader.js`
Loads configuration (app.json, categories.json, languages.json, media-types.json).
- Supports local (bundled), Supabase, and remote data sources
- Exposes `window.config`

### `i18n.js`
Internationalization module.
- Loads language files and applies translations
- Watches for `data-i18n` attributes in HTML

### `page.js`
Page lifecycle state machine.
- States: `loading` → `revealing` → `ready` ↔ `navigating`
- Exposes `page.onReady(fn)`, `page.state`, `page.reducedMotion`

### `audio-player.js` (optional)
Shared audio engine for portfolio items.

### Others
- `router.js` (for navigation)
- `media.js` (for media handling)
- `effects.js` (for animations/effects)

---

## Optional: Supporting Multiple Themes with `styles/`

If your view supports multiple theme CSS files (like retro does), add a `styles/` subdirectory:

```
views/my-view/view/styles/
├── styles.json           # Theme registry
├── theme.json            # CSS token overrides
├── theme-dark.css        # Dark theme
├── theme-light.css       # Light theme
└── theme-retro.css       # Retro theme
```

### `styles/styles.json`

Defines available themes:
```json
{
  "defaultTheme": "theme-dark",
  "allowUserSwitch": true,
  "themes": [
    { "id": "theme-dark", "name": "Aurora Dark", "emoji": "🌙", "file": "theme-dark.css" },
    { "id": "theme-light", "name": "Aurora Light", "emoji": "☀️", "file": "theme-light.css" }
  ]
}
```

### `styles/theme.json`

Design token overrides applied via CSS `setProperty()`:
```json
{
  "overrides": {
    "bg-primary": "#1a1a1a",
    "text-primary": "#ffffff",
    "accent": "#ff6b6b"
  }
}
```

---

## Integration Checklist

- [ ] Create `views/{name}/` directory
- [ ] Create `views/{name}/index.js` with proper export
- [ ] Create `views/{name}/view/` subdirectory
- [ ] Copy/create `views/{name}/view/index.html`
- [ ] Copy/create `views/{name}/view/style.css`
- [ ] Copy/create `views/{name}/view/js/` with init.js, render.js, router.js
- [ ] If supporting multiple themes, create `views/{name}/view/styles/` with styles.json and theme CSS files
- [ ] Test build: `npm run build -- --view {name}`
- [ ] Test that user can select via `config/app.json`: `"view": "{name}"`

---

## Testing Your View

1. **Place test data** in `test-portfolio/` (or create a simple project folder)
2. **Build with your view:**
   ```bash
   npm run build -- --view my-view
   ```
3. **Serve and check:**
   ```bash
   npm run serve
   ```
4. **Verify:**
   - Page loads without errors
   - Content renders correctly
   - Navigation works (if router is present)
   - Responsive layout works (if applicable)

---

## Critical Design Directive: Songs vs Links Structure

When rendering gallery items, **always structure content and actions distinctly**:

- **Main card content** (visual + title + metadata):
  - Clickable → navigates to detail page
  - Title and metadata in consistent, readable spacing
  - Text hierarchy should be clear (title larger, subtitle smaller)

- **Action links** (external URLs, GitHub, etc.):
  - Rendered OUTSIDE or BELOW the main clickable area
  - Separate visual treatment (different styling, icons)
  - Should not compete with main card click target
  - Requires `stopPropagation()` to prevent triggering detail view

**Why**: Users should instantly distinguish between:
- **Songs** (or main content): clicking opens the detail view
- **Links** (or actions): external destinations separate from the portfolio item itself

This keeps the visual hierarchy clean and the UI clear.

---

## Common Mistakes to Avoid

❌ **Putting files in wrong directory**
- Wrong: `aurora/index.html` at root
- Right: `views/aurora/view/index.html`

❌ **Forgetting the `index.js` entry point**
- Every view MUST have `views/{name}/index.js`

❌ **Not loading core modules**
- Always include: `<script src="js/config-loader.js"></script>` (sync)
- Always defer core: `<script src="js/page.js" defer></script>`

❌ **Hardcoding colors instead of using CSS variables**
- Use `var(--token-name)` for all colors, fonts, spacing
- Users should be able to customize via `theme.json`

❌ **Not testing with actual data**
- Use `test-portfolio/` or a real project folder
- Don't just eyeball the HTML—test with real config/data files

❌ **Forgetting to render action links**
- Display schema `card.actions` must be rendered in your view
- Don't just show title and visual—external links are important metadata
- Keep them distinct from the main clickable content (songs vs links directive)

---

## Migration from Old View Structure

If migrating an existing view from an old structure:

```bash
# Old (wrong)
aurora/
  index.js
  index.html
  style.css
  init.js

# New (correct)
views/aurora/
  index.js
  view/
    index.html
    style.css
    js/
      init.js
```

1. Create `views/aurora/view/js/` directory
2. Move all JS files into `js/` subdirectory
3. Move HTML and CSS to `view/` root
4. Create new `views/aurora/index.js` with proper export
5. Delete old aurora directory at repo root

---

## Related Documentation

- **Theme customization:** See `templates/user-portfolio/styles/` for how users customize themes
- **Data model:** See `CLAUDE.md` for categories, media types, and data structure
- **Build pipeline:** See `scripts/build.js` for how views are integrated
