/**
 * rateLimiter.js — Express rate-limiter presets
 *
 * Applied selectively per route group in server.js.
 * All windows and max values can be tuned via env vars for production.
 */
const rateLimit = require('express-rate-limit');

/**
 * authLimiter — tight window for authentication/account operations.
 * 20 requests per 15 minutes per IP.
 * Applied to:  /auth/*  and  /subscriptions/create-checkout  /subscriptions/portal
 */
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many requests. Please slow down and try again.' },
});

/**
 * rewardLimiter — prevents rapid-fire coin farming.
 * 60 requests per minute per IP (covers all children under one parent).
 * Applied to:  /rewards/*
 */
const rewardLimiter = rateLimit({
  windowMs:        60 * 1000, // 1 minute
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many reward requests. Please slow down.' },
});

/**
 * storeLimiter — prevents automated store-item spam.
 * 30 requests per minute per IP.
 * Applied to:  /store/*
 */
const storeLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many store requests. Please slow down.' },
});

module.exports = { authLimiter, rewardLimiter, storeLimiter };
