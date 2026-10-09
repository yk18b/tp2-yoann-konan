# DIAGNOSTIC — salles-api

Binôme : Yoann Konan, <nom2>

Chaque problème : symptôme, cause (fichier), brique du cours, preuve, réparation.
Les preuves sont dans `captures/`.

---

## Exercice 1 — La chaîne au travail, avant réparation

Tâche donnée telle quelle : « Ajoute un endpoint GET /rooms/:id/availability?date=YYYY-MM-DD qui renvoie les créneaux libres d'une salle sur la journée demandée, avec ses tests. » Aucune aide ; à sa question sur les bornes de la journée, réponse neutre : « Décide toi-même à partir de ce qui existe déjà dans le dépôt, et indique ton choix. »

- **Qui a travaillé** : uniquement l'agent principal. Les subagents `planner`, `dev`, `reviewer` n'ont jamais tourné (« Model not found »).
- **Ce qui a échoué sans le dire** : aucune relecture ; les fichiers `*.test.ts` ignorés par Vitest, que l'agent a contournés en nommant son fichier `*.spec.ts` sans le signaler comme bloquant ; `AGENTS.md` cite des scripts inexistants.
- **Résultat** : endpoint et 15 tests écrits par l'agent principal seul, `test:unit` vert (20 réussis, 4 ignorés), lint et typecheck verts, rien de commité.
- Preuves : `captures/ex1-question-bornes.png`, `captures/preuveEx1.png`. Le résultat est conservé sur la branche `ex1-avant`.

---

## Exercice 2 — Problèmes trouvés

### 1. Modèles inexistants : aucun agent ne peut tourner
- **Symptôme** : délégation en échec « Model not found » ; `opencode models` ne propose que `deepseek-v4.1-flash` et `deepseek-v4-flash-vision-exp`.
- **Cause** : `opencode.json` et les 7 fichiers `.opencode/agent/*.md` épinglent `opencode/deepseek-v4-pro` ou `opencode/deepseek-v4-flash`.
- **Brique** : subagents.
- **Preuve** : `ex2-01-models.png`, `ex2-02-models-agents.png`.
- **Réparation** : tous les agents sur `opencode/deepseek-v4.1-flash` (`rep-01-models.png`).

### 2. `finder` ne rend aucune réponse
- **Symptôme** : appelé deux fois par l'architect, `finder` lance un `grep` puis s'arrête sans réponse ; l'architect fait le travail lui-même.
- **Cause** : `.opencode/agent/finder.md`, la règle `"*": deny` est placée après les `allow` et les écrase.
- **Brique** : droits / subagents.
- **Preuve** : `ex2-08-finder-droits.png`, `demo-finder.png`.
- **Réparation** : `"*": deny` placé en premier (`rep-02-agents.png`, `rep-02-finder-ok.png`).

