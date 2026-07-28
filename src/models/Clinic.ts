import { Schema, model } from 'mongoose';

import type { Clinic } from '../types';

const openingHoursSchema = new Schema(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    opens: { type: String },
    closes: { type: String },
    closed: { type: Boolean, default: false },
    note: { type: String },
  },
  { _id: false },
);

const addressSchema = new Schema(
  {
    line1: { type: String, required: true },
    line2: { type: String },
    barangay: { type: String },
    city: { type: String, required: true },
    province: { type: String, required: true },
    postalCode: { type: String },
    country: { type: String, required: true, default: 'Philippines' },
  },
  { _id: false },
);

const clinicSchema = new Schema<Clinic>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    isMainBranch: { type: Boolean, default: false },
    yearEstablished: { type: Number },
    address: { type: addressSchema, required: true },
    coordinates: {
      type: new Schema({ lat: Number, lng: Number }, { _id: false }),
    },
    mapUrl: { type: String },
    phone: { type: String, required: true },
    mobile: { type: String },
    email: { type: String, required: true },
    accentColor: { type: String, enum: ['teal', 'indigo', 'amber'], default: 'teal' },
    heroImage: { type: String },
    hours: { type: [openingHoursSchema], default: [] },
    serviceSlugs: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    amenities: { type: [String], default: [] },
    acceptedInsurers: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export const ClinicModel = model<Clinic>('Clinic', clinicSchema);
