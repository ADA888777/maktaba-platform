import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { publicRouter } from './routes/public.js';
import { formsRouter } from './routes/forms.js';
import { analyticsRouter } from './routes/analytics.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { errorHandler, HttpError } from './utils/http.js';
import { MS_FORMS_HOSTS } from './services/settings.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const formHosts = MS_FORMS_HOSTS.map((h) => `https://${h}`);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          // يسمح فقط بتضمين نماذج Microsoft Forms
          frameSrc: ["'self'", ...formHosts, ...MS_FORMS_HOSTS.map((h) => `https://*.${h}`)],
          connectSrc: ["'self'"],
          formAction: ["'self'", ...formHosts],
          upgradeInsecureRequests: config.secureCookies ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // CORS للتطوير فقط (في الإنتاج تُخدم الواجهة من نفس الخادم)
  app.use((req, res, next) => {
    const origin = req.get('Origin');
    if (origin && origin === config.clientOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Library-Client');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
      res.setHeader('Vary', 'Origin');
      if (req.method === 'OPTIONS') return void res.status(204).end();
    }
    next();
  });

  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  const publicWriteLimiter = rateLimit({
    // الحد مرتفع نسبيًا لأن شبكة المنشأة قد تجمع كثيرًا من الطالبات خلف عنوان IP واحد
    windowMs: 10 * 60 * 1000,
    limit: 150,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'تم إرسال عدد كبير من الطلبات. حاولي مرة أخرى بعد قليل.' },
  });
  const trackLimiter = rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false });

  app.get('/api/health', (_req, res) => void res.json({ ok: true }));
  app.use('/api/public', publicRouter);
  app.use('/api/forms', publicWriteLimiter, formsRouter);
  app.use('/api/analytics', trackLimiter, analyticsRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'المسار غير موجود')));

  app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d', index: false, dotfiles: 'deny' }));

  // في الإنتاج: خدمة ملفات الواجهة المبنية مع دعم التنقل داخل التطبيق
  if (fs.existsSync(path.join(config.clientDist, 'index.html'))) {
    app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api|uploads).*/, (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
