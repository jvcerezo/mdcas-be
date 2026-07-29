/**
 * Shared content shapes for the MDCAS public API.
 *
 * These types are the contract between `src/data/seed.data.ts`, the Mongoose
 * models, and the JSON the API returns. The frontend mirrors them in
 * `mdcas-fe/src/types.ts` — keep the two in sync when you change anything here.
 */

/** 0 = Sunday ... 6 = Saturday, matching `Date.prototype.getDay()`. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type ServiceCategory =
  | 'General Dentistry'
  | 'Preventive Care'
  | 'Cosmetic Dentistry'
  | 'Orthodontics'
  | 'Oral Surgery'
  | 'Prosthodontics'
  | 'Pediatric Dentistry'
  | 'Diagnostics';

export type StaffRole =
  | 'Dentist'
  | 'Dental Hygienist'
  | 'Dental Assistant'
  | 'Front Desk';

/** A single opening block for one weekday. `closed` blocks omit the times. */
export interface OpeningHours {
  day: DayOfWeek;
  /** 24-hour "HH:mm". Absent when `closed` is true. */
  opens?: string;
  /** 24-hour "HH:mm". Absent when `closed` is true. */
  closes?: string;
  closed: boolean;
  /** Optional free-text qualifier, e.g. "By appointment only". */
  note?: string;
}

