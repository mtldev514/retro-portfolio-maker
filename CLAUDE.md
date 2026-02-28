# CLAUDE.md — Development Workflow

## Repository Structure

This is the **engine** (`@mtldev514/retro-portfolio-maker`), an npm package that powers retro portfolio sites.
Child repositories (e.g. `alex_a_montreal`) consume this engine as a dependency.

- `engine/` — Core frontend files (JS, CSS, HTML) copied to dist/ during build
- `scripts/` — CLI scripts (build, dev, admin, sync, init, deploy, validate)
- `templates/user-portfolio/` — Scaffold template for new projects (copied by init/sync)
- `tests/` — Playwright e2e tests
- `test-portfolio/` — Test fixture (data, config, lang) used by tests

## Design Philosophy

### User data is sacred
Users only edit data files (`config/`, `data/`, `lang/`, `styles/`). Their data must be:
- **Clear and self-descriptive** — field names, keys, and structure should make sense on their own, without needing to understand engine internals.
- **Decoupled from engine implementation** — how data is displayed or processed is the engine's concern, not the user's. Don't leak implementation concepts into user-facing data formats.
- **Stable across updates** — `npm update` should just work. When data formats change, the `init`/`sync` scripts handle migration. Never leave runtime fallbacks (e.g. `x.oldKey || x.newKey`) in the codebase — fix the data format at the source.

### Document and justify decisions
Architectural choices must include reasoning, not just implementation. Explain *why*, not just *what*.

### Data model
- **Categories** — user-facing groupings (painting, music, photography). Defined in `config/categories.json` under the `"categories"` key.
- **Media types** — rendering/storage layer (image viewer, audio player, video). Defined in `config/media-types.json`. Multiple categories can share one media type.
- **Category reference files** — ordered UUID arrays in `data/{categoryId}.json` linking items to categories.

These are distinct concepts. Categories describe *what* the content is; media types describe *how* it's rendered.

## Development Workflow (CRITICAL — always follow this)

### 1. Make changes in the engine repo
- Edit files in `engine/`, `scripts/`, `templates/`, etc.

### 2. Run tests before committing
```bash
npm test
```
- Tests run automatically via pre-push hook (husky), but run them explicitly to catch issues early.

### 3. Commit and push
```bash
git add <specific files>
git commit -m "descriptive message"
git push
```
- CI auto-publishes to npm on push to main (`.github/workflows/publish-npm.yml`)
- CI auto-bumps the **patch** version — **never manually run `npm version`**
- CI only triggers when publishable files change: `engine/`, `scripts/`, `bin/`, `templates/`, `index.js`, `package.json`, `README.md`, `LICENSE`
- To trigger a **minor or major** bump: use GitHub Actions → "Publish to NPM" → Run workflow → choose bump type
- If push is rejected (CI bumped version): `git pull --rebase && git push`

### 4. Wait for CI publish, then update child repos
```bash
gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId')
cd /path/to/alex_a_montreal
npm update @mtldev514/retro-portfolio-maker
npx retro-portfolio sync   # Migrates data formats, adds new template files (non-destructive)
npm run build
```

## Key Architecture

### Theming (styles/ directory)
- Themes are standalone CSS files in `styles/` (e.g. `beton.css`)
- `styles/styles.json` — theme registry: list, order, default, `allowUserSwitch`
- `styles/theme.json` — design token overrides applied via `setProperty()`. Format: `{ "overrides": { "page-bg": "#fff", ... } }`
- `engine/js/themes.js` loads CSS via `<link>` swapping with localStorage caching (FOUC prevention)

### Build Pipeline
- Engine files copied to `dist/` first
- User files (config/, data/, lang/, styles/) copied on top, overriding engine defaults
- `styles/` directory is user-customizable — users can edit theme CSS or add new themes

### Admin API
- Express-based (`engine/admin/api/index.js`)
- Route modules in `engine/admin/api/routes/` (upload, content, config, translations, styles, integrations)
- Shared libs in `engine/admin/api/lib/` (config-loader, manager, validator)
- Env vars: DATA_DIR, CONFIG_DIR, LANG_DIR, STYLES_DIR, PROJECT_DIR, PORT

### Scripts
- `init` — scaffolds new project from `templates/user-portfolio/`
- `sync` — updates existing project with missing template files, migrates data formats (non-destructive)
- `build` — copies engine + user files to `dist/`
- `admin` — launches Express admin API
- `validate` — checks config/data files for errors
- `serve` — static file server for `dist/`
- `sync-supabase` — syncs local data to Supabase
- `migrate-data-format` — one-time migration helper

## Coding Principles

- **Engine-first**: All changes go through engine files. Never edit child repos directly.
- **Tests reflect DOM**: When HTML structure changes, update all tests that reference removed/changed elements. Grep tests for selectors and text content of anything you remove.
- **CSS tokens for everything themeable**: Colors, fonts, and visual properties use `var(--token-name)` so users can override them via `theme.json`.
- **Simple selectors over DOM-walking**: Prefer direct CSS selectors (`.parent .child`) over sibling-walking or label-finding patterns.
- **Minimal UI text**: Don't add labels or headings when the UI is self-explanatory.
- **Click over hover for interactions**: More accessible and works on touch devices.
- **Keep it simple**: Don't add abstractions, error handling, or features beyond what's needed for the current task.

## Common Gotchas
- Branch falls behind origin after every CI publish (version bump commit) — always `git pull --rebase && git push` when rejected
- Pre-push hook runs full test suite — takes ~15s, be patient
- `test-portfolio/` is the test fixture; changes there don't ship to users
- `templates/user-portfolio/` is what gets copied to new/existing projects via `init`/`sync`
- Pushing only `.md` files (other than `README.md`) will NOT trigger CI publish — useful for doc-only commits
- `theme.json` overrides persist in localStorage; clearing it forces a fresh fetch on next load
