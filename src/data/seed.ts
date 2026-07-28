/**
 * Seeds MongoDB from `seed.data.ts`.
 *
 *   npm run seed                     content + staff accounts + demo bookings
 *   npm run seed -- --no-appointments   skip the demo bookings
 *   npm run seed -- --keep-appointments preserve existing bookings
 *   npm run seed -- --users-only        refresh staff accounts only
 *
 * Content collections (clinics, services, staff) are always replaced — they
 * are managed in the file, not in the database. Appointments are real data, so
 * the script tells you before it clears them.
 */

import { env } from '../config/env';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../db/connect';
import { ClinicModel } from '../models/Clinic';
import { ServiceModel } from '../models/Service';
import { StaffMemberModel } from '../models/StaffMember';
import { StaffUserModel } from '../models/StaffUser';
import { AppointmentModel } from '../models/Appointment';
import { hashPassword } from '../services/userStore';
import { buildSampleAppointments } from './sampleAppointments';
import { seedContent, staffUsers } from './seed.data';
import { validateSeedData } from './validate';

async function seed(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const skipAppointments = args.has('--no-appointments');
  const keepAppointments = args.has('--keep-appointments');
  const usersOnly = args.has('--users-only');

  console.log('\nMDCAS — seeding\n');

  const problems = validateSeedData();
  if (problems.length > 0) {
    console.warn('Problems found in seed.data.ts:');
    for (const problem of problems) console.warn(`  - ${problem}`);
    console.warn('');
  } else {
    console.log('  seed.data.ts is internally consistent');
  }

  await connectDatabase();

  if (!isDatabaseConnected()) {
    console.error(
      '\n  MONGO_URI is not set, so there is no database to seed.\n' +
        '  The API already reads seed.data.ts directly in that mode — just run `npm run dev`.\n' +
        '  To seed a real database, set MONGO_URI in .env and run this again.\n',
    );
    process.exitCode = 1;
    return;
  }

  if (!usersOnly) {
    await Promise.all([
      ClinicModel.deleteMany({}),
      ServiceModel.deleteMany({}),
      StaffMemberModel.deleteMany({}),
    ]);

    await ClinicModel.insertMany(seedContent.clinics);
    await ServiceModel.insertMany(seedContent.services);
    await StaffMemberModel.insertMany(seedContent.staff);

    console.log(`  clinics:  ${seedContent.clinics.length}`);
    console.log(`  services: ${seedContent.services.length}`);
    console.log(`  staff:    ${seedContent.staff.length}`);
  }

  // Accounts are upserted rather than replaced so that passwords an admin has
  // already changed are not silently reset on every re-seed.
  let created = 0;
  let skipped = 0;
  for (const user of staffUsers) {
    const email = user.email.toLowerCase();
    const existing = await StaffUserModel.findOne({ email });
    if (existing) {
      skipped += 1;
      continue;
    }
    await StaffUserModel.create({
      email,
      name: user.name,
      passwordHash: await hashPassword(env.staffDefaultPassword ?? user.password),
      role: user.role,
      clinicSlugs: user.clinicSlugs,
      staffSlug: user.staffSlug,
      active: true,
    });
    created += 1;
  }
  console.log(`  accounts: ${created} created, ${skipped} already existed`);

  if (!usersOnly && !skipAppointments) {
    const existingCount = await AppointmentModel.countDocuments();

    if (keepAppointments) {
      console.log(`  bookings: kept ${existingCount} existing`);
    } else {
      if (existingCount > 0) {
        console.log(`  bookings: replacing ${existingCount} existing`);
      }
      await AppointmentModel.deleteMany({});
      const samples = buildSampleAppointments();
      await AppointmentModel.insertMany(samples);
      console.log(`  bookings: ${samples.length} demo appointments inserted`);
    }
  }

  const defaultPassword = env.staffDefaultPassword ?? staffUsers[0]?.password;
  console.log('\n  Sign in at /staff/login with:');
  console.log(`    ${staffUsers[0]?.email}  /  ${defaultPassword}`);
  console.log('\n  ⚠  Change every seeded password before going live.\n');
}

seed()
  .catch((error) => {
    console.error('\n  Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
