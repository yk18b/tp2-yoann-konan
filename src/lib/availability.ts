import type { Result } from "./result.js";

/**
 * Creneau borne en ISO 8601 UTC, demi-ouvert [startsAt, endsAt[.
 */
export interface Slot {
  startsAt: string;
  endsAt: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fenetre UTC [debut, fin[ couvrant la journee `date` (YYYY-MM-DD).
 *
 * Rejette tout ce qui n'est pas une date calendaire UTC exacte, y compris les
 * debordements comme 2026-02-30. Ne jette jamais.
 */
export function dayWindow(date: unknown): Result<Slot> {
  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    return { ok: false, error: "date invalide" };
  }
  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date) {
    return { ok: false, error: "date invalide" };
  }
  const end = new Date(start.getTime() + 86_400_000);
  return {
    ok: true,
    value: { startsAt: start.toISOString(), endsAt: end.toISOString() }
  };
}

/**
 * Complement de `booked` dans `window`, en creneaux [debut, fin[ tries.
 *
 * Les chevauchements sont fusionnes et les creneaux adjacents ne produisent
 * aucun trou de taille nulle.
 */
export function freeSlotsIn(booked: Slot[], window: Slot): Slot[] {
  const wStart = Date.parse(window.startsAt);
  const wEnd = Date.parse(window.endsAt);

  const clipped = booked
    .map((b) => ({ start: Date.parse(b.startsAt), end: Date.parse(b.endsAt) }))
    .filter((b) => b.start < wEnd && b.end > wStart)
    .map((b) => ({ start: Math.max(b.start, wStart), end: Math.min(b.end, wEnd) }))
    .filter((b) => b.start < b.end)
    .sort((a, b) => a.start - b.start);

  const free: Slot[] = [];
  let cursor = wStart;
  for (const interval of clipped) {
    if (interval.start > cursor) {
      free.push({
        startsAt: new Date(cursor).toISOString(),
        endsAt: new Date(interval.start).toISOString()
      });
    }
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < wEnd) {
    free.push({
      startsAt: new Date(cursor).toISOString(),
      endsAt: new Date(wEnd).toISOString()
    });
  }
  return free;
}
