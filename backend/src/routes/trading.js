const express = require('express');
const router = express.Router();
const { supabase } = require('../server');

// GET /trading/signals — latest gate-passing signals from the bot
router.get('/signals', async (req, res) => {
  const { data, error } = await supabase
    .from('bot_signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /trading/signals/:symbol — signals for one instrument
router.get('/signals/:symbol', async (req, res) => {
  const { data, error } = await supabase
    .from('bot_signals')
    .select('*')
    .eq('symbol', req.params.symbol.toUpperCase())
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /trading/trades — completed paper/live trades
router.get('/trades', async (req, res) => {
  const { user_id } = req.query;
  let query = supabase
    .from('bot_trades')
    .select('*')
    .order('entry_time', { ascending: false })
    .limit(100);
  if (user_id) query = query.eq('user_id', user_id);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /trading/bot-status — is the bot running, last scan time, etc.
router.get('/bot-status', async (req, res) => {
  const { data, error } = await supabase
    .from('bot_status')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
