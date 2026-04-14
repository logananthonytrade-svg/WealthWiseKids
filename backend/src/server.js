require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const { createClient } = require('@supabase/supabase-js');
const { authLimiter, rewardLimiter, storeLimiter } = require('./middleware/rateLimiter');

const app = express();

// ─── Supabase admin client ─────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
// Raw body needed for Stripe subscription webhook signature verification
app.use('/subscriptions/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ─── Routes (with rate limiters) ──────────────────────────────────────────
app.use('/auth',          authLimiter,   require('./routes/auth'));
app.use('/subscriptions', authLimiter,   require('./routes/subscriptions'));
app.use('/schools',                      require('./routes/schools'));
app.use('/rewards',       rewardLimiter, require('./routes/rewards'));
app.use('/store',         storeLimiter,  require('./routes/store'));

// ─── Error handler ────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[server] unhandled error', {
    method: req.method, path: req.path, error: err.message, stack: err.stack,
  });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { supabase };
