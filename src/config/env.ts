import 'dotenv/config';

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : undefined;
}

const nodeEnv = optional('NODE_ENV') ?? 'development';
const isProduction = nodeEnv === 'production';

const jwtSecret = optional('JWT_SECRET');

// A predictable signing key in production would let anyone mint a staff token,
// so refuse to boot rather than fall back to the development default.
if (isProduction && !jwtSecret) {
  throw new Error(
    'JWT_SECRET must be set in production. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
  );
}

const mongoUri = optional('MONGO_URI');

if (isProduction && !mongoUri) {
  throw new Error(
    'MONGO_URI must be set in production. The in-memory fallback loses every booking on restart.',
  );
}

export const env = {
  nodeEnv,
  isProduction,
  port: Number(optional('PORT') ?? 5000),

  /** Blank in development means "run from the seed file, no database". */
  mongoUri,

  jwtSecret: jwtSecret ?? 'mdcas-development-secret-do-not-use-in-production',
  jwtExpiresIn: optional('JWT_EXPIRES_IN') ?? '12h',

  /** Overrides every seeded staff password. Useful for a shared demo deploy. */
  staffDefaultPassword: optional('STAFF_DEFAULT_PASSWORD'),

  /** Extra allowed browser origins, comma-separated. */
  allowedOrigins: (optional('FRONTEND_URL') ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
} as const;

/** True when the API is serving content straight from `seed.data.ts`. */
export const usingInMemoryStore = !env.mongoUri;
