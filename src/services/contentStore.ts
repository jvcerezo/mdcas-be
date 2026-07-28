/**
 * Read access to the static content: clinics, services and staff profiles.
 *
 * Content is loaded once at boot — from MongoDB when it is configured, and
 * otherwise straight from `src/data/seed.data.ts` — then cached in memory. It
 * changes rarely enough that re-reading it per request would be pure waste,
 * and the schedule engine touches it on every slot of every day of the month.
 *
 * Call `refreshContent()` after seeding to pick up changes without a restart.
 */

import { isDatabaseConnected } from '../db/connect';
import { ClinicModel } from '../models/Clinic';
import { ServiceModel } from '../models/Service';
import { StaffMemberModel } from '../models/StaffMember';
import { PROVIDER_ROLES, seedContent } from '../data/seed.data';
import type { Clinic, ContentSet, Service, StaffMember } from '../types';

interface ContentCache extends ContentSet {
  clinicBySlug: Map<string, Clinic>;
  serviceBySlug: Map<string, Service>;
  staffBySlug: Map<string, StaffMember>;
  /** Staff who can be booked into a chair, i.e. dentists and hygienists. */
  providers: StaffMember[];
}

let cache: ContentCache | null = null;

function buildCache(content: ContentSet): ContentCache {
  return {
    ...content,
    clinicBySlug: new Map(content.clinics.map((clinic) => [clinic.slug, clinic])),
    serviceBySlug: new Map(content.services.map((service) => [service.slug, service])),
    staffBySlug: new Map(content.staff.map((member) => [member.slug, member])),
    providers: content.staff.filter((member) =>
      (PROVIDER_ROLES as readonly string[]).includes(member.role),
    ),
  };
}

/** Strips Mongo internals so documents and seed objects are shape-identical. */
function plain<T>(documents: unknown[]): T[] {
  return documents.map((doc) => {
    const { _id, __v, createdAt, updatedAt, ...rest } = doc as Record<string, unknown>;
    return rest as T;
  });
}

export async function loadContent(): Promise<ContentSet> {
  if (!isDatabaseConnected()) {
    cache = buildCache(seedContent);
    return cache;
  }

  const [clinics, services, staff] = await Promise.all([
    ClinicModel.find().lean(),
    ServiceModel.find().lean(),
    StaffMemberModel.find().lean(),
  ]);

  // An empty database usually means "seeding hasn't run yet". Falling back to
  // the seed file keeps the site up instead of serving a blank page.
  if (clinics.length === 0) {
    console.warn(
      '[content] MongoDB has no clinics — falling back to src/data/seed.data.ts.\n' +
        '          Run `npm run seed` to populate the database.',
    );
    cache = buildCache(seedContent);
    return cache;
  }

  cache = buildCache({
    clinics: plain<Clinic>(clinics),
    services: plain<Service>(services),
    staff: plain<StaffMember>(staff),
  });
  return cache;
}

export async function refreshContent(): Promise<ContentSet> {
  cache = null;
  return loadContent();
}

function requireCache(): ContentCache {
  if (!cache) {
    // Every route runs after `loadContent()` in `index.ts`, so this only fires
    // if something is called before boot completes.
    throw new Error('Content has not been loaded yet — call loadContent() during startup.');
  }
  return cache;
}

export const content = {
  clinics: (): Clinic[] => requireCache().clinics,
  services: (): Service[] => requireCache().services,
  staff: (): StaffMember[] => requireCache().staff,
  providers: (): StaffMember[] => requireCache().providers,

  clinic: (slug: string): Clinic | undefined => requireCache().clinicBySlug.get(slug),
  service: (slug: string): Service | undefined => requireCache().serviceBySlug.get(slug),
  staffMember: (slug: string): StaffMember | undefined => requireCache().staffBySlug.get(slug),

  /** Staff who hold at least one shift at the given branch. */
  staffAtClinic: (clinicSlug: string): StaffMember[] =>
    requireCache().staff.filter((member) =>
      member.shifts.some((shift) => shift.clinicSlug === clinicSlug),
    ),

  /** Bookable providers rostered at the given branch. */
  providersAtClinic: (clinicSlug: string): StaffMember[] =>
    requireCache().providers.filter((member) =>
      member.shifts.some((shift) => shift.clinicSlug === clinicSlug),
    ),

  servicesAtClinic: (clinicSlug: string): Service[] => {
    const cached = requireCache();
    const clinic = cached.clinicBySlug.get(clinicSlug);
    if (!clinic) return [];
    return clinic.serviceSlugs
      .map((slug) => cached.serviceBySlug.get(slug))
      .filter((service): service is Service => Boolean(service));
  },
};
