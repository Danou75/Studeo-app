# Erreur 500 Vercel - MIDDLEWARE_INVOCATION_FAILED

## Problème

L'application affiche une erreur 500 avec le code `MIDDLEWARE_INVOCATION_FAILED` sur Vercel.

## Cause

Vercel essaie d'exécuter un middleware d'authentification (probablement détecté automatiquement) mais il n'est pas correctement configuré ou les variables d'environnement sont manquantes.

## Solutions

### Solution 1 : Vérifier les variables d'environnement Vercel

1. Aller sur https://vercel.com/dashboard
2. Sélectionner le projet "studeo-app"
3. Aller dans Settings > Environment Variables
4. Vérifier que les variables suivantes sont configurées :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Solution 2 : Redéployer l'application

Parfois, un simple redéploiement résout le problème :

```bash
git commit --allow-empty -m "Trigger Vercel redeploy"
git push origin main
```

### Solution 3 : Vérifier les logs Vercel

1. Aller sur https://vercel.com/dashboard
2. Sélectionner le projet
3. Aller dans l'onglet "Deployments"
4. Cliquer sur le dernier déploiement
5. Vérifier les logs pour voir l'erreur exacte

### Solution 4 : Désactiver temporairement le service worker

Si le problème vient du service worker, vous pouvez le désactiver temporairement en commentant son enregistrement dans `src/main.tsx`.

## Notes

- L'application fonctionne correctement en local
- Le problème est spécifique à Vercel
- C'est probablement lié à l'authentification ou au middleware
