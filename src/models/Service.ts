import { Schema, model } from 'mongoose';

import type { Service } from '../types';

const serviceSchema = new Schema<Service>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    summary: { type: String, default: '' },
    description: { type: String, default: '' },
    durationMinutes: { type: Number, required: true, min: 5 },
    priceMin: { type: Number, required: true, min: 0 },
    priceMax: { type: Number, min: 0 },
    icon: { type: String, default: 'tooth' },
    featured: { type: Boolean, default: false },
    notes: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export const ServiceModel = model<Service>('Service', serviceSchema);
