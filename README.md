# MDCAS — API

Content and scheduling API for **Maralit Dental Clinic**, a three-branch dental
practice in Batangas. It serves the public website (branches, services, staff,
availability) and the staff portal (appointment CRUD).

Frontend: [`mdcas-fe`](https://github.com/jvcerezo/mdcas-fe)

---

## How scheduling works

Two views are built from the same bookings, and the split matters:

| | Public | Staff |
|---|---|---|
| Who can see it | Anyone | Signed-in staff only |
| Shows | How busy each hour is | Patient, procedure, contact, notes, status |
| Endpoint | `GET /api/schedule/:clinic` | `GET /api/staff-portal/appointments` |

**The public view cannot leak patient data.** `PublicSlot` has no field capable
of holding a name, contact number or procedure, and `buildPublicMonthSchedule()`
is the only thing that constructs one. Redaction is a property of the types
rather than of someone remembering to delete fields in a controller.

Each public hour is reported as one of:

| Status | Meaning |
|---|---|
| `available` | Nobody booked this hour |
| `limited` | Partly booked — some chairs remain |
| `full` | Every rostered clinician is booked |
| `unavailable` | Branch open, but nobody rostered |

Slot capacity is the union of clinicians rostered for that hour and clinicians
who already hold a booking in it — a booking is itself proof of attendance when
the roster disagrees.

**Patients have no accounts and no write path.** They phone the branch and a
staff member records the appointment. That is the only way a booking is created.

### Times and dates

Appointments store a calendar date (`"2026-07-29"`) and wall-clock times
(`"14:00"`) in clinic-local terms — never UTC instants. All branches are in
Asia/Manila, so this removes timezone conversion entirely, and with it the class
of bug where a 9:00 AM booking renders an hour off. If a branch ever opens in
another timezone, add an IANA zone to `Clinic` and convert at the edges.

---

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

That is the whole setup. With `MONGO_URI` left blank the API runs straight from
`src/data/seed.data.ts` — no database required. Reads behave normally;
appointment writes are kept in memory and lost on restart, which is fine for
development and refused outright in production.

API on `http://localhost:5000`. Route list at `/api`, health at `/health`.

### With MongoDB

```bash
# .env
MONGO_URI=mongodb://localhost:27017/mdcas
JWT_SECRET=<48+ random bytes>

npm run seed     # loads content, staff accounts and demo bookings
npm run dev
```

Seed flags: `--no-appointments`, `--keep-appointments`, `--users-only`.
Existing staff accounts are never overwritten, so changed passwords survive a
re-seed.

---

## Editing clinic content

**`src/data/seed.data.ts` is the single source of truth** for branches,
services, staff and their weekly shifts. Nothing else hardcodes this content.

The file currently holds **placeholder data** — three plausible Batangas
branches with realistic services and staff. Replace it with the real details and
everything downstream updates: the website, the roster, the booking form's
dropdowns, and the capacity maths behind the public calendar.

Rules the file must satisfy:

1. Every `serviceSlug` on a clinic or staff member exists in `services`
2. Every `clinicSlug` in a shift exists in `clinics`
3. A shift falls inside that branch's opening hours
4. Slugs are URL segments — lowercase, hyphenated, permanent

`npm run dev` and `npm run seed` validate all of this on boot and print any
mismatch. A typo'd slug otherwise fails silently — a service quietly vanishing
from a branch page — so the check is worth reading.

After editing: restart (no database) or `npm run seed` (with one).

---

## Endpoints

### Public

```
GET  /api/organization
GET  /api/clinics
GET  /api/clinics/:slug          branch + its services, staff and roster
GET  /api/services               ?clinic= &category= &featured=
GET  /api/services/:slug
GET  /api/staff                  ?clinic= &role= &service=
GET  /api/staff/:slug
GET  /api/roster                 who works where, by weekday
GET  /api/schedule               ?month=YYYY-MM — all branches
GET  /api/schedule/legend
GET  /api/schedule/:clinicSlug   ?month=YYYY-MM
```

### Authentication

```
POST /api/auth/login
GET  /api/auth/me
GET  /api/auth/users             admin only
POST /api/auth/users             admin only — the only way to add staff
```

There is no registration endpoint. Login is rate-limited to 10 attempts per 15
minutes, and returns the same message for an unknown email as for a wrong
password so it cannot be used to enumerate staff addresses.

### Staff — all require a bearer token

```
GET    /api/staff-portal/options
GET    /api/staff-portal/appointments   ?from &to &clinic &staff &status &mine
POST   /api/staff-portal/appointments
GET    /api/staff-portal/appointments/:id
PATCH  /api/staff-portal/appointments/:id
DELETE /api/staff-portal/appointments/:id             cancels (keeps the record)
DELETE /api/staff-portal/appointments/:id?hard=true   admin only, permanent
```

`mine=true` returns the signed-in dentist's own chair list.

---

## Access control

| Role | Can do |
|---|---|
| `admin` | Everything, all branches, create accounts, hard-delete |
| `dentist` | Read and write the schedule for their assigned branches |
| `frontdesk` | Book, reschedule and cancel for their assigned branches |

`clinicSlugs: []` means all branches. Accounts are otherwise scoped, so a Santo
Tomas front desk cannot read Lipa's patients. Tokens are re-checked against the
account on every request, so deactivating a user takes effect immediately rather
than whenever their token happens to expire.

### Validation

Creating or moving an appointment is checked against the roster, opening hours
and existing bookings:

- **Errors** (rejected, `409`) — double-booking a clinician, end before start
- **Warnings** (saved, surfaced in the UI) — outside opening hours, clinician
  not rostered, branch does not normally offer that service

The split is deliberate: staff legitimately book outside the roster for overtime
or a doctor coming in specially. Two patients in one chair is never legitimate.

---

## Environment

| Variable | Required | Notes |
|---|---|---|
| `PORT` | no | Default `5000` |
| `MONGO_URI` | in production | Blank runs from the seed file |
| `JWT_SECRET` | in production | Boot fails without it in production |
| `JWT_EXPIRES_IN` | no | Default `12h` |
| `FRONTEND_URL` | in production | Comma-separated allowed origins |
| `STAFF_DEFAULT_PASSWORD` | no | Overrides all seeded passwords |
| `NODE_ENV` | no | `production` enables the strict checks above |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Before going live

- [ ] Replace the placeholder content in `src/data/seed.data.ts`
- [ ] **Change every seeded staff password** (they are all `ChangeMe123!`)
- [ ] Set `JWT_SECRET` and `MONGO_URI`
- [ ] Set `FRONTEND_URL` to the deployed site's origin
- [ ] Re-seed without demo bookings: `npm run seed -- --no-appointments`

---

## Scripts

```bash
npm run dev         # watch mode
npm run build       # compile to dist/
npm start           # run the build
npm run typecheck
npm run seed
```

## Stack

TypeScript · Express 4 · Mongoose 8 · JWT · bcryptjs · Helmet
