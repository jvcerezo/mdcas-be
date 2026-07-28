import type { Request, Response } from 'express';

import { organization } from '../data/seed.data';
import { content } from '../services/contentStore';
import { buildWeeklyRoster } from '../services/scheduleService';
import type { DayOfWeek } from '../types';
import { asyncHandler, notFoundError } from '../middleware/errors';

export const getOrganization = (_req: Request, res: Response): void => {
  res.json(organization);
};

export const listClinics = (_req: Request, res: Response): void => {
  res.json(content.clinics());
};

/**
 * A branch with everything its page needs — services, staff and the weekly
 * roster — in one round trip, so the clinic page renders without waterfalls.
 */
export const getClinic = (req: Request, res: Response): void => {
  const clinic = content.clinic(String(req.params.slug));
  if (!clinic) throw notFoundError(`No branch with the slug "${req.params.slug}".`);

  res.json({
    ...clinic,
    services: content.servicesAtClinic(clinic.slug),
    staff: content.staffAtClinic(clinic.slug),
    roster: buildWeeklyRoster({ clinicSlug: clinic.slug }),
  });
};

export const listServices = (req: Request, res: Response): void => {
  const { clinic: clinicSlug, category, featured } = req.query;

  let services = clinicSlug ? content.servicesAtClinic(String(clinicSlug)) : content.services();

  if (category) {
    services = services.filter((service) => service.category === String(category));
  }
  if (featured === 'true') {
    services = services.filter((service) => service.featured);
  }

  res.json(services);
};

export const getService = (req: Request, res: Response): void => {
  const service = content.service(String(req.params.slug));
  if (!service) throw notFoundError(`No service with the slug "${req.params.slug}".`);

  // Which branches offer it, and who performs it — drives the service page.
  const clinics = content
    .clinics()
    .filter((clinic) => clinic.serviceSlugs.includes(service.slug));
  const staff = content
    .staff()
    .filter((member) => member.serviceSlugs.includes(service.slug));

  res.json({ ...service, clinics, staff });
};

export const listStaff = (req: Request, res: Response): void => {
  const { clinic: clinicSlug, role, service: serviceSlug } = req.query;

  let staff = clinicSlug ? content.staffAtClinic(String(clinicSlug)) : content.staff();

  if (role) {
    staff = staff.filter((member) => member.role === String(role));
  }
  if (serviceSlug) {
    staff = staff.filter((member) => member.serviceSlugs.includes(String(serviceSlug)));
  }

  res.json(staff);
};

export const getStaffMember = (req: Request, res: Response): void => {
  const member = content.staffMember(String(req.params.slug));
  if (!member) throw notFoundError(`No staff member with the slug "${req.params.slug}".`);

  res.json({
    ...member,
    services: member.serviceSlugs
      .map((slug) => content.service(slug))
      .filter(Boolean),
    roster: buildWeeklyRoster({ staffSlug: member.slug }),
  });
};

/** The public "who works where, when" view. Contains no patient data. */
export const getRoster = asyncHandler(async (req: Request, res: Response) => {
  const { clinic, staff, service, day } = req.query;

  const parsedDay =
    day !== undefined && day !== '' ? (Number(day) as DayOfWeek) : undefined;

  res.json(
    buildWeeklyRoster({
      clinicSlug: clinic ? String(clinic) : undefined,
      staffSlug: staff ? String(staff) : undefined,
      serviceSlug: service ? String(service) : undefined,
      day: parsedDay,
    }),
  );
});
