/**
 * ============================================================================
 *  CLINIC CONTENT
 * ============================================================================
 *
 * STATUS OF THIS DATA
 *   REAL         — the three branch names and their locations in Los Baños.
 *   PLACEHOLDER  — street addresses, phone numbers, emails, opening hours,
 *                  staff, services and prices. Replace before going live.
 *
 * This is the SINGLE source of truth for every clinic, service and staff
 * member on the site. Nothing else in either repo hardcodes this content.
 *
 * To go live with real data you only ever edit this one file, then:
 *   - with MongoDB:    npm run seed
 *   - without MongoDB: just restart the API (it reads this file directly)
 *
 * Rules to keep the site consistent:
 *   1. Every `serviceSlug` in a clinic or staff member must exist in `services`.
 *   2. Every `clinicSlug` in a staff shift must exist in `clinics`.
 *   3. A staff shift should fall inside that branch's opening hours.
 *   4. Slugs are URL segments — lowercase, hyphenated, and permanent.
 * `npm run dev` validates 1–3 on boot and prints any mismatch.
 *
 * Prices are indicative ranges in PHP. Times are 24-hour "HH:mm".
 * Days: 0 = Sunday ... 6 = Saturday.
 */

import type { ContentSet } from '../types';

const services: ContentSet['services'] = [
  {
    slug: 'dental-consultation',
    name: 'Dental Consultation',
    category: 'General Dentistry',
    summary: 'A full oral examination with a written treatment plan and cost estimate.',
    description:
      'Your first visit starts here. The dentist reviews your medical history, examines your teeth, gums and bite, and walks you through what treatment (if any) you need. You leave with a written plan and an itemised estimate before any work begins.',
    durationMinutes: 30,
    priceMin: 500,
    icon: 'clipboard',
    featured: true,
    notes: [
      'Bring any previous x-rays or dental records you have.',
      'The consultation fee is waived if you proceed with treatment on the same day.',
    ],
  },
  {
    slug: 'oral-prophylaxis',
    name: 'Oral Prophylaxis (Cleaning)',
    category: 'Preventive Care',
    summary: 'Ultrasonic scaling and polishing to remove plaque, tartar and surface stains.',
    description:
      'A professional cleaning that removes the hardened plaque a toothbrush cannot reach, above and just below the gumline. Finishes with a polish and a fluoride rinse. Recommended every six months.',
    durationMinutes: 45,
    priceMin: 1200,
    priceMax: 2000,
    icon: 'sparkles',
    featured: true,
    notes: ['Mild sensitivity for a day or two afterwards is normal.'],
  },
  {
    slug: 'tooth-filling',
    name: 'Tooth Filling / Restoration',
    category: 'General Dentistry',
    summary: 'Tooth-coloured composite fillings that repair decay and small fractures.',
    description:
      'Decayed tissue is removed and the tooth rebuilt with a light-cured composite matched to your natural shade. Most single-surface fillings are finished in one visit.',
    durationMinutes: 45,
    priceMin: 1000,
    priceMax: 2500,
    icon: 'shield',
    featured: false,
  },
  {
    slug: 'tooth-extraction',
    name: 'Simple Tooth Extraction',
    category: 'Oral Surgery',
    summary: 'Removal of a damaged or non-restorable tooth under local anaesthesia.',
    description:
      'For teeth too decayed, loose or fractured to save. Performed under local anaesthesia, so the area is fully numb. We review replacement options at the same visit if needed.',
    durationMinutes: 30,
    priceMin: 1500,
    priceMax: 3000,
    icon: 'tooth',
    featured: false,
    notes: ['Arrange a light meal beforehand.', 'Avoid rinsing vigorously for 24 hours after.'],
  },
  {
    slug: 'wisdom-tooth-surgery',
    name: 'Wisdom Tooth Surgery',
    category: 'Oral Surgery',
    summary: 'Surgical removal of impacted third molars by an oral surgeon.',
    description:
      'Impacted wisdom teeth crowd neighbouring molars, trap food and cause recurring infection. Removal is done surgically under local anaesthesia, with sedation available on request.',
    durationMinutes: 90,
    priceMin: 8000,
    priceMax: 15000,
    icon: 'scalpel',
    featured: true,
    notes: [
      'A panoramic x-ray is required before scheduling.',
      'Plan for two to three days of downtime.',
    ],
  },
  {
    slug: 'root-canal-therapy',
    name: 'Root Canal Therapy',
    category: 'General Dentistry',
    summary: 'Saves an infected tooth by cleaning and sealing the nerve canals.',
    description:
      'When decay reaches the nerve, root canal therapy removes the infected pulp, disinfects the canals and seals them — keeping your natural tooth instead of extracting it. Usually completed over one to three visits, then finished with a crown.',
    durationMinutes: 90,
    priceMin: 8000,
    priceMax: 18000,
    icon: 'activity',
    featured: false,
  },
  {
    slug: 'dental-crown',
    name: 'Dental Crown',
    category: 'Prosthodontics',
    summary: 'A custom cap that restores the strength and shape of a damaged tooth.',
    description:
      'Crowns cover a tooth that is heavily filled, cracked, or has had root canal therapy. Available in zirconia, porcelain-fused-to-metal and full ceramic, all shade-matched to the surrounding teeth.',
    durationMinutes: 75,
    priceMin: 12000,
    priceMax: 25000,
    icon: 'crown',
    featured: false,
  },
  {
    slug: 'dentures',
    name: 'Dentures',
    category: 'Prosthodontics',
    summary: 'Removable partial and complete dentures, fitted over three to four visits.',
    description:
      'Replaces missing teeth to restore chewing and speech. We take impressions, fit a trial set so you can check bite and appearance, then deliver the finished denture with follow-up adjustments included.',
    durationMinutes: 60,
    priceMin: 8000,
    priceMax: 45000,
    icon: 'layers',
    featured: false,
  },
  {
    slug: 'dental-implants',
    name: 'Dental Implants',
    category: 'Prosthodontics',
    summary: 'A titanium post and crown that permanently replaces a missing tooth.',
    description:
      'The closest thing to a natural tooth. A titanium post is placed in the jawbone, left to integrate for three to six months, then finished with a custom crown. Does not rely on neighbouring teeth for support.',
    durationMinutes: 120,
    priceMin: 65000,
    priceMax: 120000,
    icon: 'anchor',
    featured: true,
    notes: ['Requires a CBCT scan and a bone-density assessment.'],
  },
  {
    slug: 'braces',
    name: 'Braces (Fixed Orthodontics)',
    category: 'Orthodontics',
    summary: 'Metal and ceramic brackets that correct crowding, gaps and bite problems.',
    description:
      'A full orthodontic workup — photos, x-rays and models — followed by bracket placement and monthly adjustments. Typical treatment runs 18 to 30 months depending on the case.',
    durationMinutes: 60,
    priceMin: 45000,
    priceMax: 90000,
    icon: 'braces',
    featured: true,
    notes: ['Quoted price covers the full treatment including monthly adjustments.'],
  },
  {
    slug: 'clear-aligners',
    name: 'Clear Aligners',
    category: 'Orthodontics',
    summary: 'Removable, near-invisible trays for mild to moderate correction.',
    description:
      'A series of custom trays worn 20 to 22 hours a day, swapped every one to two weeks. Removable for meals and brushing, and far less visible than fixed braces.',
    durationMinutes: 45,
    priceMin: 90000,
    priceMax: 180000,
    icon: 'aligner',
    featured: false,
  },
  {
    slug: 'teeth-whitening',
    name: 'Teeth Whitening',
    category: 'Cosmetic Dentistry',
    summary: 'In-clinic light-activated whitening, several shades in a single visit.',
    description:
      'A professional-strength gel activated by LED light lifts stains from coffee, tea, tobacco and age. Gums are isolated and protected throughout. Take-home maintenance kits are available.',
    durationMinutes: 60,
    priceMin: 8000,
    priceMax: 15000,
    icon: 'sun',
    featured: true,
    notes: ['A cleaning is required first.', 'Avoid staining food and drink for 48 hours after.'],
  },
  {
    slug: 'veneers',
    name: 'Porcelain Veneers',
    category: 'Cosmetic Dentistry',
    summary: 'Thin porcelain shells that reshape the front teeth.',
    description:
      'Veneers correct chips, stubborn discolouration, small gaps and uneven shape. We start with a digital smile preview so you approve the result before any tooth is prepared.',
    durationMinutes: 90,
    priceMin: 15000,
    priceMax: 25000,
    icon: 'gem',
    featured: false,
  },
  {
    slug: 'pediatric-dentistry',
    name: 'Pediatric Dentistry',
    category: 'Pediatric Dentistry',
    summary: 'Gentle check-ups, cleanings and fillings for children up to 12.',
    description:
      'Child-focused care in an unhurried setting, from a first check-up at age one through cleanings, fluoride, sealants and small fillings. Parents stay in the room throughout.',
    durationMinutes: 40,
    priceMin: 800,
    priceMax: 2500,
    icon: 'child',
    featured: true,
  },
  {
    slug: 'dental-xray',
    name: 'Digital X-ray & Panoramic Imaging',
    category: 'Diagnostics',
    summary: 'Low-dose digital imaging, viewable on screen within seconds.',
    description:
      'Periapical, bitewing and full panoramic imaging using digital sensors, at a fraction of the radiation of film. Images are reviewed with you on screen during the same visit.',
    durationMinutes: 15,
    priceMin: 500,
    priceMax: 1500,
    icon: 'scan',
    featured: false,
    notes: ['Tell us if you are or may be pregnant.'],
  },
  {
    slug: 'fluoride-sealant',
    name: 'Fluoride & Pit-and-Fissure Sealants',
    category: 'Preventive Care',
    summary: 'A protective coating for molars that blocks decay before it starts.',
    description:
      'A thin resin sealant flows into the deep grooves of the back teeth where decay usually begins, combined with a fluoride application to strengthen enamel. Most effective on children and teenagers.',
    durationMinutes: 30,
    priceMin: 800,
    priceMax: 1500,
    icon: 'droplet',
    featured: false,
  },
];

