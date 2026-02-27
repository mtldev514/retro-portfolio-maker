# CLAUDE.md — Development Workflow

## Repository Structure

This is the **engine** (`@mtldev514/retro-portfolio-maker`), an npm package that powers retro portfolio sites.
Child repositories (e.g. `alex_a_montreal`) consume this engine as a dependency.

- `engine/` — Core frontend files (JS, CSS, HTML) copied to dist/ during build
- `scripts/` — CLI scripts (build, dev, admin, sync, init, deploy, validate)
- `templates/user-portfolio/` — Scaffold template for new projects (copied by init/sync)
- `tests/` — Playwright e2e tests
- `test-portfolio/` — Test fixture (data, config, lang) used by tests

## Development Workflow (CRITICAL — always follow this)

### 1. Make changes in the engine repo
- Edit files in `engine/`, `scripts/`, `templates/`, etc.

### 2. Run tests before committing
```bash
npm test
```
- Tests run automatically via pre-push hook (husky), but run them explicitly to catch issues early.
- All 38 tests must pass before pushing.

### 3. Commit and push
```bash
git add <specific files>
git commit -m "descriptive message"
git push
```
- CI auto-publishes to npm on push to main (`.github/workflows/publish-npm.yml`)
- CI auto-bumps the **patch** version — **never manually run `npm version`**
- CI only triggers when publishable files change: `engine/`, `scripts/`, `bin/`, `templates/`, `index.js`, `package.json`, `README.md`, `LICENSE`. Pushing only `.md` files (except README), tests, or `.github/` will NOT trigger a publish.
- To trigger a **minor or major** bump: use GitHub Actions → "Publish to NPM" → Run workflow → choose bump type.
- If push is rejected (CI bumped version), do: `git pull --rebase && git push`

### 4. Wait for CI publish to complete
```bash
gh run list --limit 1
# or
gh run watch <run-id>
```
- Wait for the CI run to succeed before updating child repos.

### 5. Update child repositories (e.g. alex_a_montreal)
```bash
cd /path/to/alex_a_montreal
npm update @mtldev514/retro-portfolio-maker
npx retro-portfolio sync   # Adds any new template files without overwriting user data
npm run build               # Rebuild with new engine
```
- Test locally with `npm run dev` if needed.
- Commit and push the child repo to trigger GitHub Pages deployment.

## Key Architecture

### Theming (styles/ directory)
- Themes are standalone CSS files in `styles/` (e.g. `beton.css`)
- `styles/styles.json` is the registry: theme list, order, default, `allowUserSwitch`
- `styles/theme.json` holds **design token overrides** — applied on top of the base theme via `setProperty()`. Format: `{ "overrides": { "page-bg": "#fff", ... } }`. Applied synchronously from localStorage on load (FOUC prevention).
- `engine/js/themes.js` loads CSS via `<link>` swapping with localStorage caching for FOUC prevention
- Backward compat: falls back to legacy `config/themes.json` if `styles/styles.json` missing

### Build Pipeline
- Engine files copied to `dist/` first
- User files (config/, data/, lang/, styles/) copied on top, overriding engine defaults
- `styles/` directory is user-customizable — users can edit theme CSS or add new themes

### Admin API
- Express-based (`engine/admin/api/index.js`)
- Route modules in `engine/admin/api/routes/` (upload, content, config, translations, styles, integrations)
- Shared libs in `engine/admin/api/lib/` (config-loader, manager, validator)
- Env vars: DATA_DIR, CONFIG_DIR, LANG_DIR, STYLES_DIR, PROJECT_DIR, PORT
- `/api/styles` — read/write `styles.json` (theme registry)
- `/api/styles/tokens` — read/write `theme.json` (CSS token overrides)

### Scripts
- `init` — scaffolds new project from `templates/user-portfolio/`
- `sync` — updates existing project with missing template files (non-destructive)
- `build` — copies engine + user files to `dist/`
- `admin` — launches Express admin API
- `validate` — checks config/data files for errors
- `serve` — static file server for `dist/` (used by `npm run dev`)
- `sync-supabase` — syncs local data files to a Supabase project
- `migrate-data-format` — one-time migration helper for data format changes
- `kill-port` / `list-ports` — port management utilities used by dev scripts

## Coding Principles

- **Engine-first**: All changes go through engine files. Never edit child repos directly.
- **Tests reflect DOM**: When HTML structure changes, update all tests that reference removed/changed elements. Grep tests for selectors and text content of anything you remove.
- **CSS tokens for everything themeable**: Colors, fonts, and visual properties use `var(--token-name)` so users can override them via `theme.json`.
- **Simple selectors over DOM-walking**: Prefer direct CSS selectors (`.parent .child`) over sibling-walking or label-finding patterns in both code and tests.
- **Minimal UI text**: Don't add labels or headings when the UI is self-explanatory (e.g. flags + language names don't need a "Language" heading).
- **Click over hover for interactions**: More accessible and works on touch devices.
- **Don't run tests manually before commits**: Pre-push hooks and CI handle test runs. Only run tests explicitly when debugging failures.
- **Keep it simple**: Don't add abstractions, error handling, or features beyond what's needed for the current task.

## Common Gotchas
- Branch will fall behind origin after every CI publish (version bump commit) — always `git pull --rebase && git push` when rejected
- Pre-push hook runs full test suite — takes ~15s, be patient
- `test-portfolio/` is the test fixture; changes there don't ship to users
- `templates/user-portfolio/` is what gets copied to new/existing projects via `init`/`sync`
- Pushing only `.md` files (other than `README.md`) will NOT trigger CI publish — useful for doc-only commits
- `theme.json` overrides persist in localStorage; clearing it forces a fresh fetch on next load
