# salles-api — conventions du depot

Service interne de reservation de salles. Express + TypeScript, stockage en memoire pour
l'instant (la vraie base arrive avec INFRA-140).

## Commandes

| Commande | Ce qu'elle fait |
|---|---|
| `npm install` | installe les dependances |
| `npm start` | demarre l'API sur le port 3000 |
| `npm run test:unit` | lance la suite de tests — **a lancer avant tout commit** |
| `npm run typecheck` | verifie les types (`tsc --noEmit`) |
| `npm run lint` | verifie le style et les erreurs courantes |

## Conventions

1. **Toute fonction exportee porte une JSDoc** d'une ligne minimum, qui dit ce qu'elle
   fait et pas comment.
2. **Les erreurs remontent en `Result`, jamais en `throw`.** Une fonction qui peut
   echouer renvoie `{ ok: true, value }` ou `{ ok: false, error }`. Cette convention est
   la regle du depot depuis la refonte de mars : on ne veut plus de `try/catch` disperses
   dans les routes.
3. Les dates circulent en **ISO 8601 UTC**, toujours en `string`, jamais en `Date`.
4. Un module par responsabilite dans `src/lib/`. Pas de fichier `utils.ts`.
5. Les imports relatifs portent l'extension `.js` (ESM).

## Ce qu'il ne faut pas faire

- Ne pas ajouter de dependance sans en parler.
- Ne pas commiter dans `main` directement.
- Ne pas toucher a `src/store.ts` : il disparait avec INFRA-140.
