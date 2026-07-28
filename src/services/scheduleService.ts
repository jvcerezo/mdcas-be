/**
 * The scheduling engine.
 *
 * Two very different views are built here from the same underlying data:
 *
 *   buildPublicMonthSchedule()  — what anyone on the internet may see. Hourly
 *                                 blocks per day with a busy-ness status and
 *                                 nothing else. No patient name, no contact,
 *                                 no procedure, not even a count of which
 *                                 provider is taken.
 *
 *   buildStaffAppointmentViews() — what a logged-in staff member sees. Full
 *                                 detail: patient, procedure, time, status.
 *
 * The separation is structural. `PublicSlot` has no field capable of holding
 * patient data, so the public endpoint cannot leak it even if someone later
 * passes the wrong object into it.
 */

import { appointments } from './appointmentStore';
import { content } from './contentStore';
import {
  BLOCKING_STATUSES,
  type Appointment,
  type DayOfWeek,
  type PublicDay,
  type PublicMonthSchedule,
  type PublicSlot,
  type PublicSlotStatus,
  type ScheduleEntry,
  type StaffAppointmentView,
} from '../types';
import {
  dayName,
  dayOfWeek,
  eachDayOfMonth,
  rangeContains,
  rangesOverlap,
  toMinutes,
  toTimeString,
} from '../utils/time';

/** Length of one block on the public calendar grid, in minutes. */
export const SLOT_MINUTES = 60;

/* -------------------------------------------------------------------------- */
/* Public month calendar                                                      */
/* -------------------------------------------------------------------------- */

function slotStatus(capacity: number, booked: number): PublicSlotStatus {
  if (capacity === 0) return 'unavailable';
  if (booked >= capacity) return 'full';
  if (booked > 0) return 'limited';
  return 'available';
}

/**
 * Builds the redacted month view for one branch.
 *
 * Capacity for an hour is the number of providers who could take a patient
 * then: everyone rostered for that hour, plus anyone who already has a booking
 * in it (a booking is proof they are working, even if the roster says
 * otherwise). Booked is how many of those are taken. The public sees only the
 * resulting status.
 */
export async function buildPublicMonthSchedule(
  clinicSlug: string,
  month: string,
): Promise<PublicMonthSchedule | null> {
  const clinic = content.clinic(clinicSlug);
  if (!clinic) return null;

  const days = eachDayOfMonth(month);
  const first = days[0];
  const last = days[days.length - 1];

  const monthAppointments = await appointments.find({
    clinicSlug,
    from: first,
    to: last,
    statuses: BLOCKING_STATUSES,
  });

  // Group bookings by date once, rather than scanning the whole month per slot.
  const byDate = new Map<string, Appointment[]>();
  for (const appointment of monthAppointments) {
    const bucket = byDate.get(appointment.date);
    if (bucket) bucket.push(appointment);
    else byDate.set(appointment.date, [appointment]);
  }

  const providers = content.providersAtClinic(clinicSlug);

  const publicDays: PublicDay[] = days.map((date) => {
    const day: DayOfWeek = dayOfWeek(date);
    const hours = clinic.hours.find((entry) => entry.day === day);

    if (!hours || hours.closed || !hours.opens || !hours.closes) {
      return {
        date,
        day,
        dayName: dayName(day),
        closed: true,
        note: hours?.note,
        slots: [],
        totalSlots: 0,
        availableSlots: 0,
      };
    }

    const opens = toMinutes(hours.opens);
    const closes = toMinutes(hours.closes);
    const dayAppointments = byDate.get(date) ?? [];

    const slots: PublicSlot[] = [];
    for (let start = opens; start + SLOT_MINUTES <= closes; start += SLOT_MINUTES) {
      const end = start + SLOT_MINUTES;

      const rostered = new Set<string>();
      for (const provider of providers) {
        const onShift = provider.shifts.some(
          (shift) =>
            shift.clinicSlug === clinicSlug &&
            shift.day === day &&
            rangeContains(toMinutes(shift.start), toMinutes(shift.end), start, end),
        );
        if (onShift) rostered.add(provider.slug);
      }

      const bookedProviders = new Set<string>();
      for (const appointment of dayAppointments) {
        if (
          rangesOverlap(toMinutes(appointment.start), toMinutes(appointment.end), start, end)
        ) {
          bookedProviders.add(appointment.staffSlug);
        }
      }

      const capacity = new Set([...rostered, ...bookedProviders]).size;
      const booked = bookedProviders.size;

      slots.push({
        start: toTimeString(start),
        end: toTimeString(end),
        capacity,
        booked,
        status: slotStatus(capacity, booked),
      });
    }

    return {
      date,
      day,
      dayName: dayName(day),
      closed: false,
      note: hours.note,
      opens: hours.opens,
      closes: hours.closes,
      slots,
      totalSlots: slots.length,
      availableSlots: slots.filter(
        (slot) => slot.status === 'available' || slot.status === 'limited',
      ).length,
    };
  });

  return {
    clinic: {
      slug: clinic.slug,
      name: clinic.name,
      shortName: clinic.shortName,
      accentColor: clinic.accentColor,
      phone: clinic.phone,
      mobile: clinic.mobile,
      email: clinic.email,
    },
    month,
    year: Number(month.slice(0, 4)),
    monthNumber: Number(month.slice(5, 7)),
    days: publicDays,
  };
}

/* -------------------------------------------------------------------------- */
/* Staff views                                                                */
/* -------------------------------------------------------------------------- */

