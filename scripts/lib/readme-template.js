/**
 * Shared README template for generated portfolios.
 * Used by both init.js (create) and sync.js (update).
 */

function generateReadme(projectName) {
  return `# ${projectName}

A retro-styled portfolio powered by [@mtldev514/retro-portfolio-maker](https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker).

## Quick Start

\`\`\`bash
# 1. Install dependencies (auto-installs Python Flask for admin)
npm install

# 2. Configure credentials (required for admin image uploads)
# Edit .env and add your Cloudinary credentials
# Get them at: https://cloudinary.com/console

# 3. Launch site + admin together
npm start
# Site:  http://localhost:8000
# Admin: http://localhost:8000/admin.html
# API:   http://localhost:5001/api/

# Or launch separately:
npm run dev      # site only (port 8000)
npm run admin    # admin API only (port 5001)
\`\`\`

## Project Structure

\`\`\`
config/           Site configuration
  app.json          Site name, API settings, GitHub, pagination
  categories.json   Your content types (up to 7)
  languages.json    Supported languages
  media-types.json  How media is rendered (image, audio, video...)
data/             Your content (one JSON file per category)
lang/             Translation files (en.json, fr.json, etc.)
styles/           Theme CSS files + registry (styles.json)
assets/           Your images and media
.env              Credentials (never committed to git)
\`\`\`

> See **CONFIGURATION.md** for the full config reference with all fields and examples.

## Commands

| Command | Description |
|---------|-------------|
| \`npm start\` | Launch site + admin together |
| \`npm run dev\` | Dev server only (port 8000) |
| \`npm run admin\` | Admin API only (port 5001) |
| \`npm run build\` | Build static site to \`dist/\` |
| \`npm run sync\` | Update templates from latest engine version |
| \`npm run validate\` | Check config and data files for errors |

## Environment Setup

Before using the admin interface, configure \`.env\` with your Cloudinary credentials:

\`\`\`bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
\`\`\`

Sign up at [cloudinary.com](https://cloudinary.com) (free tier available). Optional: add \`GITHUB_TOKEN\` for large audio/video uploads.

## Adding Content

**Via admin panel (recommended):** Run \`npm start\`, open http://localhost:8000/admin.html

**Via JSON:** Edit data files directly in \`data/\` (see CONFIGURATION.md for format)

## Customization

- **Site name and settings**: \`config/app.json\`
- **Content categories** (up to 7): \`config/categories.json\`
- **Languages**: \`config/languages.json\` + \`lang/<code>.json\`
- **Themes**: \`styles/styles.json\` + CSS files in \`styles/\`
- **Translations**: \`lang/en.json\`, \`lang/fr.json\`, etc.

## Updating the Engine

\`\`\`bash
npm update @mtldev514/retro-portfolio-maker
npx retro-portfolio sync    # adds missing files, updates docs (never overwrites your data)
npm run build
\`\`\`

## Deployment

### GitHub Pages (Automatic)

A GitHub Action is included. Push to \`main\` and your site auto-deploys.

1. Push your code to GitHub
2. Go to Settings > Pages > Source: **GitHub Actions**
3. Every push to \`main\` builds and deploys automatically

### Netlify / Vercel

Build command: \`npm run build\` | Publish directory: \`dist\`

## Troubleshooting

- **Admin won't start**: \`pip install flask flask-cors\`
- **Images won't upload**: Check \`.env\` has valid Cloudinary credentials
- **Build fails**: Run \`npm run validate\` to check config files
- **Port in use**: \`npx retro-portfolio kill 8000\`

## Documentation

- [CONFIGURATION.md](./CONFIGURATION.md) — Full config reference (auto-updated on sync)
- [NPM Package](https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker)
- [GitHub](https://github.com/mtldev514/retro-portfolio-maker)

---

**Made with love using @mtldev514/retro-portfolio-maker**
`;
}

module.exports = generateReadme;
