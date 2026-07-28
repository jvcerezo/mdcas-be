/**
 * Persistence for appointments.
 *
 * Two backends behind one interface: MongoDB when it is configured, and an
 * in-memory array when it is not. The in-memory mode exists so the whole site
 * runs with `npm run dev` and nothing else installed — it is refused in
 * production (see `config/env.ts`) because writes do not survive a restart.
 */

import { isDatabaseConnected } from '../db/connect';
import { AppointmentModel } from '../models/Appointment';
import { buildSampleAppointments } from '../data/sampleAppointments';
import type { Appointment, AppointmentStatus } from '../types';

export interface AppointmentQuery {
  clinicSlug?: string;
  staffSlug?: string;
  /** Inclusive "YYYY-MM-DD". */
  from?: string;
  /** Inclusive "YYYY-MM-DD". */
  to?: string;
  statuses?: AppointmentStatus[];
}

export type AppointmentInput = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>;

/* -------------------------------------------------------------------------- */
/* In-memory backend                                                          */
/* -------------------------------------------------------------------------- */

let memoryStore: Appointment[] = [];
let memoryCounter = 0;
let memoryInitialised = false;

function initMemoryStore(): void {
  if (memoryInitialised) return;
  memoryStore = buildSampleAppointments();
  memoryCounter = memoryStore.length;
  memoryInitialised = true;
  console.log(`[appointments] in-memory store seeded with ${memoryStore.length} demo bookings`);
}

function matchesQuery(appointment: Appointment, query: AppointmentQuery): boolean {
  if (query.clinicSlug && appointment.clinicSlug !== query.clinicSlug) return false;
  if (query.staffSlug && appointment.staffSlug !== query.staffSlug) return false;
  // Date strings are zero-padded ISO, so lexical comparison is chronological.
  if (query.from && appointment.date < query.from) return false;
  if (query.to && appointment.date > query.to) return false;
  if (query.statuses && !query.statuses.includes(appointment.status)) return false;
  return true;
}

function sortAppointments(appointments: Appointment[]): Appointment[] {
  return appointments.sort(
    (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
  );
}

/* -------------------------------------------------------------------------- */
/* Mongo mapping                                                              */
/* -------------------------------------------------------------------------- */

function toAppointment(doc: Record<string, unknown>): Appointment {
  const { _id, __v, createdAt, updatedAt, ...rest } = doc;
  return {
    ...(rest as Omit<Appointment, 'id'>),
    id: String(_id),
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : undefined,
    updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : undefined,
  };
}

function toMongoFilter(query: AppointmentQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (query.clinicSlug) filter.clinicSlug = query.clinicSlug;
  if (query.staffSlug) filter.staffSlug = query.staffSlug;
  if (query.statuses) filter.status = { $in: query.statuses };
  if (query.from || query.to) {
    const range: Record<string, string> = {};
    if (query.from) range.$gte = query.from;
    if (query.to) range.$lte = query.to;
    filter.date = range;
  }
  return filter;
}

/* -------------------------------------------------------------------------- */
/* Public interface                                                           */
/* -------------------------------------------------------------------------- */

export const appointments = {
  async find(query: AppointmentQuery = {}): Promise<Appointment[]> {
    if (!isDatabaseConnected()) {
      initMemoryStore();
      return sortAppointments(memoryStore.filter((item) => matchesQuery(item, query)));
    }
    const docs = await AppointmentModel.find(toMongoFilter(query))
      .sort({ date: 1, start: 1 })
      .lean();
    return docs.map((doc) => toAppointment(doc as Record<string, unknown>));
  },

  async findById(id: string): Promise<Appointment | null> {
    if (!isDatabaseConnected()) {
      initMemoryStore();
      return memoryStore.find((item) => item.id === id) ?? null;
    }
    // A malformed id would make Mongoose throw a CastError, which would surface
    // as a 500. A bad id from a URL is a 404.
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
    const doc = await AppointmentModel.findById(id).lean();
    return doc ? toAppointment(doc as Record<string, unknown>) : null;
  },

  async create(input: AppointmentInput): Promise<Appointment> {
    if (!isDatabaseConnected()) {
      initMemoryStore();
      memoryCounter += 1;
      const now = new Date().toISOString();
      const created: Appointment = {
        ...input,
        id: `mem-${String(memoryCounter).padStart(5, '0')}`,
        createdAt: now,
        updatedAt: now,
      };
      memoryStore.push(created);
      return created;
    }
    const doc = await AppointmentModel.create(input);
    return toAppointment(doc.toObject() as unknown as Record<string, unknown>);
  },

  async update(id: string, patch: Partial<AppointmentInput>): Promise<Appointment | null> {
    if (!isDatabaseConnected()) {
      initMemoryStore();
      const index = memoryStore.findIndex((item) => item.id === id);
      const existing = memoryStore[index];
      if (index === -1 || !existing) return null;
      const updated: Appointment = {
        ...existing,
        ...patch,
        id: existing.id,
        updatedAt: new Date().toISOString(),
      };
      memoryStore[index] = updated;
      return updated;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
    const doc = await AppointmentModel.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    }).lean();
    return doc ? toAppointment(doc as Record<string, unknown>) : null;
  },

  async remove(id: string): Promise<boolean> {
    if (!isDatabaseConnected()) {
      initMemoryStore();
      const index = memoryStore.findIndex((item) => item.id === id);
      if (index === -1) return false;
      memoryStore.splice(index, 1);
      return true;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return false;
    const result = await AppointmentModel.findByIdAndDelete(id);
    return Boolean(result);
  },

  /** Replaces every appointment. Used by the seed script only. */
  async replaceAll(items: AppointmentInput[]): Promise<number> {
    if (!isDatabaseConnected()) {
      memoryStore = items.map((item, index) => ({
        ...item,
        id: `mem-${String(index + 1).padStart(5, '0')}`,
      }));
      memoryCounter = memoryStore.length;
      memoryInitialised = true;
      return memoryStore.length;
    }
    await AppointmentModel.deleteMany({});
    if (items.length === 0) return 0;
    const created = await AppointmentModel.insertMany(items);
    return created.length;
  },
};
