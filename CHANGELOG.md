# Changelog

## [1.3.0] - 2026-02-11

### Breaking Changes
- 📦 **Package renamed** from `@mtldev514/retro-portfolio-engine` to `@mtldev514/retro-portfolio-maker`
  - Better reflects what the package does - it makes portfolios!
  - Update your dependencies if upgrading from earlier versions

### Changed
- 🔗 **Admin interface moved** - Now accessible at `/admin.html` instead of `/admin/admin.html`
  - Cleaner URLs
  - Backend files stay organized in `/engine/admin/` subdirectory
- 🌍 **Languages simplified** - Removed MX (Mexican Spanish) and HT (Haitian Creole) options
  - Keeping only EN and FR (languages with default content templates)
  - Users can still add custom languages via config

### Added
- ⚠️ **Enhanced init instructions** - Clear .env configuration guidance after running `init`
  - Prominent warning about Cloudinary credentials
  - Links to get credentials
- 📝 **Environment Configuration section** in QUICKSTART.md
  - Step-by-step setup for Cloudinary
  - Prevents confusion when admin uploads fail

### Fixed
- 🔧 Updated all documentation URLs to reflect new package name
- 🔧 Corrected admin URL references (was incorrectly showing port 5001)

## [1.0.1] - 2026-02-12

### Added
- ✨ **`npm start`** - Nouvelle commande qui lance site + admin en parallèle
- 🐍 **Auto-installation de Flask** - `pip install flask flask-cors` exécuté automatiquement lors de `npm install`
- 📝 **README amélioré** - Documentation complète avec toutes les commandes et troubleshooting

### Changed
- 📦 Package name dans dependencies: `@mtldev514/retro-portfolio-engine` (au lieu de `@retro-portfolio-engine`)
- 📖 README généré maintenant inclut la documentation admin

### Fixed
- 🔧 Correction des dépendances dans package.json généré

## [1.0.0] - 2026-02-12

### Added
- 🎉 Publication initiale du package
- 🏗️ CLI complet avec commandes `init`, `build`, `dev`, `admin`
- 🎨 Engine avec tous les fichiers du site
- 🔧 Interface admin fonctionnelle
- 📦 Templates pour nouveaux utilisateurs
- 🚀 GitHub Actions pour auto-deployment
