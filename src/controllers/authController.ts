/**
 * Staff authentication.
 *
 * Login only — there is deliberately no registration endpoint. New accounts
 * are created by seeding or by an existing admin via `POST /api/auth/users`.
 */

import type { Request, Response } from 'express';

import { signToken, type AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, badRequest, conflict, unauthorized } from '../middleware/errors';
import { content } from '../services/contentStore';
import { users } from '../services/userStore';
import type { StaffUserRole } from '../types';

const VALID_ROLES: StaffUserRole[] = ['admin', 'dentist', 'frontdesk'];

/** POST /api/auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: unknown; password?: unknown };

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw badRequest('Email and password are required.');
  }

  const user = await users.findByEmail(email);

  // Same message whether the account is missing or the password is wrong, so
  // the endpoint cannot be used to discover which staff emails exist.
  const invalid = unauthorized('Incorrect email or password.');
  if (!user) throw invalid;

  const passwordMatches = await users.verifyPassword(user, password);
  if (!passwordMatches) throw invalid;

  if (!user.active) throw unauthorized('This account has been deactivated.');

  const publicUser = users.toPublic(user);
  await users.touchLastLogin(user.id);

  res.json({
    token: signToken(publicUser),
    user: {
      ...publicUser,
      staffProfile: publicUser.staffSlug ? content.staffMember(publicUser.staffSlug) : undefined,
    },
  });
});

/** GET /api/auth/me — confirms a stored token is still good on app boot. */
export const getCurrentUser = (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user;
  if (!user) throw unauthorized();

  res.json({
    ...user,
    staffProfile: user.staffSlug ? content.staffMember(user.staffSlug) : undefined,
  });
};

/** GET /api/auth/users — admin only. */
export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await users.list());
});

/** POST /api/auth/users — admin only. The only way to add staff at runtime. */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, name, password, role, clinicSlugs, staffSlug } = req.body as Record<
    string,
    unknown
  >;

  if (typeof email !== 'string' || !email.includes('@')) {
    throw badRequest('A valid email is required.');
  }
  if (typeof name !== 'string' || name.trim().length < 2) {
    throw badRequest('A name of at least 2 characters is required.');
  }
  if (typeof password !== 'string' || password.length < 10) {
    throw badRequest('The password must be at least 10 characters.');
  }
  if (typeof role !== 'string' || !VALID_ROLES.includes(role as StaffUserRole)) {
    throw badRequest(`"role" must be one of: ${VALID_ROLES.join(', ')}.`);
  }

  const branches = Array.isArray(clinicSlugs) ? clinicSlugs.map(String) : [];
  for (const slug of branches) {
    if (!content.clinic(slug)) throw badRequest(`Unknown branch "${slug}".`);
  }

  if (staffSlug !== undefined && staffSlug !== null && staffSlug !== '') {
    if (typeof staffSlug !== 'string' || !content.staffMember(staffSlug)) {
      throw badRequest(`Unknown staff profile "${String(staffSlug)}".`);
    }
  }

  const existing = await users.findByEmail(email);
  if (existing) throw conflict('An account with that email already exists.');

  const created = await users.create({
    email,
    name: name.trim(),
    password,
    role: role as StaffUserRole,
    clinicSlugs: branches,
    staffSlug: typeof staffSlug === 'string' && staffSlug ? staffSlug : undefined,
  });

  res.status(201).json(created);
});
