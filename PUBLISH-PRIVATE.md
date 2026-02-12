# 🔒 Publication Privée sur NPM

Votre package est configuré pour être publié en **privé** sur NPM.

## 📋 Configuration actuelle

- **Nom** : `@mtldev514/retro-portfolio-engine`
- **Accès** : `restricted` (privé)
- **Version** : `1.0.0`

---

## 🚀 Publier en Privé

### 1. Login NPM

```bash
npm login
# Entrez votre username, password, email
```

### 2. Vérifier que vous êtes connecté

```bash
npm whoami
```

### 3. Publier le package en privé

```bash
cd retro-portfolio-npm-engine

# Publication privée
npm publish
```

⚠️ **Note** : Pour utiliser un scope comme `@retro-portfolio`, vous devez soit :
- Avoir une organisation NPM `retro-portfolio` (7$/mois pour packages privés)
- OU changer le nom pour utiliser votre username : `@votre-username/retro-portfolio-engine`

---

## 💰 Coûts

### Option 1 : Scope personnel (Recommandé - GRATUIT)

Changez le nom dans `package.json` :

```json
{
  "name": "@votre-username/retro-portfolio-engine"
}
```

Puis publiez :

```bash
npm publish --access restricted
```

✅ **Gratuit** pour votre scope personnel
✅ Seul vous pouvez l'installer (ou les gens que vous autorisez)

### Option 2 : Organisation @retro-portfolio (Payant)

Gardez `@mtldev514/retro-portfolio-engine` mais :
- Créez l'organisation sur npmjs.com
- Payez 7$/mois pour packages privés
- Publiez avec `npm publish`

---

## 🔓 Rendre Public Plus Tard

Quand vous êtes prêt à rendre le package public :

```bash
# Pour scope personnel
npm access public @votre-username/retro-portfolio-engine

# Pour organisation
npm access public @mtldev514/retro-portfolio-engine
```

Puis mettez à jour `package.json` :

```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

---

## 👥 Donner Accès à d'Autres Users

Pour un package privé, vous pouvez donner accès :

```bash
# Ajouter un collaborateur
npm owner add autre-username @mtldev514/retro-portfolio-engine

# Voir qui a accès
npm owner ls @mtldev514/retro-portfolio-engine
```

---

## 📦 Installation par les Utilisateurs Autorisés

Les utilisateurs que vous autorisez peuvent installer avec :

```bash
npm login  # Ils doivent être connectés
npx @mtldev514/retro-portfolio-engine init mon-portfolio
```

---

## 🔄 Workflow Complet

### Publication initiale (privée)

```bash
cd retro-portfolio-npm-engine
npm login
npm publish
```

### Mises à jour

```bash
# Faire vos modifications dans engine/
npm version patch   # 1.0.0 → 1.0.1
npm publish
```

### Rendre public (quand prêt)

```bash
npm access public @mtldev514/retro-portfolio-engine
# Modifier publishConfig dans package.json
npm version minor   # 1.0.1 → 1.1.0
npm publish
```

---

## ✅ Checklist avant Publication

- [ ] `npm login` effectué
- [ ] `npm whoami` confirme votre identité
- [ ] Décidé : scope personnel OU organisation
- [ ] Si organisation : créée sur npmjs.com
- [ ] `package.json` configuré avec le bon nom
- [ ] Testé avec `npm pack`
- [ ] Prêt à publier !

---

## 🎯 Commandes Rapides

```bash
# Tester le package
npm pack
tar -tzf retro-portfolio-engine-1.0.0.tgz | head -20

# Publier en privé
npm publish

# Vérifier sur NPM
npm view @mtldev514/retro-portfolio-engine

# Installer (vous ou users autorisés)
npm install @mtldev514/retro-portfolio-engine

# Donner accès à quelqu'un
npm owner add leur-username @mtldev514/retro-portfolio-engine
```

---

**Prêt à publier en privé ? C'est parti ! 🚀**
