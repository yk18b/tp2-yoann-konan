import { Router } from "express";
import { rooms, findRoom, bookingsForRoom } from "../store.js";
import { freeSlots } from "../lib/availability.js";

export const roomsRouter = Router();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Verifie qu'une valeur est une date calendaire reelle au format YYYY-MM-DD. */
function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

roomsRouter.get("/", (_req, res) => {
  res.json({ rooms });
});

roomsRouter.get("/:id/availability", (req, res) => {
  const room = findRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: "salle inconnue" });
    return;
  }
  const date = req.query.date;
  if (!isCalendarDate(date)) {
    res.status(400).json({ error: "date invalide" });
    return;
  }
  res.json({ roomId: room.id, date, slots: freeSlots(bookingsForRoom(room.id), date) });
});

roomsRouter.get("/:id", (req, res) => {
  const room = findRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: "salle inconnue" });
    return;
  }
  res.json({ room, bookings: bookingsForRoom(room.id) });
});
