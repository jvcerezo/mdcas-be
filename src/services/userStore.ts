/**
 * Staff account storage and password verification.
 *
 * There is no public sign-up anywhere in this API. Accounts come from the seed
 * file or from an admin calling `POST /api/auth/users`. Patients never have
 * accounts — they book by phoning the branch, and a staff member enters the
 * appointment for them.
 */

import bcrypt from 'bcryptjs';

import { env } from '../config/env';
import { isDatabaseConnected } from '../db/connect';
import { StaffUserModel } from '../models/StaffUser';
import { staffUsers as seedStaffUsers } from '../data/seed.data';
import type { StaffUser, StaffUserRole } from '../types';

const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

interface StoredUser extends StaffUser {
  passwordHash: string;
}

/* -------------------------------------------------------------------------- */
/* In-memory backend                                                          */
/* -------------------------------------------------------------------------- */

let memoryUsers: StoredUser[] | null = null;

async function getMemoryUsers(): Promise<StoredUser[]> {
  if (memoryUsers) return memoryUsers;

  memoryUsers = await Promise.all(
    seedStaffUsers.map(async (user, index) => ({
      id: `mem-user-${index + 1}`,
      email: user.email.toLowerCase(),
      name: user.name,
      role: user.role,
      clinicSlugs: user.clinicSlugs,
      staffSlug: user.staffSlug,
      active: true,
      passwordHash: await hashPassword(env.staffDefaultPassword ?? user.password),
    })),
  );

  console.log(`[auth] in-memory staff accounts ready (${memoryUsers.length})`);
  return memoryUsers;
}

/* -------------------------------------------------------------------------- */
/* Public interface                                                           */
/* -------------------------------------------------------------------------- */

function stripHash(user: StoredUser): StaffUser {
  const { passwordHash, ...rest } = user;
  return rest;
}

export const users = {
  async findByEmail(email: string): Promise<StoredUser | null> {
    const normalized = email.trim().toLowerCase();

    if (!isDatabaseConnected()) {
      const all = await getMemoryUsers();
      return all.find((user) => user.email === normalized) ?? null;
    }

    // `passwordHash` is `select: false` on the schema, so ask for it explicitly.
    const doc = await StaffUserModel.findOne({ email: normalized })
      .select('+passwordHash')
      .lean();
    if (!doc) return null;

    return {
      id: String(doc._id),
      email: doc.email,
      name: doc.name,
      role: doc.role,
      clinicSlugs: doc.clinicSlugs ?? [],
      staffSlug: doc.staffSlug,
      active: doc.active,
      passwordHash: doc.passwordHash,
    };
  },

  async findById(id: string): Promise<StaffUser | null> {
    if (!isDatabaseConnected()) {
      const all = await getMemoryUsers();
      const found = all.find((user) => user.id === id);
      return found ? stripHash(found) : null;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
    const doc = await StaffUserModel.findById(id).lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      email: doc.email,
      name: doc.name,
      role: doc.role,
      clinicSlugs: doc.clinicSlugs ?? [],
      staffSlug: doc.staffSlug,
      active: doc.active,
    };
  },

  async list(): Promise<StaffUser[]> {
    if (!isDatabaseConnected()) {
      const all = await getMemoryUsers();
      return all.map(stripHash);
    }
    const docs = await StaffUserModel.find().lean();
    return docs.map((doc) => ({
      id: String(doc._id),
      email: doc.email,
      name: doc.name,
      role: doc.role,
      clinicSlugs: doc.clinicSlugs ?? [],
      staffSlug: doc.staffSlug,
      active: doc.active,
    }));
  },

  async create(input: {
    email: string;
    name: string;
    password: string;
    role: StaffUserRole;
    clinicSlugs: string[];
    staffSlug?: string;
  }): Promise<StaffUser> {
    const passwordHash = await hashPassword(input.password);
    const email = input.email.trim().toLowerCase();

    if (!isDatabaseConnected()) {
      const all = await getMemoryUsers();
      const created: StoredUser = {
        id: `mem-user-${all.length + 1}`,
        email,
        name: input.name,
        role: input.role,
        clinicSlugs: input.clinicSlugs,
        staffSlug: input.staffSlug,
        active: true,
        passwordHash,
      };
      all.push(created);
      return stripHash(created);
    }

    const doc = await StaffUserModel.create({
      email,
      name: input.name,
      passwordHash,
      role: input.role,
      clinicSlugs: input.clinicSlugs,
      staffSlug: input.staffSlug,
      active: true,
    });

    return {
      id: String(doc._id),
      email: doc.email,
      name: doc.name,
      role: doc.role,
      clinicSlugs: doc.clinicSlugs ?? [],
      staffSlug: doc.staffSlug,
      active: doc.active,
    };
  },

  async verifyPassword(user: StoredUser, plain: string): Promise<boolean> {
    return bcrypt.compare(plain, user.passwordHash);
  },

  async touchLastLogin(id: string): Promise<void> {
    if (!isDatabaseConnected()) return;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return;
    await StaffUserModel.findByIdAndUpdate(id, { lastLoginAt: new Date() });
  },

  toPublic: stripHash,
};

/** True when the account may read and write the given branch. */
export function canAccessClinic(user: StaffUser, clinicSlug: string): boolean {
  if (user.role === 'admin') return true;
  // An empty list means "all branches" — see the seed file.
  if (user.clinicSlugs.length === 0) return true;
  return user.clinicSlugs.includes(clinicSlug);
}
