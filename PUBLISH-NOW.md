# 🚀 Publication Immédiate - Guide

Votre package est prêt mais nécessite l'authentification 2FA.

## ⚠️ Erreur rencontrée

```
Two-factor authentication or granular access token with bypass 2fa enabled
is required to publish packages.
```

## 🔐 Solution : 2 Options

### Option 1 : Publier avec code 2FA (Recommandé)

```bash
cd /sessions/awesome-amazing-brahmagupta/mnt/retro-portfolio/retro-portfolio-npm-engine

# Publier avec le code OTP
npm publish --otp=XXXXXX
# Remplacez XXXXXX par votre code 2FA actuel (6 chiffres)
```

**Où trouver le code 2FA** :
- Application Authenticator (Google Authenticator, Authy, etc.)
- SMS si configuré
- Email de backup

### Option 2 : Créer un Access Token avec bypass 2FA

1. **Aller sur npmjs.com** → Account → Access Tokens
2. **Generate New Token**
   - Type : **Automation**
   - ✅ Cocher "Bypass 2FA"
3. **Copier le token**
4. **Login avec le token** :
   ```bash
   npm logout
   npm login --auth-type=legacy
   # Username: mtldev514
   # Password: [collez votre token ici]
   # Email: votre@email.com
   ```
5. **Publier** :
   ```bash
   npm publish
   ```

---

## 📋 Commandes Complètes

### Avec code 2FA (plus rapide)

```bash
cd /sessions/awesome-amazing-brahmagupta/mnt/retro-portfolio/retro-portfolio-npm-engine

# Obtenir votre code 2FA de votre app Authenticator
# Puis publier :
npm publish --otp=123456  # Remplacez par votre code actuel
```

### Avec Access Token (si vous voulez automatiser)

```bash
# 1. Créer le token sur npmjs.com (voir Option 2 ci-dessus)

# 2. Se déconnecter
npm logout

# 3. Login avec le token
npm login --auth-type=legacy
# Username: mtldev514
# Password: npm_xxxxxxxxxxxxxxxxxxxx (votre token)
# Email: votre@email.com

# 4. Publier
npm publish
```

---

## ✅ Vérification après publication

```bash
# Vérifier que le package est publié
npm view @mtldev514/retro-portfolio-engine

# Ou visitez :
# https://www.npmjs.com/package/@mtldev514/retro-portfolio-engine
```

---

## 🎉 Après publication réussie

Vous pourrez :

```bash
# Créer un nouveau portfolio
npx @mtldev514/retro-portfolio-engine init mon-portfolio
cd mon-portfolio
npm install
npm run build
npm run dev
```

---

## 🔄 Pour les futures publications

À chaque mise à jour :

```bash
cd retro-portfolio-npm-engine

# Modifier vos fichiers dans engine/
# Puis :

npm version patch  # 1.0.0 → 1.0.1
npm publish --otp=XXXXXX  # avec votre code 2FA actuel
```

---

**Essayez maintenant avec votre code 2FA actuel ! 🚀**

```bash
npm publish --otp=XXXXXX
```
