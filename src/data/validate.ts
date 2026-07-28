/**
 * Consistency checks for `seed.data.ts`.
 *
 * The content file is edited by hand, and the failure mode of a typo'd slug is
 * silent — a service quietly disappears from a branch page, or a doctor's
 * shifts vanish from the roster. These checks run at boot and at seed time so
 * the mistake shows up as a console warning instead of a missing section.
 */

import { PROVIDER_ROLES, seedContent, staffUsers } from './seed.data';
import { toMinutes } from '../utils/time';

export function validateSeedData(): string[] {
  const problems: string[] = [];
  const { clinics, services, staff } = seedContent;

  const serviceSlugs = new Set(services.map((service) => service.slug));
  const clinicSlugs = new Set(clinics.map((clinic) => clinic.slug));
  const staffSlugs = new Set(staff.map((member) => member.slug));

  const duplicates = (values: string[], label: string): void => {
    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) problems.push(`Duplicate ${label} slug "${value}".`);
      seen.add(value);
    }
  };

  duplicates(clinics.map((c) => c.slug), 'clinic');
  duplicates(services.map((s) => s.slug), 'service');
  duplicates(staff.map((s) => s.slug), 'staff');

  for (const clinic of clinics) {
    for (const slug of clinic.serviceSlugs) {
      if (!serviceSlugs.has(slug)) {
        problems.push(`Clinic "${clinic.slug}" lists unknown service "${slug}".`);
      }
    }

    const days = new Set<number>();
    for (const hours of clinic.hours) {
      if (days.has(hours.day)) {
        problems.push(`Clinic "${clinic.slug}" has two entries for day ${hours.day}.`);
      }
      days.add(hours.day);

      if (!hours.closed) {
        if (!hours.opens || !hours.closes) {
          problems.push(`Clinic "${clinic.slug}" day ${hours.day} is open but has no times.`);
        } else if (toMinutes(hours.closes) <= toMinutes(hours.opens)) {
          problems.push(`Clinic "${clinic.slug}" day ${hours.day} closes before it opens.`);
        }
      }
    }
    for (let day = 0; day <= 6; day += 1) {
      if (!days.has(day)) {
        problems.push(`Clinic "${clinic.slug}" has no entry for day ${day}.`);
      }
    }
  }

  for (const member of staff) {
    for (const slug of member.serviceSlugs) {
      if (!serviceSlugs.has(slug)) {
        problems.push(`Staff "${member.slug}" lists unknown service "${slug}".`);
      }
    }

    for (const shift of member.shifts) {
      if (!clinicSlugs.has(shift.clinicSlug)) {
        problems.push(`Staff "${member.slug}" has a shift at unknown branch "${shift.clinicSlug}".`);
        continue;
      }

      if (toMinutes(shift.end) <= toMinutes(shift.start)) {
        problems.push(
          `Staff "${member.slug}" has a shift on day ${shift.day} that ends before it starts.`,
        );
        continue;
      }

      const clinic = clinics.find((entry) => entry.slug === shift.clinicSlug);
      const hours = clinic?.hours.find((entry) => entry.day === shift.day);

      if (!hours || hours.closed || !hours.opens || !hours.closes) {
        problems.push(
          `Staff "${member.slug}" is rostered at "${shift.clinicSlug}" on day ${shift.day}, when that branch is closed.`,
        );
      } else if (
        toMinutes(shift.start) < toMinutes(hours.opens) ||
        toMinutes(shift.end) > toMinutes(hours.closes)
      ) {
        problems.push(
          `Staff "${member.slug}" shift ${shift.start}-${shift.end} on day ${shift.day} falls outside "${shift.clinicSlug}" hours (${hours.opens}-${hours.closes}).`,
        );
      }
    }

    // A provider with no bookable services can never appear in the booking form.
    if (
      (PROVIDER_ROLES as readonly string[]).includes(member.role) &&
      member.serviceSlugs.length === 0
    ) {
      problems.push(`Provider "${member.slug}" performs no services, so cannot be booked.`);
    }
  }

  for (const user of staffUsers) {
    for (const slug of user.clinicSlugs) {
      if (!clinicSlugs.has(slug)) {
        problems.push(`Staff account "${user.email}" references unknown branch "${slug}".`);
      }
    }
    if (user.staffSlug && !staffSlugs.has(user.staffSlug)) {
      problems.push(
        `Staff account "${user.email}" references unknown staff profile "${user.staffSlug}".`,
      );
    }
  }

  return problems;
}
