# CLAUDE.md — Development Workflow

## Repository Structure

This is the **engine** (`@mtldev514/portfolio-maker`), an npm package that powers portfolio sites.
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
- Tests run automatically via pre-commit hook (husky), but run them explicitly to catch issues early.
- All 53+ tests must pass before pushing.

### 3. Commit and push
```bash
git add <specific files>
git commit -m "descriptive message"
git push
```
- CI auto-publishes to npm on push to main (`.github/workflows/publish-npm.yml`)
- CI auto-bumps the patch version — **never manually run `npm version`**
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
npm update @mtldev514/portfolio-maker
npx portfolio sync   # Adds any new template files without overwriting user data
npm run build               # Rebuild with new engine
```
- Test locally with `npm run dev` if needed.
- Commit and push the child repo to trigger GitHub Pages deployment.

## Key Architecture

### Theming (styles/ directory)
- Themes are standalone CSS files in `styles/` (e.g. `ciment.css`, `bubblegum.css`)
- `styles/styles.json` is the registry: theme list, order, default, allowUserSwitch
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
- `/api/styles` endpoints for reading/writing styles.json from admin panel

### Scripts
- `init` — scaffolds new project from templates/user-portfolio/
- `sync` — updates existing project with missing template files (non-destructive)
- `build` — copies engine + user files to dist/
- `admin` — launches Express admin API
- `validate` — checks config/data files for errors (Node.js-based)

## Common Gotchas
- Branch may fall behind origin after CI version bump — always `git pull --rebase` before pushing
- Pre-commit hook runs full test suite — be patient (takes ~10s)
- `test-portfolio/` is the test fixture; changes there don't ship to users
- `templates/user-portfolio/` is what gets copied to new/existing projects
