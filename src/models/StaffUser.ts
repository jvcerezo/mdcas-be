import { Schema, model } from 'mongoose';

import type { StaffUserRole } from '../types';

export interface StaffUserDocument {
  email: string;
  name: string;
  passwordHash: string;
  role: StaffUserRole;
  clinicSlugs: string[];
  staffSlug?: string;
  active: boolean;
  lastLoginAt?: Date;
}

const staffUserSchema = new Schema<StaffUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true },
    // `select: false` keeps the hash out of every incidental query. It has to
    // be asked for explicitly, which happens only during login.
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'dentist', 'frontdesk'],
      default: 'frontdesk',
    },
    /** Empty means every branch. */
    clinicSlugs: { type: [String], default: [] },
    staffSlug: { type: String },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

export const StaffUserModel = model<StaffUserDocument>('StaffUser', staffUserSchema);
