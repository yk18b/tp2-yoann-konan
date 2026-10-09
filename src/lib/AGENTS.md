# Conventions locales — src/lib/

Ces modules sont consommes par les routes.

- **Exports nommes** : chaque module expose ses fonctions par des exports nommes. Les
  anciens scripts de facturation qui exigeaient un `export default` ne sont plus dans le
  depot (price.ts en a ete repris, ticket FACT-88).
- La JSDoc est bienvenue quand elle precise un contrat (ex. bornes [debut, fin[ dans
  overlap.ts).
- Les fonctions de ce dossier sont pures. Aucun acces reseau, aucun acces disque.
