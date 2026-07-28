/**
 * Generates a realistic set of demo appointments so the calendar is not empty
 * on a fresh install.
 *
 * Bookings are derived from the real roster: an appointment is only ever
 * created for a provider who is actually on shift at that branch, in a service
 * that both the provider performs and the branch offers, inside the branch's
 * opening hours. That means the demo data can never contradict the schedule
 * engine.
 *
 * Output is deterministic — the same seed produces the same bookings — so
 * screenshots and manual testing stay stable. Dates are generated relative to
 * today, so the calendar always has something to show.
 *
 * This is demo content. Delete the `npm run seed` call to it, or pass
 * `--no-appointments`, once real bookings exist.
 */

import type { Appointment, AppointmentStatus, DayOfWeek } from '../types';
import { addDays, dayOfWeek, toMinutes, toTimeString, todayInClinicTimezone } from '../utils/time';
import { PROVIDER_ROLES, seedContent } from './seed.data';

const PATIENT_NAMES = [
  'Maria Clara Santos',
  'Jose Antonio Cruz',
  'Angelica Reyes',
  'Rafael Mendoza',
  'Kristine Joy Bautista',
  'Emmanuel Dizon',
  'Patricia Anne Lim',
  'Carlo Miguel Ramos',
  'Sofia Isabel Garcia',
  'Benjamin Torres',
  'Rowena Aguilar',
  'Dante Villanueva',
  'Charmaine Ocampo',
  'Julius Fernandez',
  'Marianne Castillo',
  'Elmer Panganiban',
  'Trisha Mae Gonzales',
  'Ferdinand Alvarez',
  'Lourdes Manalo',
  'Nathaniel Rivera',
  'Divina Gracia Salazar',
  'Ronaldo Bautista',
  'Jasmine Delos Reyes',
  'Arnel Macaraig',
  'Vanessa Marquez',
  'Christopher Tolentino',
  'Bernadette Cabrera',
  'Gerald Anthony Punzalan',
  'Marilou Katigbak',
  'Sebastian Ilagan',
];

const NOTE_TEMPLATES = [
  'Follow-up from last visit.',
  'Patient reports sensitivity on the upper right.',
  'HMO approval already on file.',
  'First visit — needs full charting.',
  'Requested the same dentist as last time.',
  'Running late is likely; patient commutes from Batangas City.',
  'Nervous patient — allow extra chair time.',
  '',
  '',
  '',
];

/**
 * A small deterministic PRNG (mulberry32). Seeded by a constant so repeated
 * seeding produces an identical dataset.
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(random() * items.length)];
}

/**
 * Picks a status appropriate to when the appointment falls: past bookings are
 * mostly completed, future ones are booked or confirmed.
 */
function statusFor(random: () => number, date: string, today: string): AppointmentStatus {
  if (date < today) {
    const roll = random();
    if (roll < 0.85) return 'completed';
    if (roll < 0.95) return 'cancelled';
    return 'no-show';
  }
  const roll = random();
  if (roll < 0.1) return 'cancelled';
  if (roll < 0.55) return 'confirmed';
  return 'booked';
}

export interface SampleAppointmentOptions {
  /** How many days back from today to generate. Default 14. */
  daysBefore?: number;
  /** How many days forward from today to generate. Default 45. */
  daysAfter?: number;
  /** Chance that any given free provider-hour becomes a booking. Default 0.38. */
  density?: number;
  /** Anchor date, "YYYY-MM-DD". Defaults to today in clinic time. */
  today?: string;
  seed?: number;
}

export function buildSampleAppointments(
  options: SampleAppointmentOptions = {},
): Appointment[] {
  const {
    daysBefore = 14,
    daysAfter = 45,
    density = 0.38,
    today = todayInClinicTimezone(),
    seed = 20260729,
  } = options;

  const random = createRandom(seed);
  const { clinics, services, staff } = seedContent;

  const serviceBySlug = new Map(services.map((service) => [service.slug, service]));
  const providers = staff.filter((member) =>
    (PROVIDER_ROLES as readonly string[]).includes(member.role),
  );

  const appointments: Appointment[] = [];
  let counter = 0;

  for (let offset = -daysBefore; offset <= daysAfter; offset += 1) {
    const date = addDays(today, offset);
    const day: DayOfWeek = dayOfWeek(date);

    for (const clinic of clinics) {
      const hours = clinic.hours.find((entry) => entry.day === day);
      if (!hours || hours.closed || !hours.opens || !hours.closes) continue;

      const clinicOpen = toMinutes(hours.opens);
      const clinicClose = toMinutes(hours.closes);

      // Tracks provider -> set of taken hour-starts, so we never double-book.
      const taken = new Map<string, Set<number>>();

      for (const provider of providers) {
        const shift = provider.shifts.find(
          (entry) => entry.clinicSlug === clinic.slug && entry.day === day,
        );
        if (!shift) continue;

        // Only services this provider performs AND this branch offers.
        const eligible = provider.serviceSlugs.filter((slug) =>
          clinic.serviceSlugs.includes(slug),
        );
        if (eligible.length === 0) continue;

        const shiftStart = Math.max(toMinutes(shift.start), clinicOpen);
        const shiftEnd = Math.min(toMinutes(shift.end), clinicClose);
        const providerTaken = taken.get(provider.slug) ?? new Set<number>();
        taken.set(provider.slug, providerTaken);

        for (let slot = shiftStart; slot + 60 <= shiftEnd; slot += 60) {
          if (random() > density) continue;
          if (providerTaken.has(slot)) continue;

          const serviceSlug = pick(random, eligible);
          if (!serviceSlug) continue;
          const service = serviceBySlug.get(serviceSlug);
          if (!service) continue;

          // Round the service duration up to whole hours so bookings align to
          // the hourly grid the public calendar renders.
          const blocks = Math.max(1, Math.ceil(service.durationMinutes / 60));
          const end = slot + blocks * 60;
          if (end > shiftEnd) continue;

          let clashes = false;
          for (let block = slot; block < end; block += 60) {
            if (providerTaken.has(block)) clashes = true;
          }
          if (clashes) continue;
          for (let block = slot; block < end; block += 60) {
            providerTaken.add(block);
          }

          counter += 1;
          const patientName = pick(random, PATIENT_NAMES) ?? 'Walk-in Patient';
          const note = pick(random, NOTE_TEMPLATES) ?? '';

          appointments.push({
            id: `seed-${String(counter).padStart(5, '0')}`,
            clinicSlug: clinic.slug,
            staffSlug: provider.slug,
            serviceSlug,
            date,
            start: toTimeString(slot),
            end: toTimeString(end),
            patientName,
            patientContact: `+63 9${Math.floor(random() * 900000000 + 100000000)}`,
            patientEmail: undefined,
            notes: note || undefined,
            status: statusFor(random, date, today),
            createdBy: 'seed@maralitdental.ph',
          });
        }
      }
    }
  }

  return appointments;
}
