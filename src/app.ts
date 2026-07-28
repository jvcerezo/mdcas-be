import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env, usingInMemoryStore } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errors';
import { router } from './routes';

export function createApp() {
  const app = express();

  // Behind a reverse proxy (Render, Railway, nginx) this is what makes the
  // rate limiter see the real client IP rather than the proxy's.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));

  if (!env.isProduction) {
    app.use(morgan('dev'));
  }

  // In development the Vite dev server may come up on 5173 or 5174, so allow
  // any localhost port. In production only the configured origins are allowed.
  const allowed = new Set(env.allowedOrigins);
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin requests, curl and server-to-server calls send no Origin.
        if (!origin) return callback(null, true);

        const normalized = origin.replace(/\/$/, '');
        if (allowed.has(normalized)) return callback(null, true);
        if (!env.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'mdcas-api',
      storage: usingInMemoryStore ? 'in-memory (seed file)' : 'mongodb',
      environment: env.nodeEnv,
    });
  });

  app.get('/', (_req, res) => {
    res.json({
      service: 'MDCAS API',
      description:
        'Public content and schedule API for Maralit Dental Clinic. Appointment writes are staff-only.',
      docs: '/api',
    });
  });

  app.get('/api', (_req, res) => {
    res.json({
      public: [
        'GET /api/organization',
        'GET /api/clinics',
        'GET /api/clinics/:slug',
        'GET /api/services',
        'GET /api/services/:slug',
        'GET /api/staff',
        'GET /api/staff/:slug',
        'GET /api/roster',
        'GET /api/schedule?month=YYYY-MM',
        'GET /api/schedule/legend',
        'GET /api/schedule/:clinicSlug?month=YYYY-MM',
      ],
      auth: [
        'POST /api/auth/login',
        'GET  /api/auth/me',
        'GET  /api/auth/users   (admin)',
        'POST /api/auth/users   (admin)',
      ],
      staff: [
        'GET    /api/staff-portal/options',
        'GET    /api/staff-portal/appointments?from&to&clinic&staff&status&mine',
        'POST   /api/staff-portal/appointments',
        'GET    /api/staff-portal/appointments/:id',
        'PATCH  /api/staff-portal/appointments/:id',
        'DELETE /api/staff-portal/appointments/:id?hard=true',
      ],
    });
  });

  app.use('/api', router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
