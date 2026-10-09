import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import { dayWindow, freeSlotsIn, type Slot } from "../src/lib/availability.js";

async function call(path: string, init?: RequestInit) {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, init);
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

const post = (payload: unknown) =>
  call("/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

describe("GET /rooms/:id/availability", () => {
  it("renvoie la journee entiere quand la salle est libre", async () => {
    const res = await call("/rooms/salle-b/availability?date=2026-10-07");
    expect(res.status).toBe(200);
    expect((res.body as { freeSlots: Slot[] }).freeSlots).toEqual([
      { startsAt: "2026-10-07T00:00:00.000Z", endsAt: "2026-10-08T00:00:00.000Z" }
    ]);
  });

  it("decoupe la journee autour des reservations existantes", async () => {
    const res = await call("/rooms/amphi/availability?date=2026-10-06");
    expect(res.status).toBe(200);
    expect((res.body as { freeSlots: Slot[] }).freeSlots).toEqual([
      { startsAt: "2026-10-06T00:00:00.000Z", endsAt: "2026-10-06T14:00:00.000Z" },
      { startsAt: "2026-10-06T17:00:00.000Z", endsAt: "2026-10-07T00:00:00.000Z" }
    ]);
  });

  it("ignore une reservation situee un autre jour", async () => {
    const res = await call("/rooms/salle-a/availability?date=2026-10-04");
    expect(res.status).toBe(200);
    expect((res.body as { freeSlots: Slot[] }).freeSlots).toEqual([
      { startsAt: "2026-10-04T00:00:00.000Z", endsAt: "2026-10-05T00:00:00.000Z" }
    ]);
  });

  it("renvoie 404 pour une salle inconnue", async () => {
    const res = await call("/rooms/cave/availability?date=2026-10-06");
    expect(res.status).toBe(404);
    expect((res.body as { error: string }).error).toBe("salle inconnue");
  });

  it("renvoie 400 quand la date manque", async () => {
    const res = await call("/rooms/amphi/availability");
    expect(res.status).toBe(400);
  });

  it("renvoie 400 pour une date impossible", async () => {
    const deborde = await call("/rooms/amphi/availability?date=2026-13-01");
    expect(deborde.status).toBe(400);

    const fevrier = await call("/rooms/amphi/availability?date=2026-02-30");
    expect(fevrier.status).toBe(400);
  });

  it("accepte un 29 fevrier bissextile et couvre la journee entiere", async () => {
    const res = await call("/rooms/salle-b/availability?date=2024-02-29");
    expect(res.status).toBe(200);
    expect((res.body as { freeSlots: Slot[] }).freeSlots).toEqual([
      { startsAt: "2024-02-29T00:00:00.000Z", endsAt: "2024-03-01T00:00:00.000Z" }
    ]);
  });

  it("renvoie 400 pour un 29 fevrier non bissextile", async () => {
    const res = await call("/rooms/salle-b/availability?date=2025-02-29");
    expect(res.status).toBe(400);
  });

  it("ne produit aucun creneau de taille nulle entre deux reservations adjacentes", async () => {
    const first = await post({
      roomId: "labo",
      who: "equipe-1",
      people: 4,
      startsAt: "2026-12-01T09:00:00Z",
      endsAt: "2026-12-01T10:00:00Z"
    });
    expect(first.status).toBe(201);

    const second = await post({
      roomId: "labo",
      who: "equipe-2",
      people: 4,
      startsAt: "2026-12-01T10:00:00Z",
      endsAt: "2026-12-01T11:00:00Z"
    });
    expect(second.status).toBe(201);

    const res = await call("/rooms/labo/availability?date=2026-12-01");
    expect(res.status).toBe(200);
    const freeSlots = (res.body as { freeSlots: Slot[] }).freeSlots;
    expect(freeSlots).toEqual([
      { startsAt: "2026-12-01T00:00:00.000Z", endsAt: "2026-12-01T09:00:00.000Z" },
      { startsAt: "2026-12-01T11:00:00.000Z", endsAt: "2026-12-02T00:00:00.000Z" }
    ]);
    expect(freeSlots.every((s) => Date.parse(s.startsAt) < Date.parse(s.endsAt))).toBe(true);
  });
});

describe("freeSlotsIn", () => {
  const journee: Slot = {
    startsAt: "2026-10-06T00:00:00.000Z",
    endsAt: "2026-10-07T00:00:00.000Z"
  };

  it("fusionne les reservations qui se chevauchent", () => {
    const free = freeSlotsIn(
      [
        { startsAt: "2026-10-06T09:00:00.000Z", endsAt: "2026-10-06T11:00:00.000Z" },
        { startsAt: "2026-10-06T10:00:00.000Z", endsAt: "2026-10-06T12:00:00.000Z" }
      ],
      journee
    );
    expect(free).toEqual([
      { startsAt: "2026-10-06T00:00:00.000Z", endsAt: "2026-10-06T09:00:00.000Z" },
      { startsAt: "2026-10-06T12:00:00.000Z", endsAt: "2026-10-07T00:00:00.000Z" }
    ]);
  });

  it("ignore une reservation hors de la fenetre", () => {
    const free = freeSlotsIn(
      [{ startsAt: "2026-10-05T09:00:00.000Z", endsAt: "2026-10-05T11:00:00.000Z" }],
      journee
    );
    expect(free).toEqual([
      { startsAt: "2026-10-06T00:00:00.000Z", endsAt: "2026-10-07T00:00:00.000Z" }
    ]);
  });

  it("renvoie aucun creneau quand la journee est entierement reservee", () => {
    const free = freeSlotsIn(
      [{ startsAt: "2026-10-06T00:00:00.000Z", endsAt: "2026-10-07T00:00:00.000Z" }],
      journee
    );
    expect(free).toEqual([]);
  });
});

describe("dayWindow", () => {
  it("couvre une journee entiere pour une annee a deux chiffres", () => {
    const window = dayWindow("0001-01-01");
    expect(window.ok === true).toBe(true);
    if (window.ok === true) {
      expect(window.value).toEqual({
        startsAt: "0001-01-01T00:00:00.000Z",
        endsAt: "0001-01-02T00:00:00.000Z"
      });
    }
  });
});
