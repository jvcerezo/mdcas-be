/**
 * STAFF-ONLY appointment CRUD.
 *
 * Every route in this file sits behind `requireAuth`. This is the only place
 * appointments are created or changed — patients have no accounts and no write
 * path. They phone the branch, and a staff member enters the booking here.
 */

import type { Response } from 'express';

import { appointments } from '../services/appointmentStore';
import { content } from '../services/contentStore';
import { toStaffViews, validateAppointment } from '../services/scheduleService';
import { canAccessClinic } from '../services/userStore';
import type { AuthenticatedRequest } from '../middleware/auth';
import {
  asyncHandler,
  badRequest,
  conflict,
  forbidden,
  notFoundError,
  unauthorized,
} from '../middleware/errors';
import type { Appointment, AppointmentStatus } from '../types';
import { addDays, isValidDateString, isValidTimeString, toMinutes, todayInClinicTimezone } from '../utils/time';

const VALID_STATUSES: AppointmentStatus[] = [
  'booked',
  'confirmed',
  'completed',
  'cancelled',
  'no-show',
];

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) throw unauthorized();
  return req.user;
}

/** Rejects a write to a branch the account is not assigned to. */
function assertClinicAccess(req: AuthenticatedRequest, clinicSlug: string): void {
  const user = requireUser(req);
  if (!canAccessClinic(user, clinicSlug)) {
    throw forbidden(`Your account does not cover the ${clinicSlug} branch.`);
  }
}

interface AppointmentBody {
  clinicSlug?: unknown;
  staffSlug?: unknown;
  serviceSlug?: unknown;
  date?: unknown;
  start?: unknown;
  end?: unknown;
  patientName?: unknown;
  patientContact?: unknown;
  patientEmail?: unknown;
  notes?: unknown;
  status?: unknown;
}

function readString(value: unknown, field: string, required: boolean): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`"${field}" is required.`);
    return undefined;
  }
  if (typeof value !== 'string') throw badRequest(`"${field}" must be a string.`);
  return value.trim();
}

/** Validates and normalises a full appointment payload. */
function parseBody(body: AppointmentBody, partial: boolean) {
  const required = !partial;

  const clinicSlug = readString(body.clinicSlug, 'clinicSlug', required);
  const staffSlug = readString(body.staffSlug, 'staffSlug', required);
  const serviceSlug = readString(body.serviceSlug, 'serviceSlug', required);
  const date = readString(body.date, 'date', required);
  const start = readString(body.start, 'start', required);
  const end = readString(body.end, 'end', required);
  const patientName = readString(body.patientName, 'patientName', required);
  const patientContact = readString(body.patientContact, 'patientContact', required);
  const patientEmail = readString(body.patientEmail, 'patientEmail', false);
  const notes = readString(body.notes, 'notes', false);
  const status = readString(body.status, 'status', false);

  if (date !== undefined && !isValidDateString(date)) {
    throw badRequest(`"date" must be a real calendar date formatted YYYY-MM-DD.`);
  }
  for (const [field, value] of [
    ['start', start],
    ['end', end],
  ] as const) {
    if (value !== undefined && !isValidTimeString(value)) {
      throw badRequest(`"${field}" must be a 24-hour time formatted HH:mm.`);
    }
  }
  if (start !== undefined && end !== undefined && toMinutes(end) <= toMinutes(start)) {
    throw badRequest('The end time must be after the start time.');
  }
  if (status !== undefined && !VALID_STATUSES.includes(status as AppointmentStatus)) {
    throw badRequest(`"status" must be one of: ${VALID_STATUSES.join(', ')}.`);
  }
  if (patientName !== undefined && patientName.length < 2) {
    throw badRequest('"patientName" must be at least 2 characters.');
  }

  return {
    clinicSlug,
    staffSlug,
    serviceSlug,
    date,
    start,
    end,
    patientName,
    patientContact,
    patientEmail,
    notes,
    status: status as AppointmentStatus | undefined,
  };
}

/**
 * GET /api/staff/appointments
 *
 * Filters: clinic, staff, from, to, status, and `mine=true` for a dentist's
 * own list. Defaults to the current week when no range is given.
 */
export const listAppointments = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = requireUser(req);
    const today = todayInClinicTimezone();

    const from = req.query.from ? String(req.query.from) : today;
    const to = req.query.to ? String(req.query.to) : addDays(today, 6);

    for (const [field, value] of [
      ['from', from],
      ['to', to],
    ] as const) {
      if (!isValidDateString(value)) {
        throw badRequest(`"${field}" must be a real calendar date formatted YYYY-MM-DD.`);
      }
    }
    if (to < from) throw badRequest('"to" must not be earlier than "from".');

    const requestedClinic = req.query.clinic ? String(req.query.clinic) : undefined;
    if (requestedClinic) assertClinicAccess(req, requestedClinic);

    const statusFilter = req.query.status ? String(req.query.status) : undefined;
    if (statusFilter && !VALID_STATUSES.includes(statusFilter as AppointmentStatus)) {
      throw badRequest(`"status" must be one of: ${VALID_STATUSES.join(', ')}.`);
    }

    // `mine=true` gives a dentist their own chair list — the "doctor schedule".
    let staffSlug = req.query.staff ? String(req.query.staff) : undefined;
    if (req.query.mine === 'true') {
      if (!user.staffSlug) {
        throw badRequest('This account is not linked to a staff profile.');
      }
      staffSlug = user.staffSlug;
    }

    let results = await appointments.find({
      clinicSlug: requestedClinic,
      staffSlug,
      from,
      to,
      statuses: statusFilter ? [statusFilter as AppointmentStatus] : undefined,
    });

    // Without an explicit branch filter, narrow to the branches this account
    // covers so a Junction Rd. front desk never sees F.O. Santos' patients.
    if (!requestedClinic) {
      results = results.filter((item) => canAccessClinic(user, item.clinicSlug));
    }

    res.json({ from, to, count: results.length, appointments: toStaffViews(results) });
  },
);