### 3. L'architect ne délègue pas et peut tout écrire
- **Symptôme** : à l'exercice 1 et lors de la démonstration, l'architect fait le travail lui-même (« je l'ai traitée moi-même »).
- **Cause** : `.opencode/agent/architect.md`. Sa description dit « Never writes code », mais il a `edit: allow` et `bash: "*": allow`. Son prompt contient une règle inversée : « If a question can be answered by a subagent, it can also be answered by you », et l'invite à « use whichever is faster ».
- **Brique** : droits / subagents / rules.
- **Preuve** : `ex2-04-architect-droits.png`, `ex2-05-architect-prompt.png`, `demo-finder.png`.
- **Réparation** : `edit: deny`, bash limité à `git status/diff/log` et `npm run *`, règle corrigée en « it should be answered by a subagent ».

### 4. Le reviewer corrige au lieu de réfuter
- **Symptôme** : description « Reviews a diff and fixes what it finds » avec `edit: allow`, alors que son prompt dit que son travail est de réfuter, et que `dev` est annoncé comme « le seul agent autorisé à modifier le code ».
- **Cause** : `.opencode/agent/reviewer.md`.
- **Brique** : droits.
- **Preuve** : `ex2-06-reviewer-droits.png`.
- **Réparation** : `edit: deny`, description alignée sur le rôle.

### 5. L'explorer peut écrire partout et faire des `curl`
- **Symptôme** : rôle de lecture, mais `edit: allow` sans restriction et `bash "curl*": allow`.
- **Cause** : `.opencode/agent/explorer.md`. Son prompt justifie d'écrire ses notes dans `.opencode/plans/`, mais rien ne le limite à ce dossier.
- **Brique** : droits.
- **Preuve** : `ex2-07-explorer-droits.png`.
- **Réparation** : écriture limitée à `.opencode/plans/*-notes.md`, `curl` retiré.

### 6. MCP cassés ou inutiles
- **Symptôme** : `opencode mcp list` → `salles-db` en échec, `slack` en échec, `sentry` non authentifié ; `notion`, `slack`, `sentry`, `playwright` sans rapport avec une API de réservation, tous actifs et chargés dans le contexte de chaque requête.
- **Cause** : `opencode.json`. `salles-db` utilise `${SALLES_MCP_TOKEN}`, syntaxe non reconnue par OpenCode (attendu : `{env:SALLES_MCP_TOKEN}`).
- **Brique** : MCP.
- **Preuve** : `ex2-mcp-list.png`.
- **Réparation** : syntaxe du token corrigée ; tous les serveurs passés en `enabled: false` (`rep-03-mcp-rules-ci.png`).

### 7. La command `ship` pousse sans vérifier
- **Symptôme** : `git add -A`, commit et `git push` sans question ; « Ne relance pas les checks » et « Ne demande pas de relecture ».
- **Cause** : `.opencode/command/ship.md`. Elle s'appuie sur un hook volontairement non bloquant et sur un reviewer qui ne tournait pas : du code rouge ou non relu pouvait être poussé.
- **Brique** : skills et commands / Git.
- **Preuve** : `ex2-11-ship.png`.
- **Réparation** : `ship` lance typecheck, lint et tests, fait relire par `reviewer`, n'utilise jamais `git add -A` et laisse le commit et la PR à un humain.

### 8. Les rules mentent sur les scripts
- **Symptôme** : `AGENTS.md` impose `npm test` « à lancer avant tout commit », qui répond `Missing script: "test"` ; `npm run build` n'existe pas ; `test:unit` et `typecheck` ne sont pas mentionnés.
- **Cause** : `AGENTS.md`, tableau des commandes.
- **Brique** : rules.
- **Preuve** : `ex2-13-rules-scripts.png`.
- **Réparation** : tableau aligné sur `package.json`.

### 9. Rules locales obsolètes
- **Symptôme** : `src/lib/AGENTS.md` impose un `export default` « pour les scripts de facturation » et interdit la JSDoc ; aucun module n'a d'export default, `overlap.ts` a de la JSDoc, et aucun script de facturation n'existe dans le dépôt (`price.ts` en a été repris, FACT-88).
- **Cause** : `src/lib/AGENTS.md`.
- **Brique** : rules.
- **Preuve** : `ex2-14-rules-lib.png`, `ex2-14b-facturation.png`.
- **Réparation** : règles réécrites pour décrire le code réel.

### 10. Deux fichiers de tests jamais exécutés
- **Symptôme** : `npm run test:unit` exécute 3 fichiers sur 5 ; `bookings.test.ts` et `price.test.ts` sont ignorés.
- **Cause** : la convention `*.spec.ts` (`vitest.config.ts`, INFRA-205) est volontaire, mais ces deux fichiers n'ont jamais été renommés.
- **Brique** : tests.
- **Preuve** : `ex2-15-vitest-include.png`, `ex2-16-tests-caches.png`.
- **Réparation** : fichiers renommés en `*.spec.ts`.

### 11. Un test désactivé et deux faux tests
- **Symptôme** : `it.skip("accepte deux creneaux bout a bout")` cachait le bug de `overlaps()` ; deux tests ne contiennent que `expect(true).toBe(true)`.
- **Cause** : `test/overlap.spec.ts`.
- **Brique** : tests.
- **Preuve** : `ex2-18-skips.png`, `ex2-18b-skips-overlap.png`.
- **Réparation** : test réactivé, deux vrais tests (créneau inclus, créneaux identiques).

### 12. Bug trouvé par le filet : réservations bout à bout refusées
- **Symptôme** : une réservation qui commence quand la précédente finit reçoit un 409 au lieu d'un 201.
- **Cause** : `src/lib/overlap.ts`, `a1 <= b2 && b1 <= a2`, alors que sa propre documentation définit les créneaux comme [début, fin[.
- **Brique** : tests (bug révélé une fois le filet réparé).
- **Preuve** : `ex2-16-tests-caches.png`, `rep-04-filet-rouge.png`.
- **Réparation** : `a1 < b2 && b1 < a2`.

### 13. Bug trouvé par le filet : majoration du week-end en texte
- **Symptôme** : `priceFor` renvoie `"5020"` (une chaîne) au lieu de `70`.
- **Cause** : `src/lib/price.ts`, `const WEEKEND_SURCHARGE = "20"` puis `base + WEEKEND_SURCHARGE` ; le `// @ts-nocheck` du fichier empêchait TypeScript de le voir.
- **Brique** : lint et types / tests.
- **Preuve** : `ex2-16-tests-caches.png`, `ex2-17-types-lint.png`, `rep-05-typecheck-prix.png` (une fois `@ts-nocheck` retiré, `tsc` signale l'erreur).
- **Réparation** : `@ts-nocheck` supprimé, majoration numérique.

### 14. Le lint ne vérifie rien
- **Symptôme** : `npm run lint` toujours vert.
- **Cause** : `eslint.config`, parser branché mais `rules: {}` (INFRA-212).
- **Brique** : lint et types.
- **Preuve** : `ex2-17-types-lint.png`.
- **Réparation** : règles recommandées de typescript-eslint + `ban-ts-comment`. Le lint armé a immédiatement relevé un paramètre `_id` inutilisé dans `test/store.spec.ts` : le préfixe `_` signale un oubli volontaire, la règle a été configurée pour respecter cette convention.

### 15. La CI ne teste rien
- **Symptôme** : la CI ne lance que le lint (qui ne vérifiait rien) ; `# - run: npm run test:unit # TODO remettre, ca bloquait les merges`.
- **Cause** : `.github/workflows/ci.yml`. Les tests ont été retirés parce qu'ils échouaient.
- **Brique** : CI et Git.
- **Preuve** : `ex2-10-ci.png`.
- **Réparation** : la CI lance lint, typecheck et tests.

### 16. Le hook Git n'est jamais exécuté
- **Symptôme** : `.husky/pre-commit` existe, mais `.git/hooks` ne contient que des `.sample` et `core.hooksPath` est vide.
- **Cause** : `package.json`, pas de script `prepare`, husky jamais installé.
- **Brique** : hooks.
- **Preuve** : `ex2-09-husky.png`.
- **Réparation** : husky installé, script `prepare`, pre-commit qui lance typecheck, lint et tests (`rep-07-husky-actif.png`).

---

## Choix délibérés, non signalés comme défauts

- **Le hook OpenCode `checks.sh` renvoie toujours 0** : documenté (INFRA-231), il avertit l'agent sans l'interrompre. Il fonctionne comme annoncé.
- **La convention `*.spec.ts`** de `vitest.config.ts` (INFRA-205) : c'est le nommage des deux fichiers qui était en faute, pas la config.
- **Le test de l'export de l'ancien système reste désactivé** : il dépend d'une fixture jamais versée (INFRA-198) ; le réactiver le ferait échouer au chargement, pas sur une assertion.
- **`planner` en `mode: primary`** : on le soupçonnait injoignable, mais la démonstration a montré que l'architect le lance bien (`demo-planner.png`). Hypothèse réfutée, rien à corriger.

## Ce qu'on a choisi de ne pas corriger

- **`tsconfig.json` non strict** (`strict: false`) : activer le mode strict est un chantier sur tout le code. Le bug du prix a été attrapé en supprimant `@ts-nocheck`, ce qui suffit ici ; le passage en strict est à planifier.
- **MCP `salles-db` et `github`** : désactivés plutôt que réparés, faute d'accès au réseau interne et de token GitHub. À réactiver avec `SALLES_MCP_TOKEN` (syntaxe déjà corrigée) et un token GitHub.
- **L'architect ne peut plus commiter** : volontaire. La livraison reste une décision humaine, `ship` propose les commandes.

---

## Après réparation — même tâche, session neuve

Protocole : session OpenCode neuve ; `DIAGNOSTIC.md` et les notes de l'agent sortis du dossier pendant la relance pour qu'il ne puisse pas s'en servir ; même tâche mot pour mot ; même réponse neutre aux questions.

| | Avant | Après |
|---|---|---|
| Qui travaille | l'agent principal seul | <ex. architect → planner → dev → reviewer> |
| Relecture | aucune | <conclusion du reviewer> |
| Hook post-écriture | jamais vu | <affiché ou non> |
| Tests exécutés | 3 fichiers sur 5, 4 ignorés | <résultat de npm run test:unit> |
| Endpoint | <réponse du curl avant> | <réponse du curl après> |

Captures : `ex1-*.png` (avant), `apres-01-delegations.png`, `apres-02-hook.png`, `apres-03-reviewer.png`, `apres-04-filet.png`, `apres-05-curl.png` (après).