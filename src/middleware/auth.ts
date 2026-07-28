import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { users } from '../services/userStore';
import type { StaffUser, StaffUserRole } from '../types';
import { forbidden, unauthorized } from './errors';

export interface AuthenticatedRequest extends Request {
  user?: StaffUser;
}

interface TokenPayload {
  sub: string;
  email: string;
  role: StaffUserRole;
}

export function signToken(user: StaffUser): string {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Requires a valid staff token. The account is re-read on every request so a
 * deactivated or deleted user loses access immediately, rather than staying
 * live until their token happens to expire.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) throw unauthorized('Sign in to view the staff schedule.');

    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    } catch {
      throw unauthorized('Your session has expired. Please sign in again.');
    }

    const user = await users.findById(payload.sub);
    if (!user) throw unauthorized('This account no longer exists.');
    if (!user.active) throw forbidden('This account has been deactivated.');

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/** Restricts a route to specific staff roles. Use after `requireAuth`. */
export function requireRole(...roles: StaffUserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(forbidden(`This action requires the ${roles.join(' or ')} role.`));
      return;
    }
    next();
  };
}