/** GET /api/staff/appointments/:id */
export const getAppointment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const appointment = await appointments.findById(String(req.params.id));
    if (!appointment) throw notFoundError('No appointment with that id.');
    assertClinicAccess(req, appointment.clinicSlug);

    res.json(toStaffViews([appointment])[0]);
  },
);

/** POST /api/staff/appointments */
export const createAppointment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = requireUser(req);
    const body = parseBody(req.body as AppointmentBody, false);

    // parseBody with partial=false guarantees these are present.
    const draft = {
      clinicSlug: body.clinicSlug!,
      staffSlug: body.staffSlug!,
      serviceSlug: body.serviceSlug!,
      date: body.date!,
      start: body.start!,
      end: body.end!,
      patientName: body.patientName!,
      patientContact: body.patientContact!,
      patientEmail: body.patientEmail,
      notes: body.notes,
      status: body.status ?? ('booked' as AppointmentStatus),
    };

    assertClinicAccess(req, draft.clinicSlug);

    const { errors, warnings } = await validateAppointment(draft);
    if (errors.length > 0) throw conflict(errors[0] ?? 'The booking could not be saved.', { errors });

    const created = await appointments.create({ ...draft, createdBy: user.email });

    res.status(201).json({
      appointment: toStaffViews([created])[0],
      warnings,
    });
  },
);

/** PATCH /api/staff/appointments/:id */
export const updateAppointment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id);
    const existing = await appointments.findById(id);
    if (!existing) throw notFoundError('No appointment with that id.');

    assertClinicAccess(req, existing.clinicSlug);

    const body = parseBody(req.body as AppointmentBody, true);

    // Drop undefined keys so a PATCH never blanks a field it did not mention.
    const patch: Partial<Appointment> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) patch[key as keyof Appointment] = value as never;
    }

    if (patch.clinicSlug) assertClinicAccess(req, patch.clinicSlug);

    const merged = { ...existing, ...patch };
    const { errors, warnings } = await validateAppointment(merged, id);
    if (errors.length > 0) throw conflict(errors[0] ?? 'The booking could not be saved.', { errors });

    const updated = await appointments.update(id, patch);
    if (!updated) throw notFoundError('No appointment with that id.');

    res.json({ appointment: toStaffViews([updated])[0], warnings });
  },
);

/**
 * DELETE /api/staff/appointments/:id
 *
 * Cancels by default, which keeps the record for reporting and no-show
 * tracking. `?hard=true` removes it outright and is restricted to admins.
 */
export const deleteAppointment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = requireUser(req);
    const id = String(req.params.id);

    const existing = await appointments.findById(id);
    if (!existing) throw notFoundError('No appointment with that id.');
    assertClinicAccess(req, existing.clinicSlug);

    if (req.query.hard === 'true') {
      if (user.role !== 'admin') {
        throw forbidden('Only an administrator can permanently delete an appointment.');
      }
      await appointments.remove(id);
      res.status(204).send();
      return;
    }

    const cancelled = await appointments.update(id, { status: 'cancelled' });
    res.json({ appointment: toStaffViews([cancelled!])[0] });
  },
);

/**
 * GET /api/staff/options
 *
 * Everything the booking form needs to populate its dropdowns, scoped to the
 * branches this account covers.
 */
export const getBookingOptions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = requireUser(req);

    const clinics = content
      .clinics()
      .filter((clinic) => canAccessClinic(user, clinic.slug))
      .map((clinic) => ({
        slug: clinic.slug,
        name: clinic.name,
        shortName: clinic.shortName,
        accentColor: clinic.accentColor,
        hours: clinic.hours,
        serviceSlugs: clinic.serviceSlugs,
      }));

    const providers = content.providers().map((member) => ({
      slug: member.slug,
      name: member.name,
      credentials: member.credentials,
      role: member.role,
      specialty: member.specialty,
      serviceSlugs: member.serviceSlugs,
      shifts: member.shifts,
    }));

    res.json({
      clinics,
      providers,
      services: content.services().map((service) => ({
        slug: service.slug,
        name: service.name,
        category: service.category,
        durationMinutes: service.durationMinutes,
      })),
      statuses: VALID_STATUSES,
    });
  },
);
