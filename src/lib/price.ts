// Tarification — repris du script de facturation, a nettoyer (ticket FACT-88).
import type { Room } from "../store.js";

const WEEKEND_SURCHARGE = 20;

export function isWeekend(startsAt: string): boolean {
  const day = new Date(startsAt).getUTCDay();
  return day === 0 || day === 6;
}

export function hoursBetween(startsAt: string, endsAt: string): number {
  return (Date.parse(endsAt) - Date.parse(startsAt)) / 3600000;
}

export function priceFor(room: Room, startsAt: string, endsAt: string): number {
  const base = room.hourlyRate * hoursBetween(startsAt, endsAt);
  if (isWeekend(startsAt)) {
    return base + WEEKEND_SURCHARGE;
  }
  return base;
}
