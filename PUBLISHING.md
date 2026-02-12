# 📦 Guide de Publication sur NPM

Ce guide explique comment publier `@mtldev514/retro-portfolio-maker` sur NPM.

---

## 🚀 Prérequis

### 1. Compte NPM

Créez un compte sur [npmjs.com](https://www.npmjs.com/signup)

### 2. Login NPM local

```bash
npm login
# Entrez votre username, password, email
```

### 3. Organisation NPM (pour @retro-portfolio)

Deux options :

**Option A** : Créer une organisation `retro-portfolio`
- Aller sur npmjs.com → Organizations → Create
- Nom: `retro-portfolio`

**Option B** : Utiliser votre username personnel
```json
// Dans package.json, changer:
"name": "@your-username/retro-portfolio-maker"
```

---

## 📋 Préparation

### 1. Compléter le engine/

Avant de publier, copiez tous les fichiers du site dans `engine/` :

```bash
cd retro-portfolio-npm-engine

# Créer les dossiers
mkdir -p engine/js engine/admin

# Copier les fichiers du site original
cp ../retro-portfolio/index.html engine/
cp ../retro-portfolio/style.css engine/
cp ../retro-portfolio/fonts.css engine/

# Copier tous les JS
cp ../retro-portfolio/js/*.js engine/js/

# Copier l'admin
cp ../retro-portfolio/admin.html engine/admin/
cp ../retro-portfolio/admin.css engine/admin/
cp ../retro-portfolio/admin_api.py engine/admin/

# Copier les scripts Python
cp -r ../retro-portfolio/scripts engine/
```

### 2. Vérifier package.json

```json
{
  "name": "@mtldev514/retro-portfolio-maker",
  "version": "1.0.0",
  "description": "Retro portfolio site engine - Package as a Service",
  "main": "index.js",
  "files": [
    "engine/",
    "scripts/",
    "bin/",
    "templates/",
    "index.js"
  ],
  ...
}
```

Le champ `files` détermine ce qui est publié.

### 3. Créer index.js (point d'entrée)

```bash
cat > index.js << 'EOF'
/**
 * @mtldev514/retro-portfolio-maker
 * Main entry point
 */

const path = require('path');

module.exports = {
  enginePath: path.join(__dirname, 'engine'),
  version: require('./package.json').version,

  // Utility functions
  getEnginePath() {
    return this.enginePath;
  },

  getVersion() {
    return this.version;
  }
};
EOF
```

### 4. Tester localement

```bash
# Test avec npm pack
npm pack

# Cela crée retro-portfolio-maker-1.0.0.tgz
# Vérifier le contenu
tar -tzf retro-portfolio-maker-1.0.0.tgz

# Tester l'installation locale
cd /tmp
mkdir test-install
cd test-install
npm init -y
npm install /path/to/retro-portfolio-npm-engine/retro-portfolio-maker-1.0.0.tgz

# Tester la commande
npx retro-portfolio init test-portfolio
```

---

## 🎯 Publication

### 1. Version initiale (1.0.0)

```bash
cd retro-portfolio-npm-engine

# Vérifier que tout est prêt
npm run test  # Si vous avez des tests

# Publier
npm publish --access public
```

Si succès, vous verrez :
```
+ @mtldev514/retro-portfolio-maker@1.0.0
```

### 2. Vérifier sur NPM

Visitez : `https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker`

### 3. Tester l'installation

```bash
# Dans un nouveau dossier
npx @mtldev514/retro-portfolio-maker init mon-test
cd mon-test
npm install
npm run build
```

---

## 🔄 Mises à jour

### Workflow de version

```bash
# Correction de bug (1.0.0 → 1.0.1)
npm version patch

# Nouvelle feature (1.0.1 → 1.1.0)
npm version minor

# Breaking change (1.1.0 → 2.0.0)
npm version major

# Puis publier
npm publish
```

### Exemple complet

```bash
# 1. Faire vos modifications dans engine/
nano engine/js/render.js

# 2. Tester localement
npm pack
# Tester le .tgz

# 3. Bump version
npm version minor
# Cela crée aussi un git tag

# 4. Commit
git add .
git commit -m "Add new render feature"
git push
git push --tags

# 5. Publier
npm publish

# 6. Vérifier
npm info @mtldev514/retro-portfolio-maker
```

---

## 📊 Versions recommandées

### Semantic Versioning

- **1.0.x** : Corrections de bugs
- **1.x.0** : Nouvelles features (backward compatible)
- **x.0.0** : Breaking changes

### Exemples

```
1.0.0  - Release initiale
1.0.1  - Fix CSS bug
1.1.0  - Ajout nouveau theme
1.2.0  - Support multi-langue amélioré
2.0.0  - Nouvelle structure de données (breaking)
```

---

## 🏷️ Tags NPM

### Latest (par défaut)

```bash
npm publish
# Tag automatique: latest
```

### Beta versions

```bash
npm version 1.1.0-beta.1
npm publish --tag beta

# Les users installent avec:
npm install @mtldev514/retro-portfolio-maker@beta
```

### Next (features en dev)

```bash
npm version 1.2.0-next.1
npm publish --tag next
```

---

## 🔒 Sécurité

### .npmignore

Créez `.npmignore` pour exclure des fichiers :

```
# Tests
test/
*.test.js

# Docs de dev
PUBLISHING.md
TODO.md

# Configs locales
.env
.env.local

# IDE
.vscode/
.idea/
```

### Secrets

**NE JAMAIS PUBLIER** :
- Clés API
- Tokens
- Credentials Cloudinary
- Fichiers .env

---

## 📈 Monitoring

### Statistiques NPM

Voir les downloads : `https://www.npmjs.com/package/@mtldev514/retro-portfolio-maker`

### Utiliser npm-stat

```bash
npx npm-stat @mtldev514/retro-portfolio-maker
```

---

## 🔧 Automatisation avec GitHub Actions

Créez `.github/workflows/publish.yml` :

```yaml
name: Publish to NPM

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - run: npm install
      - run: npm test

      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Setup** :
1. Créer NPM token sur npmjs.com
2. Ajouter dans GitHub Secrets : `NPM_TOKEN`
3. Créer une release sur GitHub → Publish automatique !

---

## 🎯 Checklist avant publication

- [ ] Tous les fichiers engine/ sont présents
- [ ] package.json est correct
- [ ] README.md est complet
- [ ] Testé avec `npm pack`
- [ ] Testé installation locale
- [ ] Pas de secrets dans le code
- [ ] Version bumpée correctement
- [ ] Git commit + tag
- [ ] Logged in NPM (`npm whoami`)

---

## 🚨 Dépublication (Unpublish)

**ATTENTION** : Dépublier est mal vu par NPM !

```bash
# Dépublier une version spécifique (< 72h)
npm unpublish @mtldev514/retro-portfolio-maker@1.0.0

# Dépublier tout le package (< 72h, 0 downloads)
npm unpublish @mtldev514/retro-portfolio-maker --force
```

**Mieux** : Utiliser `npm deprecate`

```bash
npm deprecate @mtldev514/retro-portfolio-maker@1.0.0 "Use version 1.0.1 instead"
```

---

## 📞 Support

Questions sur la publication ?

- [NPM Docs](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [NPM Support](https://www.npmjs.com/support)

---

**Prêt à publier ? Let's go ! 🚀**
