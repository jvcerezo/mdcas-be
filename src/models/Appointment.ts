import { Schema, model } from 'mongoose';

import type { AppointmentStatus } from '../types';

export interface AppointmentDocument {
  clinicSlug: string;
  staffSlug: string;
  serviceSlug: string;
  /** Clinic-local calendar date, "YYYY-MM-DD". Never a Date — see types.ts. */
  date: string;
  /** Clinic-local wall clock, "HH:mm". */
  start: string;
  end: string;
  patientName: string;
  patientContact: string;
  patientEmail?: string;
  notes?: string;
  status: AppointmentStatus;
  createdBy?: string;
}

const appointmentSchema = new Schema<AppointmentDocument>(
  {
    clinicSlug: { type: String, required: true },
    staffSlug: { type: String, required: true },
    serviceSlug: { type: String, required: true },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be formatted YYYY-MM-DD'],
    },
    start: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'start must be formatted HH:mm'],
    },
    end: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'end must be formatted HH:mm'],
    },
    patientName: { type: String, required: true, trim: true },
    patientContact: { type: String, required: true, trim: true },
    patientEmail: { type: String, trim: true, lowercase: true },
    notes: { type: String },
    status: {
      type: String,
      required: true,
      enum: ['booked', 'confirmed', 'completed', 'cancelled', 'no-show'],
      default: 'booked',
    },
    createdBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);

// The public month calendar and the staff day view both query by branch and
// date range, so this compound index carries almost every read.
appointmentSchema.index({ clinicSlug: 1, date: 1 });
// Double-booking checks look up one provider's day.
appointmentSchema.index({ staffSlug: 1, date: 1 });

export const AppointmentModel = model<AppointmentDocument>('Appointment', appointmentSchema);
