# Adding a New View/Theme — Integration Checklist

This checklist ensures any new view is properly integrated and compatible with the build system.

## Before You Start

- [ ] Understand the difference: **View** = complete HTML layout (like retro/aurora) vs **Theme** = CSS styling only
- [ ] Read `VIEWS.md` for complete documentation
- [ ] Have your view code ready (HTML, CSS, JS modules)

---

## Integration Steps

### 1. Directory Structure Setup
- [ ] Create `views/{name}/` directory
- [ ] Create `views/{name}/view/` subdirectory
- [ ] Create `views/{name}/view/js/` subdirectory
- [ ] Create `views/{name}/view/pages/` subdirectory (if detail pages needed)
- [ ] Create `views/{name}/view/styles/` subdirectory (optional, only if supporting multiple themes)

**✓ CRITICAL:** The structure must be exactly `views/{name}/index.js` + `views/{name}/view/`. The build system expects this layout.

### 2. Entry Point
- [ ] Create `views/{name}/index.js` with this exact content:
  ```javascript
  const path = require('path');
  module.exports = { viewPath: path.join(__dirname, 'view') };
  ```
- [ ] Verify it exports `viewPath` (required by build system)

**✓ CRITICAL:** Do not deviate from this pattern. The build system reads and uses this export.

### 3. HTML & Assets
- [ ] Create `views/{name}/view/index.html`
- [ ] Include `<script src="js/config-loader.js"></script>` (sync, no defer) — MUST be first
- [ ] Include deferred core modules: `i18n.js`, `page.js`
- [ ] Include deferred view modules: `render.js`, `router.js`, `init.js`
- [ ] Use `data-i18n` attributes for translatable text
- [ ] Create `views/{name}/view/style.css` with CSS custom properties
- [ ] Use `var(--token-name)` for all themeable properties (colors, fonts, spacing)

**✓ CRITICAL:** Script loading order matters. config-loader must be sync and first.

### 4. JavaScript Modules
- [ ] Create `views/{name}/view/js/init.js` — initialization logic
- [ ] Create `views/{name}/view/js/render.js` — rendering functions
- [ ] Create `views/{name}/view/js/router.js` — route handling (if using navigation)
- [ ] Each module should call `page.onReady(fn)` to wait for core modules
- [ ] Access config via `window.config` (loaded by config-loader.js)

Example `init.js`:
```javascript
page.onReady(() => {
  // Initialize after all core modules are loaded
  render.init();
  router.init();
});
```

### 5. Detail Pages (if applicable)
- [ ] Create `views/{name}/view/pages/detail.html` for item detail view
- [ ] Structure similar to main `index.html` but for single-item display
- [ ] Include same script references as main page

### 6. CSS Tokens (Required for Compatibility)

Your CSS must use custom properties for theming:

```css
:root {
  /* Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #000000;
  --text-secondary: #666666;
  --accent: #0066cc;

  /* Spacing */
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --radius: 4px;

  /* Typography */
  --font-family: 'Your Font', system-ui, sans-serif;
  --font-size-base: 16px;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-family);
  font-size: var(--font-size-base);
}
```

**✓ CRITICAL:** All colors, fonts, and spacing must use CSS variables so users can customize via `theme.json`.

### 7. Optional: Multiple Themes
If supporting multiple theme CSS files (like retro does):

- [ ] Create `views/{name}/view/styles/styles.json`:
  ```json
  {
    "defaultTheme": "theme-name",
    "allowUserSwitch": true,
    "themes": [
      { "id": "theme-1", "name": "Theme 1", "emoji": "🎨", "file": "theme-1.css" }
    ]
  }
  ```
- [ ] Create `views/{name}/view/styles/theme.json`:
  ```json
  {
    "overrides": {
      "bg-primary": "#custom-color",
      "accent": "#custom-accent"
    }
  }
  ```
- [ ] Create individual theme CSS files in `styles/` directory

**Note:** This is optional. Single-theme views work fine without it.

---

## Validation

Run these checks before committing:

### 1. Structure Validation
```bash
node -e "
const path = require('path');
const fs = require('fs');
const name = '{viewName}';
const viewDir = path.join(process.cwd(), 'views', name);
const viewPkg = require(viewDir);
console.log(fs.existsSync(path.join(viewPkg.viewPath, 'index.html')) ? '✅ index.html' : '❌ Missing index.html');
console.log(fs.existsSync(path.join(viewPkg.viewPath, 'js/init.js')) ? '✅ init.js' : '❌ Missing init.js');
console.log(fs.existsSync(path.join(viewPkg.viewPath, 'js/render.js')) ? '✅ render.js' : '❌ Missing render.js');
console.log(fs.existsSync(path.join(viewPkg.viewPath, 'js/router.js')) ? '✅ router.js' : '❌ Missing router.js');
"
```

### 2. HTML Validation
- [ ] No hardcoded colors (use CSS variables)
- [ ] All text uses `data-i18n` attributes
- [ ] Scripts load in correct order (config-loader sync, then core deferred, then view deferred)

### 3. CSS Validation
- [ ] All themeable properties use CSS variables
- [ ] No hardcoded color values in component styles
- [ ] Variable names are clear and consistent

### 4. Build Test
In a child project (like test-portfolio/):
- [ ] Update `config/app.json`: `"view": "{viewName}"`
- [ ] Run `npm run build`
- [ ] Check output: `npm run serve`
- [ ] Verify page loads without errors
- [ ] Test navigation (if router present)
- [ ] Test responsive layout

---

## Common Mistakes

❌ **Wrong directory structure**
```
aurora/                    # ❌ Root location
  index.js
  index.html
```
```
views/aurora/              # ✅ Correct location
  index.js
  view/
    index.html
```

❌ **Missing index.js**
Every view MUST have `views/{name}/index.js` with proper export.

❌ **Incorrect script loading**
```html
<!-- ❌ Wrong: config-loader deferred -->
<script src="js/config-loader.js" defer></script>

<!-- ✅ Correct: config-loader sync -->
<script src="js/config-loader.js"></script>
<script src="js/page.js" defer></script>
```

❌ **Hardcoded colors instead of variables**
```css
/* ❌ Wrong */
.button { background: #0066cc; }

/* ✅ Correct */
.button { background: var(--accent); }
```

❌ **Not using data-i18n for text**
```html
<!-- ❌ Wrong: hardcoded text -->
<h1>My Portfolio</h1>

<!-- ✅ Correct: translatable -->
<h1 data-i18n="header_title">My Portfolio</h1>
```

---

## Next: Register the View

Once integrated, users can select your view in their `config/app.json`:

```json
{
  "view": "{viewName}"
}
```

The build system will automatically:
1. Load your view from `views/{viewName}/`
2. Inject core JS modules
3. Copy admin files
4. Overlay user data
5. Generate output in `dist/`

---

## Need Help?

- **VIEWS.md** — Complete documentation with examples
- **AURORA_COMPATIBILITY_REPORT.md** — Real-world example of a compatible view
- **Build script** — `scripts/build.js` shows how views are loaded

