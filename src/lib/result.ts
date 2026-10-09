/**
 * Resultat d'une operation : une valeur si `ok`, une erreur sinon.
 *
 * Convention du depot : les erreurs remontent en valeur, jamais en `throw`.
 */
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };
