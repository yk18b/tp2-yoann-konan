# Add `GET /rooms/:id/availability?date=YYYY-MM-DD` returning a room's free slots for one UTC day

## Goal
A client can call `GET /rooms/:id/availability?date=YYYY-MM-DD` and receive `200 { roomId, date, freeSlots: [{startsAt, endsAt}] }`
where `freeSlots` is the exact complement of the room's bookings within the UTC day `[dateT00:00:00.000Z, nextDayT00:00:00.000Z)`,
as half-open `[startsAt, endsAt)` canonical ISO strings. Unknown room -> `404 { error: "salle inconnue" }`.
Missing/malformed/impossible date -> `400 { error }`. All covered by `npm run test:unit`.

## Non-goals
- No change to `src/store.ts` (off-limits) or `src/app.ts` (mount already exists).
- No new dependency; no supertest.
- No timezone handling beyond UTC; no multi-day ranges; no pagination.
- No availability logic for POST /bookings (that route is untouched).

## Assumptions and open questions
- assumption: when both the room and the date are invalid, the room check runs first -> `404`. Design lists 404 before 400; tests use valid date for the unknown-room case.
- assumption: `freeSlotsIn` stays `Slot[]` (not `Result`) because its inputs are already validated by `dayWindow`; a malformed `window` string is a caller bug, not user input. Not tested at the route.
- assumption: output times are always canonical `.toISOString()` (`.000Z`), including clipped booking bounds; tests compare against `.000Z` strings.
- No BLOCKING questions: the required shape is fully specified.

## Files to touch
| File | Change | Why |
|---|---|---|
| `src/lib/result.ts` | New: `Result<T,E>` union type | Repo convention; errors as values, not throws |
| `src/lib/availability.ts` | New: `Slot`, `dayWindow`, `freeSlotsIn` | Pure availability logic in `src/lib/` |
| `src/routes/rooms.ts` | Add `GET /:id/availability` handler | HTTP surface; reads store, calls pure lib |
| `test/availability.spec.ts` | New spec | Proves the goal via the real HTTP app |

## Steps

### 1. Add the `Result` type
- What: `export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };` with a one-line JSDoc contract.
- Where: new `src/lib/result.ts`.
- Done when: `npm run typecheck` exits 0.

### 2. Add pure availability logic
- What: new `src/lib/availability.ts` with:
  - `export interface Slot { startsAt: string; endsAt: string }`
  - `export function dayWindow(date: unknown): Result<Slot>` — accept only strings matching `/^\d{4}-\d{2}-\d{2}$/`; build `new Date(`${date}T00:00:00.000Z`)`; reject `NaN`; reject rollovers by requiring `d.toISOString().slice(0,10) === date` (kills `2026-13-01`, `2026-02-30`); compute next day with `Date.UTC(y, m-1, d+1)`; return canonical `.toISOString()` bounds. Never throws.
  - `export function freeSlotsIn(booked: Slot[], window: Slot): Slot[]` — clip each booking to `[window.start, window.end)` using `Date.parse` (keep if `start < wEnd && end > wStart`; clamp to window); drop zero/negatively-sized intervals; sort by start; sweep with a cursor that takes `max(cursor, end)` (this merges overlaps and swallows adjacent bookings, so no zero-length slot); emit a gap when `interval.start > cursor`; emit the trailing gap `cursor -> wEnd` when `cursor < wEnd`. Output every bound via `new Date(ms).toISOString()`.
- Where: new `src/lib/availability.ts`; imports `Result` from `./result.js`, JSDoc on every export, named exports only.
- Done when: `npm run typecheck` and `npm run lint` exit 0.

### 3. Wire the route
- What: in `src/routes/rooms.ts` add, after the existing `GET /:id` handler:
  - `roomsRouter.get("/:id/availability", (req, res) => { ... })`
  - `findRoom(req.params.id)` first: if absent -> `res.status(404).json({ error: "salle inconnue" })`, return.
  - `const win = dayWindow(req.query.date);` if `!win.ok` -> `res.status(400).json({ error: win.error })`, return.
  - `const booked = bookingsForRoom(room.id).map(b => ({ startsAt: b.startsAt, endsAt: b.endsAt }));`
  - `res.json({ roomId: room.id, date: win.value.startsAt.slice(0, 10), freeSlots: freeSlotsIn(booked, win.value) });`
- Where: `src/routes/rooms.ts`, imports `dayWindow, freeSlotsIn` from `../lib/availability.js`.
- Done when: `npm run typecheck` and `npm run lint` exit 0; `curl "localhost:3000/rooms/amphi/availability?date=2026-10-06"` after `npm start` returns two slots (manual, optional).

### 4. Add the HTTP spec
- What: create `test/availability.spec.ts` reusing the exact harness from `test/bookings.spec.ts:4-21` (`createApp`, `listen(0)`, fetch, close in `finally`); add a `post` helper too. Implement the cases in "How this is verified".
- Where: new `test/availability.spec.ts`.
- Done when: `npm run test:unit` exits 0 (all old and new tests pass).

## How this is verified
Written before the implementation exists; every case goes in `test/availability.spec.ts`:
- (a) no booking -> whole-day slot: `GET /rooms/salle-b/availability?date=2026-10-07` -> 200, `freeSlots == [{startsAt:"2026-10-07T00:00:00.000Z", endsAt:"2026-10-08T00:00:00.000Z"}]`.
- (b) seeded booking: `GET /rooms/amphi/availability?date=2026-10-06` -> 200, exactly `[{00:00:00.000Z,14:00:00.000Z},{17:00:00.000Z,2026-10-07T00:00:00.000Z}]` (`bk-1002` is 14:00Z-17:00Z).
- (c) booking on another day ignored: `GET /rooms/salle-a/availability?date=2026-10-04` -> whole-day slot (`bk-1001` is 2026-10-05).
- (d) unknown room: `GET /rooms/cave/availability?date=2026-10-06` -> 404, `body.error === "salle inconnue"`.
- (e) missing date: `GET /rooms/amphi/availability` -> 400.
- (f) malformed/impossible: `date=2026-13-01` and `date=2026-02-30` -> both 400.
- (g) adjacent bookings, no zero-length slot: `POST /bookings` labo `2026-12-01T09:00:00Z`-`10:00:00Z` then `10:00:00Z`-`11:00:00Z` (both expect 201), then `GET /rooms/labo/availability?date=2026-12-01` -> 200, exactly 2 slots `{00:00-09:00}` and `{11:00-24:00}`; also assert `freeSlots.every(s => Date.parse(s.startsAt) < Date.parse(s.endsAt))` and no slot equals `[10:00,10:00]`.
- Optional pure unit cases (same file, import from `../src/lib/availability.js`): overlapping bookings merged; booking fully outside the window ignored; fully-booked day -> `[]`.

Final gate (all must exit 0, in this order): `npm run typecheck`, `npm run lint`, `npm run test:unit`.

## Risks and rollback
- Date rollover: using `Date.parse("2026-02-30T00:00:00.000Z")` silently rolls to March 2; the `toISOString().slice(0,10) === date` round-trip is what prevents it. Case (f) is the guard.
- Adjacent/overlapping bookings: a naive per-booking gap loop emits `[10:00,10:00]`; the `max(cursor, end)` sweep plus strict `>` gap test prevents it. Case (g) is the guard.
- Global store mutation: case (g) POSTs mutate the in-memory `bookings` for this test file only; use labo/2026-12-01 so no other case is affected and rely on sequential execution.
- Canonical vs raw strings: seeded/Posted bounds may lack `.000`; always re-serialize via `toISOString()` so tests are stable.
- Rollback: all changes are additive (3 new files, 1 handler). Revert the commit or delete the handler; no schema/data migration and `src/store.ts` untouched.
