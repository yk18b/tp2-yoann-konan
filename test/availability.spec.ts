import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import { freeSlots } from "../src/lib/availability.js";
import type { Booking } from "../src/store.js";

async function get(path: string) {
  const app = createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, body: (await res.json()) as any };
  } finally {
    server.close();
  }
}

const booking = (startsAt: string, endsAt: string): Booking => ({
  id: "bk-test",
  roomId: "salle-a",
  who: "test",
  people: 1,
  startsAt,
  endsAt,
  price: 0
});

describe("GET /rooms/:id/availability", () => {
  it("refuse une salle inconnue", async () => {
    const res = await get("/rooms/cave/availability?date=2026-10-05");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("salle inconnue");
  });

  it("refuse une date absente", async () => {
    const res = await get("/rooms/salle-a/availability");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("date invalide");
  });

  it.each(["2026-2-3", "2026-02-30", "2026-13-01", "la semaine prochaine"])(
    "refuse la date %s",
    async (date) => {
      const res = await get(`/rooms/salle-a/availability?date=${encodeURIComponent(date)}`);
      expect(res.status).toBe(400);
    }
  );

  it("renvoie la journee entiere pour une salle sans reservation", async () => {
    const res = await get("/rooms/labo/availability?date=2026-10-05");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      roomId: "labo",
      date: "2026-10-05",
      slots: [{ startsAt: "2026-10-05T00:00:00.000Z", endsAt: "2026-10-06T00:00:00.000Z" }]
    });
  });

  it("retire le creneau reserve de salle-a", async () => {
    const res = await get("/rooms/salle-a/availability?date=2026-10-05");
    expect(res.body.slots).toEqual([
      { startsAt: "2026-10-05T00:00:00.000Z", endsAt: "2026-10-05T09:00:00.000Z" },
      { startsAt: "2026-10-05T11:00:00.000Z", endsAt: "2026-10-06T00:00:00.000Z" }
    ]);
  });

  it("ignore une reservation tombant un autre jour", async () => {
    const res = await get("/rooms/salle-a/availability?date=2026-10-06");
    expect(res.body.slots).toEqual([
      { startsAt: "2026-10-06T00:00:00.000Z", endsAt: "2026-10-07T00:00:00.000Z" }
    ]);
  });
});

describe("freeSlots", () => {
  it("renvoie la journee entiere sans reservation", () => {
    expect(freeSlots([], "2026-10-05")).toEqual([
      { startsAt: "2026-10-05T00:00:00.000Z", endsAt: "2026-10-06T00:00:00.000Z" }
    ]);
  });

  it("rogne une reservation qui deborde de la veille", () => {
    const slots = freeSlots([booking("2026-10-05T22:00:00Z", "2026-10-06T02:00:00Z")], "2026-10-06");
    expect(slots).toEqual([
      { startsAt: "2026-10-06T02:00:00.000Z", endsAt: "2026-10-07T00:00:00.000Z" }
    ]);
  });

  it("rogne une reservation qui deborde sur le lendemain", () => {
    const slots = freeSlots([booking("2026-10-06T22:00:00Z", "2026-10-07T02:00:00Z")], "2026-10-06");
    expect(slots).toEqual([
      { startsAt: "2026-10-06T00:00:00.000Z", endsAt: "2026-10-06T22:00:00.000Z" }
    ]);
  });

  it("ne produit pas de creneau vide entre deux reservations bout a bout", () => {
    const slots = freeSlots(
      [booking("2026-10-06T09:00:00Z", "2026-10-06T10:00:00Z"), booking("2026-10-06T10:00:00Z", "2026-10-06T11:00:00Z")],
      "2026-10-06"
    );
    expect(slots).toEqual([
      { startsAt: "2026-10-06T00:00:00.000Z", endsAt: "2026-10-06T09:00:00.000Z" },
      { startsAt: "2026-10-06T11:00:00.000Z", endsAt: "2026-10-07T00:00:00.000Z" }
    ]);
  });

  it("fusionne des reservations non triees et qui se chevauchent", () => {
    const slots = freeSlots(
      [
        booking("2026-10-06T14:00:00Z", "2026-10-06T16:00:00Z"),
        booking("2026-10-06T09:00:00Z", "2026-10-06T11:00:00Z"),
        booking("2026-10-06T10:00:00Z", "2026-10-06T12:00:00Z")
      ],
      "2026-10-06"
    );
    expect(slots).toEqual([
      { startsAt: "2026-10-06T00:00:00.000Z", endsAt: "2026-10-06T09:00:00.000Z" },
      { startsAt: "2026-10-06T12:00:00.000Z", endsAt: "2026-10-06T14:00:00.000Z" },
      { startsAt: "2026-10-06T16:00:00.000Z", endsAt: "2026-10-07T00:00:00.000Z" }
    ]);
  });

  it("renvoie aucun creneau pour une journee entierement reservee", () => {
    expect(
      freeSlots([booking("2026-10-06T00:00:00Z", "2026-10-07T00:00:00Z")], "2026-10-06")
    ).toEqual([]);
  });
});
