import { Router } from "express";
import { rooms, findRoom, bookingsForRoom } from "../store.js";
import { dayWindow, freeSlotsIn } from "../lib/availability.js";

export const roomsRouter = Router();

roomsRouter.get("/", (_req, res) => {
  res.json({ rooms });
});

roomsRouter.get("/:id", (req, res) => {
  const room = findRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: "salle inconnue" });
    return;
  }
  res.json({ room, bookings: bookingsForRoom(room.id) });
});

roomsRouter.get("/:id/availability", (req, res) => {
  const room = findRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: "salle inconnue" });
    return;
  }
  const win = dayWindow(req.query.date);
  if (win.ok === false) {
    res.status(400).json({ error: win.error });
    return;
  }
  const booked = bookingsForRoom(room.id).map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt }));
  res.json({
    roomId: room.id,
    date: win.value.startsAt.slice(0, 10),
    freeSlots: freeSlotsIn(booked, win.value)
  });
});
