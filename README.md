# @mtldev514/retro-portfolio-maker

[![npm version](https://img.shields.io/npm/v/@mtldev514/retro-portfolio-maker.svg)](https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A portfolio engine for multi-passionate creators with a soft spot for early 2000s aesthetics. Install it as an npm package, keep only your data in your repo, and update the engine without merge conflicts.

---

## Concept

Instead of cloning a repo, you **install an npm package** that contains the build engine, admin panel, and view templates. You keep only **your data** in your own repo.

**Why this approach?**

- **One repo** for the user — just your data, config, and translations
- **Easy updates** — `npm update` brings new features, no merge conflicts
- **Simple workflow** — `npm install` then `npm run build`
- **Admin included** — visual interface to manage content, upload images, edit translations
- **Multi-language** — built-in i18n with as many languages as you need
- **Themeable** — ships with Beton theme, fully customizable via CSS tokens
- **GitHub Pages ready** — deployment workflow included

---

## Quick Start

```bash
# 1. Create a new portfolio
npx @mtldev514/retro-portfolio-maker init my-portfolio
cd my-portfolio

# 2. Install dependencies
npm install

# 3. Launch dev server + admin together
npm start
# Site:  http://localhost:8000
# Admin: http://localhost:8000/admin.html
# API:   http://localhost:5001/api/
```

That's it. Edit your config, add content via the admin panel, and deploy.

---

## Project Structure

After `init`, your project contains **only your data** — no engine code:

```
my-portfolio/
├── package.json             # dependency: @mtldev514/retro-portfolio-maker
├── .env                     # Cloudinary + GitHub credentials
├── .env.example             # credential template
├── .gitignore
├── README.md                # your project README
├── CONFIGURATION.md         # full config reference (auto-updated on sync)
├── config/
│   ├── app.json             # site name, API settings, GitHub, pagination
│   ├── categories.json      # your content types (up to 7)
│   ├── languages.json       # supported languages
│   └── media-types.json     # how media is rendered (image, audio, video...)
├── data/
│   ├── painting.json        # content for each category
│   └── projects.json
├── lang/
│   ├── en.json              # English translations (100+ keys)
│   └── fr.json              # French translations
├── styles/
│   ├── styles.json          # theme registry
│   ├── beton.css            # default theme (add more CSS files for more themes)
│   └── theme.json           # design token overrides
├── assets/                  # your images and media
└── .github/workflows/
    └── deploy.yml           # GitHub Pages auto-deploy
```

After `npm run build`, a `dist/` folder is generated with the complete static site.

---

## CLI Commands

All commands are available via `retro-portfolio <command>` or through npm scripts.

| Command | npm script | Description |
|---------|-----------|-------------|
| `retro-portfolio init [dir]` | — | Create a new portfolio (interactive setup) |
| `retro-portfolio sync` | `npm run sync` | Update portfolio with latest templates (non-destructive) |
| `retro-portfolio build` | `npm run build` | Generate static site in `dist/` |
| `retro-portfolio dev` | `npm run dev` | Start dev server (default: port 8000) |
| `retro-portfolio admin` | `npm run admin` | Start admin API (default: port 5001) |
| `retro-portfolio validate` | `npm run validate` | Check all config and data files |
| `retro-portfolio deploy` | `npm run deploy` | Deploy to GitHub Pages (coming soon) |
| `retro-portfolio ports` | — | List all active localhost ports |
| `retro-portfolio kill <port>` | — | Kill process on a specific port |
| `retro-portfolio localhost` | — | Visual UI to manage localhost servers |

### Command Options

```bash
retro-portfolio init [dir] --force     # overwrite existing files
retro-portfolio sync --force           # also update workflow files and styles.json
retro-portfolio build --output public  # custom output directory
retro-portfolio build --watch          # rebuild on file changes
retro-portfolio dev --port 3000        # custom port
retro-portfolio dev --open             # auto-open browser
retro-portfolio admin --port 5002      # custom API port
retro-portfolio admin --open           # auto-open browser
```

---

## Configuration Reference

> Full configuration reference with all fields and examples is in **CONFIGURATION.md**, which is included in every generated portfolio and updated automatically when you run `retro-portfolio sync`.

Here's a summary of each config file:

### config/app.json

Top-level site settings:

```json
{
  "app": {
    "name": "My Retro Portfolio",
    "version": "1.0",
    "adminTitle": "PORTFOLIO MANAGER"
  },
  "api": {
    "host": "127.0.0.1",
    "port": 5001,
    "baseUrl": "http://127.0.0.1:5001"
  },
  "paths": {
    "dataDir": "data",
    "langDir": "lang",
    "pagesDir": "pages"
  },
  "github": {
    "username": "yourusername",
    "repoName": "your-portfolio",
    "mediaReleaseTag": "media",
    "uploadCategories": ["music"]
  },
  "counter": {
    "apiUrl": "https://api.counterapi.dev/v1/retro-portfolio/visits/up"
  },
  "winamp": {
    "title": "My Playlist",
    "bitrate": "192",
    "frequency": "44"
  },
  "pagination": {
    "pageSize": 24
  }
}
```

### config/categories.json

Define your categories (up to 7 recommended). Each category creates a filter button in the UI. Content is stored in `data/{id}.json`:

```json
{
  "categories": [
    {
      "id": "painting",
      "name": "Painting",
      "icon": "🎨",
      "mediaType": "image",
      "description": "Traditional paintings using various media",
      "fields": {
        "required": ["title", "url"],
        "optional": [
          { "name": "medium", "type": "text", "label": "Medium", "placeholder": "e.g., Oil on canvas" },
          { "name": "dimensions", "type": "text", "label": "Dimensions" },
          { "name": "year", "type": "text", "label": "Year" },
          { "name": "description", "type": "textarea", "label": "Description" },
          { "name": "date", "type": "text", "label": "Date" }
        ]
      }
    }
  ]
}
```

**Key fields:**
- `id` — unique identifier, also determines the data file (`data/{id}.json`) and translation key (`nav_{id}`)
- `name` — display name (string or `{ "en": "...", "fr": "..." }` for i18n)
- `icon` — emoji shown in the filter bar
- `mediaType` — one of: `image`, `audio`, `video`, `text`, `link` (defines the viewer)
- `fields.required` — fields the admin panel requires
- `fields.optional` — extra metadata fields with type, label, and placeholder

### config/languages.json

```json
{
  "defaultLanguage": "en",
  "supportedLanguages": [
    { "code": "en", "name": "English", "flag": "🇺🇸" },
    { "code": "fr", "name": "Francais", "flag": "🇫🇷" }
  ]
}
```

Add any language — just create a matching `lang/<code>.json` file with all translation keys.

### config/media-types.json

Defines how each media type is rendered:

```json
{
  "mediaTypes": [
    { "id": "image", "name": "Image", "viewer": "ImageViewer", "supportsGallery": true, "acceptedFormats": [".jpg", ".png", ".gif", ".webp", ".svg"], "uploadDestination": "cloudinary" },
    { "id": "audio", "name": "Audio", "viewer": "AudioPlayer", "supportsGallery": false, "acceptedFormats": [".mp3", ".wav", ".ogg", ".flac"], "uploadDestination": "github" },
    { "id": "video", "name": "Video", "viewer": "VideoPlayer", "supportsGallery": false, "acceptedFormats": [".mp4", ".webm", ".mov"], "uploadDestination": "cloudinary" },
    { "id": "text",  "name": "Text",  "viewer": "TextRenderer", "supportsGallery": false, "acceptedFormats": [".md", ".txt", ".html"], "uploadDestination": "none" },
    { "id": "link",  "name": "Link",  "viewer": "LinkCard", "supportsGallery": false, "acceptedFormats": [], "uploadDestination": "none" }
  ]
}
```

### styles/styles.json

Theme registry:

```json
{
  "defaultTheme": "beton",
  "allowUserSwitch": false,
  "themes": [
    { "id": "beton", "name": "Beton", "emoji": "🌫️", "file": "beton.css" }
  ]
}
```

Add more themes by creating CSS files in `styles/` and registering them here. Set `allowUserSwitch: true` to let visitors pick a theme.

---

## Data Format

Each category has a data file (e.g., `data/painting.json`). The format is:

```json
{
  "items": [
    {
      "id": "sunset-001",
      "title": { "en": "Sunset", "fr": "Coucher de soleil" },
      "description": { "en": "A beautiful sunset", "fr": "Un magnifique coucher de soleil" },
      "image": "https://res.cloudinary.com/your-cloud/image/upload/...",
      "date": "2026-01-15",
      "medium": "Oil on canvas",
      "dimensions": "24x36 inches"
    }
  ]
}
```

**Notes:**
- `title` and `description` can be i18n objects (`{ "en": "...", "fr": "..." }`) or plain strings
- `image`/`url` should be full URLs (Cloudinary, GitHub release, etc.) or relative paths in `assets/`
- Extra fields (like `medium`, `dimensions`, `genre`) match the `fields.optional` entries in your category config

---

## Workflow

### Initial Setup

```bash
npx @mtldev514/retro-portfolio-maker init my-portfolio
cd my-portfolio
npm install
```

### Configure

1. Edit `config/app.json` — set your site name, GitHub username
2. Edit `config/categories.json` — define your content types (see CONFIGURATION.md for full reference)
3. Edit `lang/en.json` (and other languages) — customize translations
4. Edit `.env` — add your Cloudinary credentials

### Add Content

**Option A: Admin panel (recommended)**

```bash
npm start
# Open http://localhost:8000/admin.html
# Upload images, add descriptions, manage translations
```

**Option B: Edit JSON directly**

```bash
# Edit data files in data/
nano data/painting.json
```

### Preview

```bash
npm run dev
# Open http://localhost:8000
```

### Build and Deploy

```bash
npm run build       # generates dist/
git add . && git commit -m "update portfolio"
git push            # GitHub Action auto-deploys to Pages
```

---

## Updating the Engine

To get the latest features and fixes:

```bash
# Update the engine package
npm update @mtldev514/retro-portfolio-maker

# Sync templates (adds missing files, updates docs, never overwrites your data)
npx retro-portfolio sync

# Rebuild
npm run build
```

### What `sync` does

**Creates if missing:**
- Required directories (`config/`, `data/`, `lang/`, `assets/`)
- Config files (`app.json`, `categories.json`, `languages.json`, `media-types.json`)
- Language files (`en.json`, `fr.json`)
- Theme files (`styles/` directory and `styles.json` registry)
- Missing npm scripts (`validate`, `sync`, `deploy`, etc.)
- `.gitignore`, `.env.example`, GitHub Actions workflow

**Always updates:**
- `CONFIGURATION.md` — full config reference (engine-maintained documentation)
- `.env.example` — latest template

**Never overwrites:**
- Your data files (`data/*.json`)
- Your config files (`config/*.json`)
- Your translations (`lang/*.json`)
- Your credentials (`.env`)
- Your custom npm scripts
- Your custom theme CSS files

---

## Customization

### Creating Your Own Categories

Edit `config/categories.json`. Here's an example replacing the defaults with your own:

```json
{
  "categories": [
    {
      "id": "pottery",
      "name": "Pottery",
      "icon": "🏺",
      "mediaType": "image",
      "description": "My ceramic works",
      "fields": {
        "required": ["title", "url"],
        "optional": [
          { "name": "material", "type": "text", "label": "Material" },
          { "name": "description", "type": "textarea", "label": "Description" }
        ]
      }
    },
    {
      "id": "videos",
      "name": "Videos",
      "icon": "🎬",
      "mediaType": "video",
      "description": "Video projects",
      "fields": {
        "required": ["title", "url"],
        "optional": [
          { "name": "duration", "type": "text", "label": "Duration" },
          { "name": "description", "type": "textarea", "label": "Description" }
        ]
      }
    }
  ]
}
```

Then:
1. Create the data files: `echo '{ "items": [] }' > data/pottery.json && echo '{ "items": [] }' > data/videos.json`
2. Add translations in `lang/en.json`: `"nav_pottery": "Pottery"`, `"nav_videos": "Videos"`
3. Rebuild: `npm run build`

Filter buttons are **automatically generated** from your categories.

### Adding a Custom Theme

1. Duplicate an existing theme CSS file in `styles/`:
   ```bash
   cp styles/beton.css styles/my-theme.css
   ```
2. Edit `styles/my-theme.css` with your colors, fonts, etc.
3. Register it in `styles/styles.json`:
   ```json
   { "id": "my-theme", "name": "My Theme", "emoji": "🎨", "file": "my-theme.css" }
   ```
4. Rebuild: `npm run build`

### Adding a Language

1. Add the language to `config/languages.json`
2. Create `lang/<code>.json` with all translation keys (copy `lang/en.json` as a starting point)
3. Rebuild

---

## Deployment

### GitHub Pages (Automatic)

The `init` command creates `.github/workflows/deploy.yml` automatically. Just:

1. Push your code to GitHub
2. Go to repo Settings > Pages > Source: **GitHub Actions**
3. Every push to `main` auto-builds and deploys

### Netlify / Vercel

- **Build command:** `npm run build`
- **Publish directory:** `dist`

---

## Prerequisites

- **Node.js** >= 18

---

## Troubleshooting

### Build fails
```bash
# Make sure required directories exist
ls config/ data/ lang/

# Validate your config files
npm run validate

# Reinstall if needed
rm -rf node_modules && npm install
```

### Admin won't start
```bash
# Make sure Node.js >= 18 is installed
node --version

# Reinstall dependencies
npm install
```

### Images don't display
- Check that image URLs in your data files are complete (Cloudinary URLs, etc.)
- For local images, place them in `assets/` and reference as `assets/image.jpg`

### Port already in use
```bash
# Find what's using the port
retro-portfolio ports

# Kill a specific port
retro-portfolio kill 8000
```

---

## Contributing

1. Fork [retro-portfolio-maker](https://github.com/mtldev514/retro-portfolio-maker)
2. Create a feature branch
3. Run tests: `npm test`
4. Submit a Pull Request

---

## License

MIT

---

## Links

- [NPM Package](https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker)
- [GitHub Repository](https://github.com/mtldev514/retro-portfolio-maker)
- [Issues](https://github.com/mtldev514/retro-portfolio-maker/issues)

---

**Made with love for the creative community**