const clinics: ContentSet['clinics'] = [
  {
    slug: 'bayog',
    name: 'Maralit Dental Clinic — Bayog',
    shortName: 'Bayog',
    tagline: 'Our flagship branch, caring for Los Baños families since 1998.',
    description:
      'The original Maralit Dental Clinic and our largest branch. Six treatment rooms, an in-house dental laboratory and a full imaging suite mean complex cases — implants, surgery, full-mouth rehabilitation — are handled end to end without a referral. Every service we offer is available here.',
    isMainBranch: true,
    yearEstablished: 1998,
    address: {
      line1: 'National Highway',
      line2: 'Maralit Building, 2nd Floor',
      barangay: 'Bayog',
      city: 'Los Baños',
      province: 'Laguna',
      postalCode: '4030',
      country: 'Philippines',
    },
    coordinates: { lat: 14.1815, lng: 121.2192 },
    mapUrl: 'https://maps.google.com/?q=Bayog+Los+Banos+Laguna',
    phone: '(049) 536 1234',
    mobile: '+63 917 555 0101',
    email: 'bayog@maralitdental.ph',
    accentColor: 'teal',
    hours: [
      { day: 0, closed: true, note: 'Emergency line only' },
      { day: 1, opens: '08:00', closes: '18:00', closed: false },
      { day: 2, opens: '08:00', closes: '18:00', closed: false },
      { day: 3, opens: '08:00', closes: '18:00', closed: false },
      { day: 4, opens: '08:00', closes: '18:00', closed: false },
      { day: 5, opens: '08:00', closes: '18:00', closed: false },
      { day: 6, opens: '08:00', closes: '17:00', closed: false },
    ],
    serviceSlugs: services.map((service) => service.slug),
    highlights: [
      'Full-service branch — every treatment we offer is available here',
      'On-site dental laboratory for same-week crowns and dentures',
      'CBCT and panoramic imaging for implant and surgical planning',
      'Saturday clinic hours until 5:00 PM',
    ],
    amenities: [
      'Free parking for 12 vehicles',
      'Wheelchair accessible — elevator to 2nd floor',
      'Air-conditioned waiting lounge with Wi-Fi',
      'Children’s play corner',
      'GCash, Maya, credit card and instalment plans accepted',
    ],
    acceptedInsurers: ['Maxicare', 'Intellicare', 'PhilCare', 'Medicard', 'ValuCare'],
  },
  {
    slug: 'fo-santos',
    name: 'Maralit Dental Clinic — F.O. Santos St.',
    shortName: 'F.O. Santos',
    tagline: 'Our cosmetic and orthodontic centre, a short walk from UPLB.',
    description:
      'Opened in 2011 in Batong Malake and purpose-built around cosmetic and orthodontic work. This branch runs our digital smile-design workflow, intraoral scanning for clear aligners, and in-clinic whitening — alongside the everyday general dentistry every branch provides. Student rates apply with a valid school ID.',
    isMainBranch: false,
    yearEstablished: 2011,
    address: {
      line1: 'F.O. Santos Street',
      line2: 'Unit 3B, Santos Commercial Arcade',
      barangay: 'Batong Malake',
      city: 'Los Baños',
      province: 'Laguna',
      postalCode: '4030',
      country: 'Philippines',
    },
    coordinates: { lat: 14.1668, lng: 121.2413 },
    mapUrl: 'https://maps.google.com/?q=F.O.+Santos+Street+Los+Banos+Laguna',
    phone: '(049) 536 7788',
    mobile: '+63 917 555 0202',
    email: 'fosantos@maralitdental.ph',
    accentColor: 'indigo',
    hours: [
      { day: 0, closed: true },
      { day: 1, opens: '09:00', closes: '18:00', closed: false },
      { day: 2, opens: '09:00', closes: '18:00', closed: false },
      { day: 3, opens: '09:00', closes: '18:00', closed: false },
      { day: 4, opens: '09:00', closes: '18:00', closed: false },
      { day: 5, opens: '09:00', closes: '18:00', closed: false },
      { day: 6, opens: '09:00', closes: '16:00', closed: false },
    ],
    serviceSlugs: [
      'dental-consultation',
      'oral-prophylaxis',
      'tooth-filling',
      'tooth-extraction',
      'wisdom-tooth-surgery',
      'root-canal-therapy',
      'dental-crown',
      'dentures',
      'braces',
      'clear-aligners',
      'teeth-whitening',
      'veneers',
      'pediatric-dentistry',
      'dental-xray',
      'fluoride-sealant',
    ],
    highlights: [
      'Digital smile design with a preview before treatment starts',
      'Intraoral scanning — no impression trays for aligner cases',
      'Resident orthodontist and cosmetic dentist on rotation',
      'Student rates with a valid school ID',
    ],
    amenities: [
      'Street parking along F.O. Santos',
      'Ground-floor entrance, wheelchair accessible',
      'Air-conditioned waiting lounge with Wi-Fi',
      'GCash, Maya, credit card and instalment plans accepted',
    ],
    acceptedInsurers: ['Maxicare', 'Intellicare', 'Medicard', 'ValuCare'],
  },
  {
    slug: 'junction-road',
    name: 'Maralit Dental Clinic — Junction Rd.',
    shortName: 'Junction Rd.',
    tagline: 'Walk-in friendly care at the busiest corner in Los Baños.',
    description:
      'Our community branch at the Junction, opened in 2019. It focuses on everyday dentistry — check-ups, cleanings, fillings, extractions and children’s care — at accessible prices, with walk-ins welcome. Complex cosmetic and implant cases are referred to Bayog or F.O. Santos, with your records transferred automatically.',
    isMainBranch: false,
    yearEstablished: 2019,
    address: {
      line1: 'Junction Road',
      line2: 'Corner National Highway',
      barangay: 'Batong Malake',
      city: 'Los Baños',
      province: 'Laguna',
      postalCode: '4030',
      country: 'Philippines',
    },
    coordinates: { lat: 14.1795, lng: 121.2211 },
    mapUrl: 'https://maps.google.com/?q=Los+Banos+Junction+Laguna',
    phone: '(049) 536 2299',
    mobile: '+63 917 555 0303',
    email: 'junction@maralitdental.ph',
    accentColor: 'amber',
    hours: [
      { day: 0, closed: true },
      { day: 1, closed: true, note: 'Closed for equipment maintenance' },
      { day: 2, opens: '09:00', closes: '17:00', closed: false },
      { day: 3, opens: '09:00', closes: '17:00', closed: false },
      { day: 4, opens: '09:00', closes: '17:00', closed: false },
      { day: 5, opens: '09:00', closes: '17:00', closed: false },
      { day: 6, opens: '08:00', closes: '14:00', closed: false },
    ],
    serviceSlugs: [
      'dental-consultation',
      'oral-prophylaxis',
      'tooth-filling',
      'tooth-extraction',
      'wisdom-tooth-surgery',
      'root-canal-therapy',
      'dentures',
      'pediatric-dentistry',
      'dental-xray',
      'fluoride-sealant',
    ],
    highlights: [
      'Walk-ins welcome for consultations and cleanings',
      'Student and senior-citizen discounts',
      'Early Saturday opening at 8:00 AM',
      'Records shared across all three branches',
    ],
    amenities: [
      'Street parking',
      'Ground-floor entrance, wheelchair accessible',
      'Air-conditioned waiting area',
      'GCash and Maya accepted',
    ],
    acceptedInsurers: ['Maxicare', 'Intellicare'],
  },
];