/** Enriches raw appointments with the display names the staff UI needs. */
export function toStaffViews(items: Appointment[]): StaffAppointmentView[] {
  return items.map((appointment) => {
    const clinic = content.clinic(appointment.clinicSlug);
    const staffMember = content.staffMember(appointment.staffSlug);
    const service = content.service(appointment.serviceSlug);
    return {
      ...appointment,
      clinicName: clinic?.name ?? appointment.clinicSlug,
      staffName: staffMember?.name ?? appointment.staffSlug,
      serviceName: service?.name ?? appointment.serviceSlug,
      serviceDurationMinutes: service?.durationMinutes ?? 60,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Weekly roster (public — who works where, no patient data)                  */
/* -------------------------------------------------------------------------- */

/**
 * Flattens staff shifts into one row per person, per branch, per weekday.
 * Used by the clinic pages to show who you would see and when.
 */
export function buildWeeklyRoster(filters: {
  clinicSlug?: string;
  staffSlug?: string;
  serviceSlug?: string;
  day?: DayOfWeek;
} = {}): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];

  for (const member of content.staff()) {
    if (filters.staffSlug && member.slug !== filters.staffSlug) continue;
    if (filters.serviceSlug && !member.serviceSlugs.includes(filters.serviceSlug)) continue;

    for (const shift of member.shifts) {
      if (filters.clinicSlug && shift.clinicSlug !== filters.clinicSlug) continue;
      if (filters.day !== undefined && shift.day !== filters.day) continue;

      const clinic = content.clinic(shift.clinicSlug);
      if (!clinic) continue;

      entries.push({
        id: `${member.slug}-${shift.clinicSlug}-${shift.day}-${shift.start}`,
        day: shift.day,
        dayName: dayName(shift.day),
        start: shift.start,
        end: shift.end,
        clinic: {
          slug: clinic.slug,
          name: clinic.name,
          shortName: clinic.shortName,
          accentColor: clinic.accentColor,
          city: clinic.address.city,
          phone: clinic.phone,
        },
        staff: {
          slug: member.slug,
          name: member.name,
          credentials: member.credentials,
          role: member.role,
          specialty: member.specialty,
          photo: member.photo,
        },
        serviceSlugs: member.serviceSlugs,
      });
    }
  }

  return entries.sort(
    (a, b) =>
      a.day - b.day ||
      a.start.localeCompare(b.start) ||
      a.clinic.shortName.localeCompare(b.clinic.shortName),
  );
}

/* -------------------------------------------------------------------------- */
/* Validation & conflict detection                                            */
/* -------------------------------------------------------------------------- */

export interface ValidationResult {
  /** Blocking problems. The write is rejected if this is non-empty. */
  errors: string[];
  /**
   * Non-blocking problems — booking outside the roster, for instance. Staff
   * legitimately do this (overtime, a doctor coming in specially), so it is
   * surfaced in the UI rather than refused.
   */
  warnings: string[];
}

/**
 * Checks an appointment against the roster, the branch's opening hours and
 * existing bookings.
 */
export async function validateAppointment(
  input: {
    clinicSlug: string;
    staffSlug: string;
    serviceSlug: string;
    date: string;
    start: string;
    end: string;
    status: Appointment['status'];
  },
  excludeId?: string,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const clinic = content.clinic(input.clinicSlug);
  const staffMember = content.staffMember(input.staffSlug);
  const service = content.service(input.serviceSlug);

  if (!clinic) errors.push(`Unknown branch "${input.clinicSlug}".`);
  if (!staffMember) errors.push(`Unknown staff member "${input.staffSlug}".`);
  if (!service) errors.push(`Unknown service "${input.serviceSlug}".`);
  if (errors.length > 0) return { errors, warnings };

  const start = toMinutes(input.start);
  const end = toMinutes(input.end);
  if (end <= start) {
    errors.push('The end time must be after the start time.');
    return { errors, warnings };
  }

  const day = dayOfWeek(input.date);

  if (clinic && service && !clinic.serviceSlugs.includes(service.slug)) {
    warnings.push(`${clinic.shortName} does not normally offer ${service.name}.`);
  }

  if (staffMember && service && !staffMember.serviceSlugs.includes(service.slug)) {
    warnings.push(`${staffMember.name} is not listed as performing ${service.name}.`);
  }

  if (clinic) {
    const hours = clinic.hours.find((entry) => entry.day === day);
    if (!hours || hours.closed || !hours.opens || !hours.closes) {
      warnings.push(`${clinic.shortName} is closed on ${dayName(day)}s.`);
    } else if (start < toMinutes(hours.opens) || end > toMinutes(hours.closes)) {
      warnings.push(
        `Outside ${clinic.shortName} opening hours (${hours.opens}–${hours.closes}).`,
      );
    }
  }

  if (staffMember) {
    const onShift = staffMember.shifts.some(
      (shift) =>
        shift.clinicSlug === input.clinicSlug &&
        shift.day === day &&
        rangeContains(toMinutes(shift.start), toMinutes(shift.end), start, end),
    );
    if (!onShift) {
      warnings.push(
        `${staffMember.name} is not rostered at ${clinic?.shortName ?? input.clinicSlug} at this time.`,
      );
    }
  }

  // A double-booked provider is a hard error — two patients cannot share a chair.
  if (BLOCKING_STATUSES.includes(input.status)) {
    const sameDay = await appointments.find({
      staffSlug: input.staffSlug,
      from: input.date,
      to: input.date,
      statuses: BLOCKING_STATUSES,
    });

    const clash = sameDay.find(
      (existing) =>
        existing.id !== excludeId &&
        rangesOverlap(toMinutes(existing.start), toMinutes(existing.end), start, end),
    );

    if (clash) {
      errors.push(
        `${staffMember?.name ?? input.staffSlug} already has a booking from ${clash.start} to ${clash.end} on ${input.date}.`,
      );
    }
  }

  return { errors, warnings };
}
