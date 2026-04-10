const express = require('express');
const router  = express.Router();
const { supabase } = require('../server');

/**
 * POST /auth/verify-parent-consent
 * Records that a parent gave COPPA consent for a child under 13.
 * Body: { parent_id, child_id, child_name, child_birthdate, ip_address? }
 * Returns: { success: true }
 */
router.post('/verify-parent-consent', async (req, res) => {
  const { parent_id, child_id, child_name, child_birthdate, ip_address } = req.body;

  if (!parent_id || !child_id) {
    return res.status(400).json({ error: 'parent_id and child_id are required.' });
  }

  const { error } = await supabase.from('parental_consents').upsert({
    parent_id,
    child_id,
    consent_given: true,
    consent_timestamp: new Date().toISOString(),
    ip_address: ip_address ?? req.ip ?? null,
  }, { onConflict: 'parent_id,child_id' });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

/**
 * GET /auth/profile/:user_id
 * Returns the profile row for a given user_id.
 * Used client-side as a fallback if Supabase RLS policy changes.
 */
router.get('/profile/:user_id', async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.params.user_id)
    .single();

  if (error) return res.status(404).json({ error: 'Profile not found.' });
  res.json(data);
});

module.exports = router;