const staff: ContentSet['staff'] = [
  {
    slug: 'ramon-maralit',
    name: 'Dr. Ramon Maralit',
    credentials: 'DMD',
    role: 'Dentist',
    specialty: 'General & Restorative Dentistry',
    bio: 'Founder of Maralit Dental Clinic. Dr. Ramon opened the Bayog branch in 1998 and still sees patients every weekday morning. He handles restorative and full-mouth rehabilitation cases, and personally reviews every treatment plan that involves more than three teeth.',
    yearsExperience: 28,
    languages: ['Filipino', 'English'],
    serviceSlugs: [
      'dental-consultation',
      'oral-prophylaxis',
      'tooth-filling',
      'tooth-extraction',
      'root-canal-therapy',
      'dental-crown',
      'dentures',
      'dental-xray',
    ],
    shifts: [
      { clinicSlug: 'bayog', day: 1, start: '08:00', end: '12:00' },
      { clinicSlug: 'bayog', day: 2, start: '08:00', end: '12:00' },
      { clinicSlug: 'bayog', day: 3, start: '08:00', end: '12:00' },
      { clinicSlug: 'bayog', day: 4, start: '08:00', end: '12:00' },
      { clinicSlug: 'bayog', day: 5, start: '08:00', end: '12:00' },
      { clinicSlug: 'bayog', day: 6, start: '08:00', end: '13:00' },
    ],
  },
  {
    slug: 'cristina-maralit-reyes',
    name: 'Dr. Cristina Maralit-Reyes',
    credentials: 'DMD, MSc Orthodontics',
    role: 'Dentist',
    specialty: 'Orthodontics',
    bio: 'Dr. Cristina completed her orthodontic residency in Manila and has managed more than 900 braces and aligner cases. She splits her week between Bayog and F.O. Santos, and runs the clinic’s digital treatment-planning workflow.',
    yearsExperience: 16,
    languages: ['Filipino', 'English', 'Spanish'],
    serviceSlugs: ['dental-consultation', 'braces', 'clear-aligners', 'dental-xray'],
    shifts: [
      { clinicSlug: 'bayog', day: 1, start: '13:00', end: '18:00' },
      { clinicSlug: 'fo-santos', day: 2, start: '10:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 3, start: '13:00', end: '18:00' },
      { clinicSlug: 'fo-santos', day: 4, start: '10:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 5, start: '13:00', end: '18:00' },
      { clinicSlug: 'fo-santos', day: 6, start: '09:00', end: '16:00' },
    ],
  },
  {
    slug: 'paolo-villanueva',
    name: 'Dr. Paolo Villanueva',
    credentials: 'DMD, FPAOMS',
    role: 'Dentist',
    specialty: 'Oral & Maxillofacial Surgery',
    bio: 'A fellow of the Philippine Association of Oral and Maxillofacial Surgeons, Dr. Paolo covers surgical cases across all three branches. He handles impacted wisdom teeth, surgical extractions and pre-implant bone grafting.',
    yearsExperience: 14,
    languages: ['Filipino', 'English'],
    serviceSlugs: [
      'dental-consultation',
      'tooth-extraction',
      'wisdom-tooth-surgery',
      'dental-xray',
    ],
    shifts: [
      { clinicSlug: 'bayog', day: 2, start: '09:00', end: '17:00' },
      { clinicSlug: 'fo-santos', day: 3, start: '10:00', end: '18:00' },
      { clinicSlug: 'junction-road', day: 5, start: '09:00', end: '17:00' },
      { clinicSlug: 'junction-road', day: 6, start: '08:00', end: '14:00' },
    ],
  },
  {
    slug: 'alyssa-bautista',
    name: 'Dr. Alyssa Bautista',
    credentials: 'DMD',
    role: 'Dentist',
    specialty: 'Pediatric Dentistry',
    bio: 'Dr. Alyssa has spent her career working with children, from first check-ups at age one through the teenage years. She is known for unhurried appointments and for letting anxious kids set the pace.',
    yearsExperience: 9,
    languages: ['Filipino', 'English'],
    serviceSlugs: [
      'dental-consultation',
      'pediatric-dentistry',
      'oral-prophylaxis',
      'fluoride-sealant',
      'tooth-filling',
    ],
    shifts: [
      { clinicSlug: 'fo-santos', day: 1, start: '09:00', end: '16:00' },
      { clinicSlug: 'junction-road', day: 2, start: '09:00', end: '17:00' },
      { clinicSlug: 'fo-santos', day: 4, start: '09:00', end: '16:00' },
      { clinicSlug: 'junction-road', day: 6, start: '08:00', end: '14:00' },
    ],
  },
  {
    slug: 'miguel-santos',
    name: 'Dr. Miguel Santos',
    credentials: 'DMD, MSc Endodontics',
    role: 'Dentist',
    specialty: 'Endodontics (Root Canal Therapy)',
    bio: 'Dr. Miguel treats the cases other clinics refer out — calcified canals, retreatments and molars with unusual anatomy. He works under a surgical microscope and completes most single-root cases in one visit.',
    yearsExperience: 12,
    languages: ['Filipino', 'English'],
    serviceSlugs: [
      'dental-consultation',
      'root-canal-therapy',
      'tooth-filling',
      'dental-crown',
      'dental-xray',
    ],
    shifts: [
      { clinicSlug: 'bayog', day: 1, start: '12:00', end: '18:00' },
      { clinicSlug: 'junction-road', day: 3, start: '09:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 4, start: '09:00', end: '18:00' },
      { clinicSlug: 'junction-road', day: 5, start: '09:00', end: '17:00' },
    ],
  },
  {
    slug: 'hannah-de-leon',
    name: 'Dr. Hannah de Leon',
    credentials: 'DMD',
    role: 'Dentist',
    specialty: 'Cosmetic & Prosthetic Dentistry',
    bio: 'Dr. Hannah leads the cosmetic practice at the F.O. Santos branch. She runs the digital smile-design workflow, so patients approve a preview of the result before any tooth is prepared.',
    yearsExperience: 11,
    languages: ['Filipino', 'English'],
    serviceSlugs: [
      'dental-consultation',
      'teeth-whitening',
      'veneers',
      'dental-crown',
      'dentures',
    ],
    shifts: [
      { clinicSlug: 'fo-santos', day: 1, start: '12:00', end: '18:00' },
      { clinicSlug: 'fo-santos', day: 2, start: '09:00', end: '18:00' },
      { clinicSlug: 'fo-santos', day: 5, start: '09:00', end: '18:00' },
      { clinicSlug: 'fo-santos', day: 6, start: '09:00', end: '16:00' },
    ],
  },
  {
    slug: 'jerome-aquino',
    name: 'Dr. Jerome Aquino',
    credentials: 'DMD, Dip. Implantology',
    role: 'Dentist',
    specialty: 'Implantology',
    bio: 'Dr. Jerome places and restores dental implants at the Bayog branch, where the CBCT scanner and in-house laboratory let him plan and deliver a case without outside referrals.',
    yearsExperience: 13,
    languages: ['Filipino', 'English'],
    serviceSlugs: ['dental-consultation', 'dental-implants', 'dental-crown', 'dental-xray'],
    shifts: [
      { clinicSlug: 'bayog', day: 3, start: '09:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 4, start: '09:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 6, start: '09:00', end: '17:00' },
    ],
  },
  {
    slug: 'grace-mendoza',
    name: 'Grace Mendoza',
    credentials: 'RDH',
    role: 'Dental Hygienist',
    specialty: 'Preventive Care & Oral Health Education',
    bio: 'Grace handles cleanings, sealants and fluoride treatments at Bayog, and runs the clinic’s school oral-health outreach programme across Los Baños.',
    yearsExperience: 8,
    languages: ['Filipino', 'English'],
    serviceSlugs: ['oral-prophylaxis', 'fluoride-sealant'],
    shifts: [
      { clinicSlug: 'bayog', day: 1, start: '08:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 2, start: '08:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 3, start: '08:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 4, start: '08:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 5, start: '08:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 6, start: '08:00', end: '13:00' },
    ],
  },
  {
    slug: 'bea-torres',
    name: 'Bea Torres',
    credentials: 'RDH',
    role: 'Dental Hygienist',
    specialty: 'Preventive Care',
    bio: 'Bea splits her week between F.O. Santos and Junction Rd., covering cleanings, sealants and periodontal maintenance for both branches.',
    yearsExperience: 6,
    languages: ['Filipino', 'English'],
    serviceSlugs: ['oral-prophylaxis', 'fluoride-sealant'],
    shifts: [
      { clinicSlug: 'fo-santos', day: 1, start: '09:00', end: '18:00' },
      { clinicSlug: 'junction-road', day: 2, start: '09:00', end: '17:00' },
      { clinicSlug: 'fo-santos', day: 3, start: '09:00', end: '18:00' },
      { clinicSlug: 'junction-road', day: 4, start: '09:00', end: '17:00' },
      { clinicSlug: 'fo-santos', day: 5, start: '09:00', end: '18:00' },
    ],
  },
  {
    slug: 'andrei-lim',
    name: 'Andrei Lim',
    credentials: '',
    role: 'Dental Assistant',
    specialty: 'Chairside Assistance & Sterilisation',
    bio: 'Andrei is the senior dental assistant at Junction Rd., responsible for chairside support, instrument sterilisation and infection control across the branch.',
    yearsExperience: 5,
    languages: ['Filipino', 'English'],
    serviceSlugs: [],
    shifts: [
      { clinicSlug: 'junction-road', day: 2, start: '09:00', end: '17:00' },
      { clinicSlug: 'junction-road', day: 3, start: '09:00', end: '17:00' },
      { clinicSlug: 'junction-road', day: 4, start: '09:00', end: '17:00' },
      { clinicSlug: 'junction-road', day: 5, start: '09:00', end: '17:00' },
      { clinicSlug: 'junction-road', day: 6, start: '08:00', end: '14:00' },
    ],
  },
  {
    slug: 'karla-dimaano',
    name: 'Karla Dimaano',
    credentials: '',
    role: 'Front Desk',
    specialty: 'Patient Coordination & Insurance',
    bio: 'Karla coordinates scheduling across all three branches and handles HMO approvals and insurance claims. She is the person on the other end of the clinic hotline.',
    yearsExperience: 7,
    languages: ['Filipino', 'English'],
    serviceSlugs: [],
    shifts: [
      { clinicSlug: 'bayog', day: 1, start: '08:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 2, start: '08:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 3, start: '08:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 4, start: '08:00', end: '17:00' },
      { clinicSlug: 'bayog', day: 5, start: '08:00', end: '17:00' },
    ],
  },
];

/** Organisation-level details used by the landing page, header and footer. */
export const organization = {
  name: 'Maralit Dental Clinic',
  shortName: 'MDCAS',
  tagline: 'Three branches in Los Baños. One standard of care.',
  description:
    'Maralit Dental Clinic has cared for Los Baños families since 1998. Across our three branches you will find the same clinical standards, the same shared patient records, and a schedule you can check before you travel.',
  hotline: '(043) 778 1234',
  mobile: '+63 917 555 0101',
  email: 'hello@maralitdental.ph',
  emergencyHotline: '+63 917 555 0000',
  yearEstablished: 1998,
  social: {
    facebook: 'https://facebook.com/maralitdental',
    instagram: 'https://instagram.com/maralitdental',
  },
  /** Shown on the landing page. Keep these honest — they are marketing claims. */
  stats: [
    { label: 'Years of practice', value: '27+' },
    { label: 'Patients served', value: '18,000+' },
    { label: 'Branches in Los Baños', value: '3' },
    { label: 'Dentists & hygienists', value: '11' },
  ],
};

/**
 * Staff logins. There is no public sign-up — these accounts are the only way
 * into the staff area, and they are created here or by an admin.
 *
 * Roles:
 *   admin     — full access to every branch, and can create other accounts
 *   dentist   — sees and manages the schedule for their assigned branches
 *   frontdesk — books, reschedules and cancels for their assigned branches
 *
 * `clinicSlugs: []` means "all branches".
 *
 * ⚠️  The passwords below are development defaults. Change every one of them
 *     before this touches a real patient. Set STAFF_DEFAULT_PASSWORD in .env
 *     to override them all at seed time.
 */
export const staffUsers: Array<{
  email: string;
  name: string;
  role: 'admin' | 'dentist' | 'frontdesk';
  clinicSlugs: string[];
  staffSlug?: string;
  password: string;
}> = [
  {
    email: 'admin@maralitdental.ph',
    name: 'Clinic Administrator',
    role: 'admin',
    clinicSlugs: [],
    password: 'ChangeMe123!',
  },
  {
    email: 'ramon.maralit@maralitdental.ph',
    name: 'Dr. Ramon Maralit',
    role: 'dentist',
    clinicSlugs: ['bayog'],
    staffSlug: 'ramon-maralit',
    password: 'ChangeMe123!',
  },
  {
    email: 'cristina.reyes@maralitdental.ph',
    name: 'Dr. Cristina Maralit-Reyes',
    role: 'dentist',
    clinicSlugs: ['bayog', 'fo-santos'],
    staffSlug: 'cristina-maralit-reyes',
    password: 'ChangeMe123!',
  },
  {
    email: 'hannah.deleon@maralitdental.ph',
    name: 'Dr. Hannah de Leon',
    role: 'dentist',
    clinicSlugs: ['fo-santos'],
    staffSlug: 'hannah-de-leon',
    password: 'ChangeMe123!',
  },
  {
    email: 'paolo.villanueva@maralitdental.ph',
    name: 'Dr. Paolo Villanueva',
    role: 'dentist',
    clinicSlugs: ['bayog', 'fo-santos', 'junction-road'],
    staffSlug: 'paolo-villanueva',
    password: 'ChangeMe123!',
  },
  {
    email: 'karla.dimaano@maralitdental.ph',
    name: 'Karla Dimaano',
    role: 'frontdesk',
    clinicSlugs: [],
    staffSlug: 'karla-dimaano',
    password: 'ChangeMe123!',
  },
  {
    email: 'andrei.lim@maralitdental.ph',
    name: 'Andrei Lim',
    role: 'frontdesk',
    clinicSlugs: ['junction-road'],
    staffSlug: 'andrei-lim',
    password: 'ChangeMe123!',
  },
];

/** Roles that can be booked into a chair. Assistants and front desk cannot. */
export const PROVIDER_ROLES = ['Dentist', 'Dental Hygienist'] as const;

export const seedContent: ContentSet = { clinics, services, staff };

