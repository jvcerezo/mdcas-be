import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as auth from '../controllers/authController';
import * as appointments from '../controllers/appointmentController';
import * as contentRoutes from '../controllers/contentController';
import * as schedule from '../controllers/scheduleController';
import { requireAuth, requireRole } from '../middleware/auth';

export const router = Router();

/** Slows down credential stuffing without inconveniencing real staff. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
});

/* ------------------------------------------------------------------ */
/* Public — no authentication. Never returns patient data.            */
/* ------------------------------------------------------------------ */

router.get('/organization', contentRoutes.getOrganization);

router.get('/clinics', contentRoutes.listClinics);
router.get('/clinics/:slug', contentRoutes.getClinic);

router.get('/services', contentRoutes.listServices);
router.get('/services/:slug', contentRoutes.getService);

router.get('/staff', contentRoutes.listStaff);
router.get('/staff/:slug', contentRoutes.getStaffMember);

/** Who works where, by weekday. */
router.get('/roster', contentRoutes.getRoster);

/** The redacted month calendar — busy-ness only, no patient details. */
router.get('/schedule', schedule.getAllPublicSchedules);
router.get('/schedule/legend', schedule.getScheduleLegend);
router.get('/schedule/:clinicSlug', schedule.getPublicSchedule);

/* ------------------------------------------------------------------ */
/* Authentication                                                     */
/* ------------------------------------------------------------------ */

router.post('/auth/login', loginLimiter, auth.login);
router.get('/auth/me', requireAuth, auth.getCurrentUser);
router.get('/auth/users', requireAuth, requireRole('admin'), auth.listUsers);
router.post('/auth/users', requireAuth, requireRole('admin'), auth.createUser);

/* ------------------------------------------------------------------ */
/* Staff-only — full appointment detail and CRUD                      */
/*                                                                    */
/* `requireAuth` guards the whole prefix, so a route added below can  */
/* never accidentally ship unauthenticated.                           */
/* ------------------------------------------------------------------ */

const staffRouter = Router();
staffRouter.use(requireAuth);

staffRouter.get('/options', appointments.getBookingOptions);
staffRouter.get('/appointments', appointments.listAppointments);
staffRouter.post('/appointments', appointments.createAppointment);
staffRouter.get('/appointments/:id', appointments.getAppointment);
staffRouter.patch('/appointments/:id', appointments.updateAppointment);
staffRouter.delete('/appointments/:id', appointments.deleteAppointment);

router.use('/staff-portal', staffRouter);
