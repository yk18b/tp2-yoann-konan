---
description: Livre le travail en cours après vérification et relecture
agent: architect
---

Avant de livrer :

1. Lance `npm run typecheck`, `npm run lint` et `npm run test:unit`. Si un seul est rouge, arrête-toi et explique pourquoi.
2. Délègue la relecture du diff au subagent `reviewer`. S'il conclut « not proven », arrête-toi.
3. Montre `git status` et la liste des fichiers à livrer. N'utilise jamais `git add -A`.
4. La livraison (commit sur une branche dédiée, puis PR) est faite par un humain : propose les commandes, ne pousse jamais toi-même.
