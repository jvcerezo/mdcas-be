/**
 * The PUBLIC schedule endpoint.
 *
 * Everything served from this file is visible to anyone on the internet. It
 * must never return a patient name, contact number, procedure or note. The
 * `PublicSlot` type has no field able to hold them, and `buildPublicMonthSchedule`
 * is the only thing that constructs them — so redaction is a property of the
 * types, not of anyone remembering to delete fields here.
 */

import type { Request, Response } from 'express';

import { content } from '../services/contentStore';
import { buildPublicMonthSchedule } from '../services/scheduleService';
import { asyncHandler, badRequest, notFoundError } from '../middleware/errors';
import { isValidMonthKey, monthKey, todayInClinicTimezone } from '../utils/time';

/**
 * GET /api/schedule/:clinicSlug?month=YYYY-MM
 *
 * The redacted month calendar for one branch: every day, every hourly block,
 * and how busy each block is. Nothing more.
 */
export const getPublicSchedule = asyncHandler(async (req: Request, res: Response) => {
  const clinicSlug = String(req.params.clinicSlug);

  if (!content.clinic(clinicSlug)) {
    throw notFoundError(`No branch with the slug "${clinicSlug}".`);
  }

  const month = req.query.month ? String(req.query.month) : monthKey(todayInClinicTimezone());
  if (!isValidMonthKey(month)) {
    throw badRequest(`Invalid month "${month}". Expected the format YYYY-MM.`);
  }

  const schedule = await buildPublicMonthSchedule(clinicSlug, month);
  if (!schedule) throw notFoundError(`No branch with the slug "${clinicSlug}".`);

  // The calendar changes whenever staff touch a booking, so it must not be
  // cached by a browser or CDN for long. A minute keeps repeat month-flipping
  // cheap without showing a stale "available" to someone about to phone in.
  res.set('Cache-Control', 'public, max-age=60');
  res.json(schedule);
});

/**
 * GET /api/schedule?month=YYYY-MM
 *
 * The same redacted view for all three branches at once, which is what the
 * centralized schedule page renders.
 */
export const getAllPublicSchedules = asyncHandler(async (req: Request, res: Response) => {
  const month = req.query.month ? String(req.query.month) : monthKey(todayInClinicTimezone());
  if (!isValidMonthKey(month)) {
    throw badRequest(`Invalid month "${month}". Expected the format YYYY-MM.`);
  }

  const schedules = await Promise.all(
    content.clinics().map((clinic) => buildPublicMonthSchedule(clinic.slug, month)),
  );

  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    month,
    clinics: schedules.filter(Boolean),
  });
});

/** The legend the public calendar renders. Kept server-side so the colours and
 *  wording stay consistent everywhere they appear. */
export const getScheduleLegend = (_req: Request, res: Response): void => {
  res.json([
    {
      status: 'available',
      label: 'Open',
      description: 'Chairs are free during this hour. Call the branch to book.',
    },
    {
      status: 'limited',
      label: 'Filling up',
      description: 'Partly booked. Some chairs remain — call soon.',
    },
    {
      status: 'full',
      label: 'Fully booked',
      description: 'Every dentist on duty is booked for this hour.',
    },
    {
      status: 'unavailable',
      label: 'No clinician on duty',
      description: 'The branch is open, but nobody is rostered for this hour.',
    },
    {
      status: 'closed',
      label: 'Closed',
      description: 'The branch is closed on this day.',
    },
  ]);
};