export interface Address {
  line1: string;
  line2?: string;
  barangay?: string;
  city: string;
  province: string;
  postalCode?: string;
  country: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Clinic {
  slug: string;
  name: string;
  /** Short branch label used in compact UI, e.g. "Bayog". */
  shortName: string;
  tagline: string;
  description: string;
  /** Marks the head office among the branches. */
  isMainBranch: boolean;
  yearEstablished: number;
  address: Address;
  coordinates?: GeoPoint;
  /** Google Maps link for the "Get directions" button. */
  mapUrl?: string;
  phone: string;
  mobile?: string;
  email: string;
  /** Tailwind-friendly accent used to colour-code the branch across the UI. */
  accentColor: 'teal' | 'indigo' | 'amber';
  heroImage?: string;
  hours: OpeningHours[];
  /** Slugs from `services`. Determines what the branch page lists. */
  serviceSlugs: string[];
  highlights: string[];
  /** Parking, PWD access, payment options, etc. */
  amenities: string[];
  /** Accepted HMO / insurance partners. */
  acceptedInsurers: string[];
}

export interface Service {
  slug: string;
  name: string;
  category: ServiceCategory;
  summary: string;
  description: string;
  /** Typical chair time in minutes. */
  durationMinutes: number;
  /** Indicative price range in PHP. `priceMax` omitted when it is a flat rate. */
  priceMin: number;
  priceMax?: number;
  /** Icon key resolved to a component in the frontend. */
  icon: string;
  featured: boolean;
  /** Patient-facing preparation or aftercare notes. */
  notes?: string[];
}

/** One recurring weekly block during which a staff member is at a branch. */
export interface StaffShift {
  clinicSlug: string;
  day: DayOfWeek;
  /** 24-hour "HH:mm". */
  start: string;
  /** 24-hour "HH:mm". */
  end: string;
}

export interface StaffMember {
  slug: string;
  name: string;
  /** Post-nominals shown after the name, e.g. "DMD, MSc". */
  credentials: string;
  role: StaffRole;
  /** Headline specialisation shown on cards. */
  specialty: string;
  bio: string;
  photo?: string;
  yearsExperience: number;
  languages: string[];
  /** Service slugs this person performs. Drives the schedule "by service" filter. */
  serviceSlugs: string[];
  /** Recurring weekly availability across branches. */
  shifts: StaffShift[];
}

/**
 * A flattened row of the centralized schedule: one staff member, at one
 * branch, on one weekday. Built by the API from `StaffMember.shifts`.
 */
export interface ScheduleEntry {
  id: string;
  day: DayOfWeek;
  dayName: string;
  start: string;
  end: string;
  clinic: {
    slug: string;
    name: string;
    shortName: string;
    accentColor: Clinic['accentColor'];
    city: string;
    phone: string;
  };
  staff: {
    slug: string;
    name: string;
    credentials: string;
    role: StaffRole;
    specialty: string;
    photo?: string;
  };
  serviceSlugs: string[];
}

/* ==========================================================================
 * Appointments & scheduling
 *
 * TIME REPRESENTATION — read this before touching anything below.
 *
 * All three branches are in Asia/Manila. Rather than juggle UTC offsets, an
 * appointment stores a plain calendar date ("YYYY-MM-DD") plus wall-clock
 * start/end times ("HH:mm"), all in clinic-local time. There is no timezone
 * conversion anywhere in this codebase, and therefore no class of bug where a
 * 9:00 AM booking renders as 1:00 AM. If the practice ever opens a branch in
 * another timezone, add an IANA zone to `Clinic` and convert at the edges.
 * ========================================================================== */

export type AppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no-show';

/** Statuses that occupy a slot. Cancelled and no-show free the block up again. */
export const BLOCKING_STATUSES: AppointmentStatus[] = ['booked', 'confirmed', 'completed'];

export interface Appointment {
  id: string;
  clinicSlug: string;
  /** The provider (dentist or hygienist) the patient is booked with. */
  staffSlug: string;
  serviceSlug: string;
  /** Clinic-local calendar date, "YYYY-MM-DD". */
  date: string;
  /** Clinic-local wall clock, "HH:mm". */
  start: string;
  end: string;
  patientName: string;
  patientContact: string;
  patientEmail?: string;
  /** Free-text clinical or scheduling note. Staff-only — never leaves the API for public callers. */
  notes?: string;
  status: AppointmentStatus;
  /** Email of the staff account that created the record. */
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * What the public may see about a slot: how busy it is. Nothing else.
 *
 * There is deliberately no field on `PublicSlot` that could carry a patient
 * name, contact number or procedure. The public payload is redacted by
 * construction — not by remembering to strip fields at the controller.
 *
 *   available   — plenty of open chairs
 *   limited     — one provider left free; call soon
 *   full        — every rostered provider is booked for this hour
 *   unavailable — inside opening hours, but nobody is rostered
 */
export type PublicSlotStatus = 'available' | 'limited' | 'full' | 'unavailable';

export interface PublicSlot {
  /** "HH:mm" start of the hourly block. */
  start: string;
  end: string;
  /** How many providers are rostered at the branch during this block. */
  capacity: number;
  /** How many of those are already taken. Never identifies who or why. */
  booked: number;
  status: PublicSlotStatus;
}

export interface PublicDay {
  /** "YYYY-MM-DD". */
  date: string;
  day: DayOfWeek;
  dayName: string;
  closed: boolean;
  /** Opening hours note for the day, e.g. "Closed for equipment maintenance". */
  note?: string;
  opens?: string;
  closes?: string;
  slots: PublicSlot[];
  /** Convenience counters so the month grid can render without walking slots. */
  totalSlots: number;
  availableSlots: number;
}

export interface PublicMonthSchedule {
  clinic: {
    slug: string;
    name: string;
    shortName: string;
    accentColor: Clinic['accentColor'];
    phone: string;
    mobile?: string;
    email: string;
  };
  /** "YYYY-MM". */
  month: string;
  year: number;
  /** 1-12. */
  monthNumber: number;
  days: PublicDay[];
}

/** A staff-facing appointment, enriched with the names the UI needs to render. */
export interface StaffAppointmentView extends Appointment {
  clinicName: string;
  staffName: string;
  serviceName: string;
  serviceDurationMinutes: number;
}

/* ==========================================================================
 * Staff accounts
 *
 * There is no public sign-up. Accounts are created by seeding or by an admin.
 * ========================================================================== */

export type StaffUserRole = 'admin' | 'dentist' | 'frontdesk';

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: StaffUserRole;
  /** Branches this account may read and write. Empty array = all branches. */
  clinicSlugs: string[];
  /** Links the login to a public `StaffMember` profile, when one exists. */
  staffSlug?: string;
  active: boolean;
}

/** The authenticated user as attached to `req.user`. */
export type AuthenticatedUser = Omit<StaffUser, 'id'> & { id: string };

/** The whole content set, as held in memory or seeded into MongoDB. */
export interface ContentSet {
  clinics: Clinic[];
  services: Service[];
  staff: StaffMember[];
}
