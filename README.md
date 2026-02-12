# @mtldev514/retro-portfolio-maker

[![npm version](https://badge.fury.io/js/%40retro-portfolio%2Fengine.svg)](https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This is what I always wanted. As someone with multiple interests, I always wanted to have a portfolio to display my many, many, many projects. I also have a very soft spot for the early 2000s.

I hope this portfolio manager will help you have a personal presence that speaks to your soul. Fully customizable. You can easily support many languages, and play with the theme to make it your own.

---

## 🎯 Concept

Au lieu de cloner un repo complet, vous **installez un package NPM** qui contient tout le moteur (HTML, CSS, JS, admin). Vous gardez uniquement **vos données** dans votre repo.

### Avantages

✅ **Un seul repo** pour l'utilisateur (juste ses données)
✅ **Mises à jour faciles** via `npm update`
✅ **Pas de merge conflicts** pour récupérer les nouvelles features
✅ **Workflow simple** : `npm install` → `npm run build`
✅ **Admin inclus** pour gérer le contenu visuellement

---

## 🚀 Quick Start

### Pour créer votre portfolio

```bash
# 1. Créer un nouveau portfolio
npx @mtldev514/retro-portfolio-maker init mon-portfolio
cd mon-portfolio

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de dev
npm run dev

# 4. Ouvrir http://localhost:8000
```

C'est tout ! 🎉

---

## 📦 Installation dans un projet existant

```bash
npm install @mtldev514/retro-portfolio-maker
```

Puis ajoutez les scripts dans votre `package.json` :

```json
{
  "scripts": {
    "build": "retro-portfolio build",
    "dev": "retro-portfolio dev",
    "admin": "retro-portfolio admin"
  }
}
```

---

## 📁 Structure de votre projet

Après `init`, votre projet contient **uniquement vos données** :

```
mon-portfolio/
├── package.json          (dépendance: @mtldev514/retro-portfolio-maker)
├── config/               (VOS configurations)
│   ├── app.json
│   ├── languages.json
│   └── categories.json
├── data/                 (VOTRE contenu)
│   ├── painting.json
│   └── projects.json
├── lang/                 (VOS traductions)
│   ├── en.json
│   └── fr.json
└── assets/               (VOS images, etc.)
```

**Pas de code du site** dans votre repo ! Tout vient du package NPM.

---

## 🛠️ Commandes

### `retro-portfolio init [directory]`

Crée un nouveau portfolio avec les templates de données.

```bash
# Créer dans le dossier actuel
retro-portfolio init

# Créer dans un nouveau dossier
retro-portfolio init mon-portfolio

# Forcer l'écrasement
retro-portfolio init --force
```

### `retro-portfolio build`

Génère le site statique en fusionnant le moteur avec vos données.

```bash
# Build standard
npm run build

# Spécifier le dossier de sortie
retro-portfolio build --output public

# Watch mode (rebuild automatique)
retro-portfolio build --watch
```

**Ce qui se passe** :
1. Le package copie ses fichiers engine (HTML, CSS, JS)
2. Il fusionne avec vos fichiers `config/`, `data/`, `lang/`
3. Génère un site complet dans `dist/`

### `retro-portfolio dev`

Lance un serveur de développement local.

```bash
npm run dev

# Port personnalisé
retro-portfolio dev --port 3000

# Ouvrir automatiquement le navigateur
retro-portfolio dev --open
```

### `retro-portfolio admin`

Lance l'interface d'administration pour gérer votre contenu.

```bash
npm run admin

# Port personnalisé
retro-portfolio admin --port 5001

# Ouvrir automatiquement le navigateur
retro-portfolio admin --open
```

**Interface admin** : Ajoutez/modifiez votre contenu visuellement, uploadez des images, gérez les traductions.

---

## 🔄 Workflow Complet

### 1️⃣ Setup initial

```bash
npx @mtldev514/retro-portfolio-maker init mon-portfolio
cd mon-portfolio
npm install
```

### 2️⃣ Configuration

Éditez vos fichiers de config :

```bash
# Configurez votre site
nano config/app.json

# Ajoutez vos catégories
nano config/categories.json
```

### 3️⃣ Ajout de contenu

**Option A** : Via l'admin (recommandé)

```bash
npm run admin
# Ouvrir http://localhost:8000/admin.html
# Upload images, ajouter descriptions, etc.
```

**Option B** : Édition manuelle JSON

```bash
nano data/painting.json
```

### 4️⃣ Preview local

```bash
npm run dev
# Ouvrir http://localhost:8000
```

### 5️⃣ Build pour production

```bash
npm run build
# → génère dist/
```

### 6️⃣ Déploiement

**GitHub Pages** :

```bash
# Pusher le dossier dist/ sur la branche gh-pages
git add dist -f
git commit -m "Deploy"
git subtree push --prefix dist origin gh-pages
```

Ou utilisez la GitHub Action fournie (voir section Déploiement).

---

## 🎨 Personnalisation

### Définir vos propres catégories

**Vous pouvez créer n'importe quelles catégories que vous voulez (jusqu'à 7 max) !**

1. **Éditez `config/categories.json`** :

```json
{
  "contentTypes": [
    {
      "id": "pottery",
      "name": "Pottery",
      "icon": "🏺",
      "mediaType": "image",
      "dataFile": "data/pottery.json",
      "description": "My ceramic works"
    },
    {
      "id": "videos",
      "name": "Videos",
      "icon": "🎬",
      "mediaType": "video",
      "dataFile": "data/videos.json",
      "description": "Video projects"
    }
  ]
}
```

2. **Créez le fichier de données correspondant** (ex: `data/pottery.json`) :

```json
[
  {
    "id": "vase-001",
    "title": { "en": "Blue Vase", "fr": "Vase bleu" },
    "url": "https://your-image-url.com/vase.jpg",
    "date": "2026-01-15"
  }
]
```

3. **Ajoutez les traductions dans `lang/en.json` et `lang/fr.json`** :

```json
{
  "nav_pottery": "Pottery",
  "nav_videos": "Videos"
}
```

4. **Rebuild** : `npm run build`

Les filtres seront automatiquement générés à partir de votre configuration ! 🎉

### Ajouter un thème custom

Créez `assets/custom-theme.css` :

```css
:root {
  --primary-color: #your-color;
  --font-family: 'Your-Font', monospace;
}
```

Le build l'inclura automatiquement !

### Ajouter des pages custom

Créez `pages/about.html` dans votre projet. Le moteur le détectera au build.

---

## 🔄 Mettre à jour le moteur

Pour récupérer les dernières features du moteur :

```bash
npm update @mtldev514/retro-portfolio-maker

# Ou version spécifique
npm install @mtldev514/retro-portfolio-maker@latest
```

**Aucun conflit de merge** ! Vos données restent intactes.

---

## 🌐 Déploiement

### GitHub Pages (automatique)

Créez `.github/workflows/deploy.yml` :

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm run build

      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Push sur `main` → Site déployé automatiquement ! ✨

### Netlify / Vercel

**Build command** : `npm run build`
**Publish directory** : `dist`

---

## 📚 Documentation Avancée

### Structure du package

```
@mtldev514/retro-portfolio-maker/
├── engine/               (Code du site - copié au build)
│   ├── index.html
│   ├── style.css
│   ├── js/
│   └── admin/
├── scripts/              (Scripts Node.js)
│   ├── build.js
│   ├── serve.js
│   └── admin.js
├── bin/
│   └── cli.js            (CLI retro-portfolio)
└── templates/            (Templates pour init)
```

### API de données

Format des fichiers JSON :

**data/painting.json** :
```json
{
  "items": [
    {
      "id": "unique-id",
      "title": {
        "en": "Sunset",
        "fr": "Coucher de soleil"
      },
      "description": {
        "en": "A beautiful sunset",
        "fr": "Un magnifique coucher de soleil"
      },
      "image": "https://cloudinary.com/...",
      "date": "2026-01-15"
    }
  ]
}
```

**lang/en.json** :
```json
{
  "header_title": "My Portfolio",
  "nav_painting": "Paintings",
  "footer_copy": "© 2026 Your Name"
}
```

---

## 🐛 Dépannage

### Le build échoue

```bash
# Vérifier que les dossiers requis existent
ls -la config/ data/ lang/

# Réinstaller le package
rm -rf node_modules
npm install
```

### L'admin ne démarre pas

L'admin nécessite Python 3 et Flask :

```bash
pip install flask flask-cors
```

### Les images ne s'affichent pas

Vérifiez que vos URLs d'images sont complètes (Cloudinary, etc.) ou placez-les dans `assets/`.

---

## 🤝 Contribution

Ce package est open source ! Pour contribuer :

1. Fork le repo [retro-portfolio-maker](https://github.com/YOUR_USERNAME/retro-portfolio-maker)
2. Créez une branche feature
3. Soumettez une Pull Request

---

## 📄 Licence

MIT © Alex

---

## 🔗 Liens

- [Documentation](https://github.com/YOUR_USERNAME/retro-portfolio-maker)
- [NPM Package](https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker)
- [Issues](https://github.com/YOUR_USERNAME/retro-portfolio-maker/issues)
- [Exemples](https://github.com/YOUR_USERNAME/retro-portfolio-examples)

---

**Fait avec 💜 pour la communauté créative**
