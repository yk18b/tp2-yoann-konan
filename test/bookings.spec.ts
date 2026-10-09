import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";

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

describe("POST /bookings", () => {
  it("refuse une salle inconnue", async () => {
    const res = await post({
      roomId: "cave",
      who: "moi",
      people: 2,
      startsAt: "2026-11-02T09:00:00Z",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res.status).toBe(400);
  });

  it("refuse un depassement de capacite", async () => {
    const res = await post({
      roomId: "salle-b",
      who: "moi",
      people: 40,
      startsAt: "2026-11-02T09:00:00Z",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res.status).toBe(400);
  });

  it("refuse une date invalide", async () => {
    const res = await post({
      roomId: "salle-b",
      who: "moi",
      people: 2,
      startsAt: "la semaine prochaine",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res.status).toBe(400);
  });

  it("refuse un creneau qui finit avant de commencer", async () => {
    const res = await post({
      roomId: "salle-b",
      who: "moi",
      people: 2,
      startsAt: "2026-11-02T11:00:00Z",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res.status).toBe(400);
  });

  it("accepte une reservation qui commence quand la precedente finit", async () => {
    const first = await post({
      roomId: "labo",
      who: "equipe-1",
      people: 4,
      startsAt: "2026-11-03T09:00:00Z",
      endsAt: "2026-11-03T10:00:00Z"
    });
    expect(first.status).toBe(201);

    const second = await post({
      roomId: "labo",
      who: "equipe-2",
      people: 4,
      startsAt: "2026-11-03T10:00:00Z",
      endsAt: "2026-11-03T11:00:00Z"
    });
    expect(second.status).toBe(201);
  });
});
