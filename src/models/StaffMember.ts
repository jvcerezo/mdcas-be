import { Schema, model } from 'mongoose';

import type { StaffMember } from '../types';

const shiftSchema = new Schema(
  {
    clinicSlug: { type: String, required: true },
    day: { type: Number, required: true, min: 0, max: 6 },
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false },
);

const staffMemberSchema = new Schema<StaffMember>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    credentials: { type: String, default: '' },
    role: { type: String, required: true },
    specialty: { type: String, default: '' },
    bio: { type: String, default: '' },
    photo: { type: String },
    yearsExperience: { type: Number, default: 0 },
    languages: { type: [String], default: [] },
    serviceSlugs: { type: [String], default: [] },
    shifts: { type: [shiftSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export const StaffMemberModel = model<StaffMember>('StaffMember', staffMemberSchema);
