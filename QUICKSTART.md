# 🚀 Quick Start Guide - @mtldev514/retro-portfolio-maker

## ✅ Package prêt à publier !

Votre package NPM `@mtldev514/retro-portfolio-maker` est maintenant **complet et fonctionnel** ! 🎉

---

## 📦 Ce qui a été créé

```
retro-portfolio-npm-engine/
├── package.json                    ✅ Config NPM
├── index.js                        ✅ Entry point
├── bin/cli.js                      ✅ CLI retro-portfolio
├── scripts/
│   ├── init.js                     ✅ Créer nouveau portfolio
│   ├── build.js                    ✅ Build engine + data
│   ├── serve.js                    ✅ Serveur dev
│   └── admin.js                    ✅ Lancer admin
├── engine/                         ✅ TOUS vos fichiers du site
│   ├── index.html
│   ├── style.css
│   ├── fonts.css
│   ├── js/ (11 fichiers)
│   └── admin/
│       ├── admin.html
│       ├── admin.css
│       ├── admin_api.py (adapté)
│       └── scripts/
├── templates/
│   └── user-portfolio/             ✅ Template pour nouveaux users
│       ├── config/
│       ├── data/
│       ├── lang/
│       └── .github/workflows/
├── .github/workflows/
│   └── publish-npm.yml             ✅ Auto-publish NPM
├── README.md                       ✅ Doc utilisateur
├── PUBLISHING.md                   ✅ Guide publication
└── .npmignore                      ✅ Fichiers exclus
```

---

## 🎯 Test Local (avant publication)

### 1. Créer le package

```bash
cd retro-portfolio-npm-engine
npm pack
```

Cela crée : `retro-portfolio-maker-1.0.0.tgz`

### 2. Tester dans un nouveau dossier

```bash
cd /tmp
mkdir test-portfolio
cd test-portfolio

# Installer le package local
npm init -y
npm install /path/to/retro-portfolio-npm-engine/retro-portfolio-maker-1.0.0.tgz

# Tester les commandes
npx retro-portfolio --help
npx retro-portfolio init
npm install
npm run build
npm run dev
```

### 3. Vérifier que tout fonctionne

- [ ] Le site se build correctement
- [ ] Le serveur démarre (port 8000)
- [ ] Les données sont bien fusionnées
- [ ] L'admin se lance (port 8000)

---

## 📤 Publication sur NPM

### Prérequis

1. **Compte NPM** : https://www.npmjs.com/signup
2. **Login local** :
   ```bash
   npm login
   ```

3. **Organisation NPM** (optionnel) :
   - Créer organisation `retro-portfolio` sur npmjs.com
   - OU changer le nom dans `package.json` : `@your-username/retro-portfolio-maker`

### Publication manuelle

```bash
cd retro-portfolio-npm-engine

# Première publication
npm publish --access public

# Mises à jour futures
npm version patch     # 1.0.0 → 1.0.1
npm publish

npm version minor     # 1.0.1 → 1.1.0
npm publish

npm version major     # 1.1.0 → 2.0.0
npm publish
```

### Publication automatique (GitHub Actions)

1. **Créer NPM Token** :
   - Aller sur npmjs.com → Account → Access Tokens
   - Create token (Type: Automation)
   - Copier le token

2. **Ajouter dans GitHub** :
   - Repo → Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `NPM_TOKEN`
   - Value: [votre token]

3. **Publier via GitHub** :

   **Option A** : Via Release
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   # Créer une Release sur GitHub → Auto-publish
   ```

   **Option B** : Workflow manuel
   - Aller dans Actions
   - Sélectionner "Publish to NPM"
   - Run workflow
   - Choisir version bump (patch/minor/major)

---

## 🎉 Après publication

### Votre package est public !

URL : `https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker`

### Les utilisateurs peuvent maintenant :

```bash
# Créer un nouveau portfolio
npx @mtldev514/retro-portfolio-maker init mon-portfolio
cd mon-portfolio

# Installer et utiliser
npm install
npm run build
npm run dev
npm run admin
```

---

## 🔄 Workflow Utilisateur Final

### Installation

```bash
npx @mtldev514/retro-portfolio-maker init mon-site
cd mon-site
npm install
```

### Structure créée automatiquement

```
mon-site/
├── package.json              (dépend de @mtldev514/retro-portfolio-maker)
├── config/                   (leurs configs)
├── data/                     (leurs données)
├── lang/                     (leurs traductions)
└── .github/workflows/        (auto-deploy GitHub Pages)
```

### Environment Configuration

**IMPORTANT:** Before using the admin interface, configure your Cloudinary credentials.

1. Open `.env` in your project directory
2. Visit [Cloudinary Console](https://cloudinary.com/console) (free account available)
3. Copy your credentials from the dashboard
4. Replace placeholder values:
   ```
   CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
   CLOUDINARY_API_KEY=your_actual_api_key
   CLOUDINARY_API_SECRET=your_actual_api_secret
   ```

**Optional:** Add `GITHUB_TOKEN` for hosting large audio/video files on GitHub

⚠️ Without these credentials, image uploads in the admin interface will fail.

### Commandes disponibles

```bash
npm run build    # → dist/
npm run dev      # → http://localhost:8000
npm run admin    # → http://localhost:8000/admin.html
```

### Déploiement

```bash
git init
git add .
git commit -m "Initial portfolio"
git remote add origin https://github.com/username/mon-site.git
git push -u origin main

# GitHub Action se déclenche automatiquement
# Site déployé sur : username.github.io/mon-site
```

### Mise à jour du engine

```bash
npm update @mtldev514/retro-portfolio-maker
npm run build
```

✨ **Récupère automatiquement vos nouvelles features sans conflit !**

---

## 📊 Checklist avant publication

- [x] Tous les fichiers engine/ copiés
- [x] admin_api.py adapté pour env variables
- [x] Templates utilisateur créés
- [x] GitHub Action configurée
- [x] README.md complet
- [x] PUBLISHING.md documenté
- [ ] Testé avec `npm pack` ← **À FAIRE**
- [ ] Testé installation locale ← **À FAIRE**
- [ ] NPM token configuré dans GitHub ← **À FAIRE**
- [ ] Publié sur NPM ← **À FAIRE**

---

## 🐛 Troubleshooting

### Le build échoue

```bash
# Vérifier la structure
ls -la engine/
ls -la scripts/
ls -la bin/

# Test le package
npm pack --dry-run
```

### L'admin ne démarre pas

Installer les dépendances Python :
```bash
pip install flask flask-cors
```

### Erreur de permission npm

```bash
npm login
npm whoami  # Vérifier qu'on est bien logged in
```

---

## 🎯 Prochaines étapes

1. **Tester localement** avec `npm pack`
2. **Publier v1.0.0** sur NPM
3. **Créer un portfolio de demo** pour montrer aux utilisateurs
4. **Partager** le package avec la communauté !

---

## 📞 Support

- GitHub : https://github.com/YOUR_USERNAME/retro-portfolio-maker
- NPM : https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker
- Issues : https://github.com/YOUR_USERNAME/retro-portfolio-maker/issues

---

**Prêt à changer le monde des portfolios rétro ! 🚀✨**
