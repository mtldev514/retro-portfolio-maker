# 🔧 Fix pour les scripts npm

## Problème

Les commandes `retro-portfolio` ne sont pas trouvées dans les scripts npm.

## Solution

Dans votre `package.json` de `alex_a_montreal`, remplacez les scripts par :

```json
{
  "scripts": {
    "build": "npx retro-portfolio build",
    "dev": "npx retro-portfolio dev",
    "admin": "npx retro-portfolio admin",
    "start": "npm run dev & npm run admin",
    "deploy": "npx retro-portfolio deploy"
  }
}
```

## Ou utilisez cette commande rapide

```bash
cd alex_a_montreal

# Ouvrir package.json et changer les scripts
# Remplacer "retro-portfolio" par "npx retro-portfolio"
```

## Test

```bash
npm run dev     # ✅ Devrait fonctionner
npm run admin   # ✅ Devrait fonctionner
npm start       # ✅ Lance les deux ensemble
```

---

**La prochaine version du package (1.0.2) aura ce fix automatiquement pour les nouveaux portfolios !**
