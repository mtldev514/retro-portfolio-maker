# Configuration Reference

> This file is maintained by **@mtldev514/retro-portfolio-maker** and is updated automatically when you run `retro-portfolio sync`. Do not rename or move this file.

---

## Table of Contents

- [Overview](#overview)
- [config/app.json](#configappjson)
- [config/categories.json](#configcategoriesjson)
- [config/languages.json](#configlanguagesjson)
- [config/media-types.json](#configmedia-typesjson)
- [styles/styles.json](#stylesstylesjson)
- [Data Files (data/*.json)](#data-files)
- [Language Files (lang/*.json)](#language-files)
- [Environment Variables (.env)](#environment-variables)
- [CLI Commands](#cli-commands)
- [Updating](#updating)
- [Troubleshooting](#troubleshooting)

---

## Overview

Your portfolio is powered by the `@mtldev514/retro-portfolio-maker` engine. You only manage the files in your project root — the engine handles HTML, CSS, JS, and the admin panel.

```
my-portfolio/
├── config/           # Site configuration
│   ├── app.json
│   ├── categories.json
│   ├── languages.json
│   └── media-types.json
├── data/             # Your content (one JSON file per category)
│   ├── painting.json
│   └── projects.json
├── lang/             # Translation files
│   ├── en.json
│   └── fr.json
├── styles/           # Theme CSS files + registry
│   ├── styles.json
│   ├── ciment.css
│   ├── jr16.css
│   ├── beton.css
│   └── bubblegum.css
├── assets/           # Your images and media
├── .env              # Credentials (never committed)
└── .env.example      # Credential template
```

---

## config/app.json

Top-level site settings. All sections are optional — missing sections use sensible defaults.

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

| Section | Field | Description |
|---------|-------|-------------|
| `app` | `name` | Site title displayed in the header |
| `app` | `version` | Version shown in admin panel |
| `app` | `adminTitle` | Title of the admin interface |
| `api` | `host` | Admin API host (default: `127.0.0.1`) |
| `api` | `port` | Admin API port (default: `5001`) |
| `api` | `baseUrl` | Full API URL used by the admin panel |
| `paths` | `dataDir` | Directory containing data JSON files |
| `paths` | `langDir` | Directory containing translation files |
| `paths` | `pagesDir` | Directory for custom HTML pages |
| `github` | `username` | Your GitHub username (for media uploads) |
| `github` | `repoName` | Your repo name (for GitHub release uploads) |
| `github` | `mediaReleaseTag` | Release tag used for large media files |
| `github` | `uploadCategories` | Categories that upload to GitHub (e.g., audio) |
| `counter` | `apiUrl` | Visitor counter API endpoint |
| `winamp` | `title` | Title shown in the Winamp-style audio player |
| `winamp` | `bitrate` | Bitrate display value |
| `winamp` | `frequency` | Frequency display value |
| `pagination` | `pageSize` | Number of items per page (default: `24`) |

---

## config/categories.json

Defines your content types. Each category creates a filter button in the portfolio UI and maps to a data file. **Maximum 7 categories recommended** for optimal UI layout.

### Full Example

```json
{
  "contentTypes": [
    {
      "id": "painting",
      "name": "Painting",
      "icon": "🎨",
      "mediaType": "image",
      "dataFile": "data/painting.json",
      "description": "Traditional paintings using various media",
      "fields": {
        "required": ["title", "url"],
        "optional": [
          {
            "name": "medium",
            "type": "text",
            "label": "Medium",
            "placeholder": "e.g., Oil on canvas, Acrylic, Watercolor"
          },
          {
            "name": "dimensions",
            "type": "text",
            "label": "Dimensions",
            "placeholder": "e.g., 24x36 inches"
          },
          {
            "name": "year",
            "type": "text",
            "label": "Year",
            "placeholder": "e.g., 2024"
          },
          {
            "name": "description",
            "type": "textarea",
            "label": "Description"
          },
          {
            "name": "date",
            "type": "text",
            "label": "Date"
          }
        ]
      }
    }
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier. Used in translation keys as `nav_<id>` |
| `name` | string or i18n object | yes | Display name. Can be `"Painting"` or `{ "en": "Painting", "fr": "Peinture" }` |
| `icon` | string (emoji) | yes | Emoji shown next to the filter button |
| `mediaType` | string | yes | One of: `image`, `audio`, `video`, `text`, `link`. Determines the viewer used |
| `dataFile` | string | yes | Path to the data JSON file (e.g., `data/painting.json`) |
| `description` | string | no | Description shown in the admin panel |
| `fields.required` | string[] | no | Fields the admin panel requires (e.g., `["title", "url"]`) |
| `fields.optional` | object[] | no | Additional metadata fields for the admin form |

### Optional Field Object

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Field key used in data JSON (e.g., `medium`, `genre`) |
| `type` | string | Input type: `text` or `textarea` |
| `label` | string | Label shown in the admin form |
| `placeholder` | string | Placeholder text in the input field |

### Media Type Quick Reference

| `mediaType` | Viewer | Best for |
|-------------|--------|----------|
| `image` | Image gallery with lightbox | Paintings, photos, drawings, sculptures |
| `audio` | Winamp-style audio player | Music, podcasts, sound design |
| `video` | Video player | Films, animations, recordings |
| `text` | Text renderer | Blog posts, poetry, articles |
| `link` | Link card | Web projects, repos, external sites |

### Example: Common Category Setups

**Photography portfolio:**
```json
{
  "id": "photography",
  "name": "Photography",
  "icon": "📷",
  "mediaType": "image",
  "dataFile": "data/photography.json",
  "description": "Photographic works",
  "fields": {
    "required": ["title", "url"],
    "optional": [
      { "name": "camera", "type": "text", "label": "Camera", "placeholder": "e.g., Canon EOS R5" },
      { "name": "lens", "type": "text", "label": "Lens", "placeholder": "e.g., 50mm f/1.8" },
      { "name": "settings", "type": "text", "label": "Settings", "placeholder": "e.g., ISO 400, f/2.8, 1/250s" },
      { "name": "description", "type": "textarea", "label": "Description" }
    ]
  }
}
```

**Music portfolio:**
```json
{
  "id": "music",
  "name": "Music",
  "icon": "🎵",
  "mediaType": "audio",
  "dataFile": "data/music.json",
  "description": "Musical compositions and recordings",
  "fields": {
    "required": ["title", "url"],
    "optional": [
      { "name": "genre", "type": "text", "label": "Genre", "placeholder": "e.g., Jazz, Rock" },
      { "name": "duration", "type": "text", "label": "Duration", "placeholder": "e.g., 3:45" },
      { "name": "lyrics", "type": "textarea", "label": "Lyrics" },
      { "name": "description", "type": "textarea", "label": "Description" }
    ]
  }
}
```

**Code projects:**
```json
{
  "id": "projects",
  "name": "Projects",
  "icon": "💻",
  "mediaType": "link",
  "dataFile": "data/projects.json",
  "description": "Web projects and code repositories",
  "fields": {
    "required": ["title"],
    "optional": [
      { "name": "techStack", "type": "text", "label": "Tech Stack", "placeholder": "e.g., React, Node.js" },
      { "name": "repo", "type": "text", "label": "GitHub Repo", "placeholder": "e.g., username/repo-name" },
      { "name": "liveUrl", "type": "text", "label": "Live URL", "placeholder": "https://example.com" },
      { "name": "description", "type": "textarea", "label": "Description" },
      { "name": "url", "type": "text", "label": "URL" }
    ]
  }
}
```

---

## config/languages.json

Defines supported languages and the default:

```json
{
  "defaultLanguage": "en",
  "supportedLanguages": [
    { "code": "en", "name": "English", "flag": "🇺🇸" },
    { "code": "fr", "name": "Francais", "flag": "🇫🇷" }
  ]
}
```

| Field | Description |
|-------|-------------|
| `defaultLanguage` | Language code used on first visit |
| `supportedLanguages[].code` | ISO language code (e.g., `en`, `fr`, `es`, `ja`) |
| `supportedLanguages[].name` | Display name in the language switcher |
| `supportedLanguages[].flag` | Emoji flag shown next to the language name |

To add a language:
1. Add an entry to `supportedLanguages`
2. Create `lang/<code>.json` (copy `lang/en.json` as a starting point)
3. Translate all keys in the new file
4. Rebuild: `npm run build`

---

## config/media-types.json

Defines how each media type is rendered. You generally don't need to edit this unless adding a new media type.

```json
{
  "mediaTypes": [
    {
      "id": "image",
      "name": "Image",
      "icon": "🖼️",
      "viewer": "ImageViewer",
      "supportsGallery": true,
      "supportsMetadata": true,
      "acceptedFormats": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
      "uploadDestination": "cloudinary",
      "description": "Static images (photos, paintings, drawings, etc.)"
    },
    {
      "id": "audio",
      "name": "Audio",
      "icon": "🎵",
      "viewer": "AudioPlayer",
      "supportsGallery": false,
      "supportsMetadata": false,
      "acceptedFormats": [".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"],
      "uploadDestination": "github",
      "description": "Audio files (music, podcasts, sounds)"
    },
    {
      "id": "video",
      "name": "Video",
      "icon": "🎬",
      "viewer": "VideoPlayer",
      "supportsGallery": false,
      "supportsMetadata": false,
      "acceptedFormats": [".mp4", ".webm", ".mov"],
      "uploadDestination": "cloudinary",
      "description": "Video files (films, animations, recordings)"
    },
    {
      "id": "text",
      "name": "Text",
      "icon": "📝",
      "viewer": "TextRenderer",
      "supportsGallery": false,
      "supportsMetadata": false,
      "acceptedFormats": [".md", ".txt", ".html"],
      "uploadDestination": "none",
      "description": "Text content (blogs, poetry, articles)"
    },
    {
      "id": "link",
      "name": "Link",
      "icon": "🔗",
      "viewer": "LinkCard",
      "supportsGallery": false,
      "supportsMetadata": false,
      "acceptedFormats": [],
      "uploadDestination": "none",
      "description": "External links (projects, websites, portfolios)"
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique identifier, referenced in `categories.json` via `mediaType` |
| `viewer` | Frontend component used to render this type |
| `supportsGallery` | Whether items can be browsed in a gallery/lightbox view |
| `supportsMetadata` | Whether metadata overlay is shown |
| `acceptedFormats` | File extensions accepted for upload |
| `uploadDestination` | Where files are uploaded: `cloudinary`, `github`, or `none` |

---

## styles/styles.json

Controls the theme system:

```json
{
  "defaultTheme": "ciment",
  "allowUserSwitch": true,
  "themes": [
    { "id": "jr16", "name": "JR-16", "emoji": "🌿", "file": "jr16.css" },
    { "id": "beton", "name": "Beton", "emoji": "🌫️", "file": "beton.css" },
    { "id": "ciment", "name": "Ciment", "emoji": "🪨", "file": "ciment.css" },
    { "id": "bubblegum", "name": "Bubble Gum", "emoji": "🍬", "file": "bubblegum.css" }
  ]
}
```

| Field | Description |
|-------|-------------|
| `defaultTheme` | Theme `id` used on first visit |
| `allowUserSwitch` | If `true`, visitors see a theme switcher. Set `false` to lock a single theme |
| `themes[].id` | Unique theme identifier |
| `themes[].name` | Display name in the theme switcher |
| `themes[].emoji` | Emoji shown next to the theme name |
| `themes[].file` | CSS filename in the `styles/` directory |

### Adding a Custom Theme

1. Copy an existing theme: `cp styles/ciment.css styles/my-theme.css`
2. Edit `styles/my-theme.css` with your colors, fonts, and styles
3. Add an entry to `styles/styles.json`:
   ```json
   { "id": "my-theme", "name": "My Theme", "emoji": "🎨", "file": "my-theme.css" }
   ```
4. Rebuild: `npm run build`

---

## Data Files

Each category references a data file in `data/`. The format is:

```json
{
  "items": [
    {
      "id": "unique-id",
      "title": { "en": "My Work", "fr": "Mon Oeuvre" },
      "description": { "en": "Description here", "fr": "Description ici" },
      "image": "https://res.cloudinary.com/your-cloud/image/upload/...",
      "date": "2026-01-15"
    }
  ]
}
```

### Required Fields

| Field | Description |
|-------|-------------|
| `id` | Unique identifier for the item |
| `title` | Display title — string or i18n object `{ "en": "...", "fr": "..." }` |

### Common Optional Fields

| Field | Description |
|-------|-------------|
| `description` | Item description — string or i18n object |
| `image` / `url` | Media URL (Cloudinary, GitHub release, or relative `assets/` path) |
| `date` | Date string (e.g., `"2026-01-15"`) |

### Media-Specific Fields

Additional fields depend on your category's `fields.optional` configuration:

- **Image categories**: `medium`, `dimensions`, `year`
- **Audio categories**: `genre`, `duration`, `lyrics`
- **Link categories**: `techStack`, `repo`, `liveUrl`, `visibility`

---

## Language Files

Translation files live in `lang/` and contain key-value pairs for all UI text.

### Key Naming Conventions

| Pattern | Example | Used for |
|---------|---------|----------|
| `nav_<categoryId>` | `nav_painting` | Filter button labels |
| `header_*` | `header_title` | Header area text |
| `footer_*` | `footer_copy` | Footer text |
| `sidebar_*` | `sidebar_about_title` | Sidebar sections |
| `gallery_*` | `gallery_title` | Gallery view text |
| `detail_*` | `detail_medium` | Detail page labels |
| `index_*` | `index_welcome` | Home page content |
| `admin_*` | `admin_title` | Admin panel text |
| `music_*` | `music_title` | Music section text |
| `filter_*` | `filter_all` | Filter bar text |

### Essential Keys to Customize

These are the keys you'll most likely want to edit for your portfolio:

```json
{
  "header_title": "Your Portfolio Name",
  "header_subtitle": "Your creative tagline",
  "marquee": "*** Your scrolling marquee text ***",
  "sidebar_about_text": "Write a short bio about yourself here.",
  "footer_copy": "© 2026 Your Name",
  "index_welcome": "Hello.",
  "index_intro": "Introduction text about your work."
}
```

### Adding Translations for New Categories

When you add a category with `id: "pottery"`, add these translation keys:

```json
{
  "nav_pottery": "Pottery"
}
```

---

## Environment Variables

The `.env` file stores credentials that should never be committed to git.

```bash
# Cloudinary Configuration (Required for admin image uploads)
# Sign up at: https://cloudinary.com (free tier available)
# Get credentials at: https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# GitHub Configuration (Optional — for large audio/video file uploads)
# Create a token at: https://github.com/settings/tokens
# Required scopes: repo (private repos) or public_repo (public repos)
GITHUB_TOKEN=your_github_token_here
```

---

## CLI Commands

| Command | npm script | Description |
|---------|-----------|-------------|
| `retro-portfolio init [dir]` | — | Create a new portfolio |
| `retro-portfolio sync` | `npm run sync` | Update with latest templates (non-destructive) |
| `retro-portfolio build` | `npm run build` | Build static site to `dist/` |
| `retro-portfolio dev` | `npm run dev` | Dev server on port 8000 |
| `retro-portfolio admin` | `npm run admin` | Admin API on port 5001 |
| `retro-portfolio validate` | `npm run validate` | Validate config and data files |
| `retro-portfolio deploy` | `npm run deploy` | Deploy to GitHub Pages (coming soon) |
| `retro-portfolio ports` | — | List active localhost ports |
| `retro-portfolio kill <port>` | — | Kill process on a port |

**Combined launch:** `npm start` runs both `dev` and `admin` together.

### Command Options

```bash
retro-portfolio init --force            # overwrite existing files
retro-portfolio sync --force            # also update workflow files
retro-portfolio build --output public   # custom output directory
retro-portfolio build --watch           # auto-rebuild on changes
retro-portfolio dev --port 3000         # custom dev server port
retro-portfolio dev --open              # auto-open browser
retro-portfolio admin --port 5002       # custom admin API port
retro-portfolio admin --open            # auto-open browser
```

---

## Updating

To update the engine and get the latest features:

```bash
# 1. Update the npm package
npm update @mtldev514/retro-portfolio-maker

# 2. Sync templates (adds missing files, updates this doc)
npx retro-portfolio sync

# 3. Rebuild your site
npm run build
```

The `sync` command is non-destructive — it never overwrites your data, config, translations, or credentials. It only adds missing files and updates engine-maintained documentation like this file.

---

## Troubleshooting

### Build fails
- Run `npm run validate` to check your config files
- Make sure `config/`, `data/`, and `lang/` directories exist
- Check that every category in `categories.json` has a matching data file

### Admin won't start
- Make sure you have Node.js >= 18 installed (`node --version`)
- Run `npm install` to ensure all dependencies are installed

### Images don't upload or display
- Check `.env` has valid Cloudinary credentials (not placeholder values)
- For local images, place them in `assets/` and use relative paths

### Port already in use
- List active ports: `retro-portfolio ports`
- Kill a port: `retro-portfolio kill 8000`

### After updating, something looks wrong
- Run `npx retro-portfolio sync` to get any missing template files
- Run `npm run validate` to check for config issues
- Rebuild: `npm run build`

---

## Links

- [NPM Package](https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker)
- [GitHub Repository](https://github.com/mtldev514/retro-portfolio-maker)
- [Issues](https://github.com/mtldev514/retro-portfolio-maker/issues)
