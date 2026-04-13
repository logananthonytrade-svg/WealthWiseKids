require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ─── Supabase admin client ─────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
// Raw body needed for Stripe webhook signature verification
app.use('/subscriptions/webhook', express.raw({ type: 'application/json' }));
app.use('/store/coins-webhook',   express.raw({ type: 'application/json' }));
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/auth',          require('./routes/auth'));
app.use('/subscriptions', require('./routes/subscriptions'));
app.use('/schools',       require('./routes/schools'));
app.use('/store',         require('./routes/store'));
app.use('/trading',       require('./routes/trading'));

// ─── Error handler ────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { supabase };
