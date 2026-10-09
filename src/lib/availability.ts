import type { Booking } from "../store.js";

export interface Slot {
  startsAt: string;
  endsAt: string;
}

const DAY_MS = 24 * 3600000;

/**
 * Calcule les creneaux libres d'une journee UTC, bornes [debut, fin[, a partir
 * des reservations existantes (celles qui debordent sont rognees a la journee).
 */
export function freeSlots(bookings: Booking[], date: string): Slot[] {
  const dayStart = Date.parse(`${date}T00:00:00.000Z`);
  const dayEnd = dayStart + DAY_MS;

  const busy = bookings
    .map((b) => [
      Math.max(Date.parse(b.startsAt), dayStart),
      Math.min(Date.parse(b.endsAt), dayEnd)
    ])
    .filter(([start, end]) => start < end)
    .sort((a, b) => a[0] - b[0]);

  const slots: Slot[] = [];
  let cursor = dayStart;
  for (const [start, end] of busy) {
    if (start > cursor) {
      slots.push({ startsAt: new Date(cursor).toISOString(), endsAt: new Date(start).toISOString() });
    }
    if (end > cursor) {
      cursor = end;
    }
  }
  if (cursor < dayEnd) {
    slots.push({ startsAt: new Date(cursor).toISOString(), endsAt: new Date(dayEnd).toISOString() });
  }
  return slots;
}
