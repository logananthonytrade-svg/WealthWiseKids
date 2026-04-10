const express = require('express');
const router  = express.Router();
const { PlaidApi, PlaidEnvironments, Configuration, Products, CountryCode } = require('plaid');
const { supabase } = require('../server');

// ─── Plaid client setup ───────────────────────────────────────────────────────
const plaidEnv = process.env.PLAID_ENV === 'production'
  ? PlaidEnvironments.production
  : PlaidEnvironments.sandbox;

const plaidClient = new PlaidApi(new Configuration({
  basePath: plaidEnv,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET':    process.env.PLAID_SECRET,
    },
  },
}));

// ─── Simple obfuscation (base64) — upgrade to AES-256 before production ──────
const encrypt = (token) => Buffer.from(token).toString('base64');
const decrypt = (enc)   => Buffer.from(enc, 'base64').toString('utf8');

/**
 * POST /plaid/create-link-token
 * Creates a Plaid Link token so the frontend can open the Plaid Link flow.
 * Body: { user_id, child_id }
 * Returns: { link_token: string }
 */
router.post('/create-link-token', async (req, res) => {
  const { user_id, child_id } = req.body;
  if (!user_id || !child_id) {
    return res.status(400).json({ error: 'user_id and child_id are required.' });
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: child_id },
      client_name: 'WealthWise Kids',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('Plaid link token error:', err?.response?.data ?? err.message);
    res.status(500).json({ error: 'Failed to create Plaid link token.' });
  }
});

/**
 * POST /plaid/exchange-token
 * Exchanges the one-time public_token from Plaid Link for a reusable access_token.
 * Stores the encrypted access_token in plaid_connections.
 * Body: { user_id, child_id, public_token, institution_name }
 * Returns: { success: true }
 */
router.post('/exchange-token', async (req, res) => {
  const { child_id, public_token, institution_name } = req.body;
  if (!child_id || !public_token) {
    return res.status(400).json({ error: 'child_id and public_token are required.' });
  }

  try {
    const { data } = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = data;

    await supabase.from('plaid_connections').upsert({
      child_id,
      access_token_encrypted: encrypt(access_token),
      item_id,
      institution_name: institution_name ?? 'Unknown Bank',
      is_active: true,
      last_synced: new Date().toISOString(),
    }, { onConflict: 'child_id' });

    res.json({ success: true });
  } catch (err) {
    console.error('Plaid token exchange error:', err?.response?.data ?? err.message);
    res.status(500).json({ error: 'Failed to exchange Plaid token.' });
  }
});

/**
 * GET /plaid/transactions/:child_id
 * Fetches the last 90 days of transactions for the connected account.
 * Returns: { transactions: PlaidTransaction[], institution_name: string }
 */
router.get('/transactions/:child_id', async (req, res) => {
  const { child_id } = req.params;

  const { data: conn, error: connError } = await supabase
    .from('plaid_connections')
    .select('access_token_encrypted, institution_name')
    .eq('child_id', child_id)
    .eq('is_active', true)
    .maybeSingle();

  if (connError || !conn) {
    return res.status(404).json({ error: 'No active Plaid connection found for this child.' });
  }

  const accessToken = decrypt(conn.access_token_encrypted);
  const endDate     = new Date().toISOString().split('T')[0];
  const startDate   = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const { data } = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count: 500, offset: 0 },
    });

    // Update last_synced timestamp
    await supabase.from('plaid_connections')
      .update({ last_synced: new Date().toISOString() })
      .eq('child_id', child_id);

    res.json({
      transactions: data.transactions,
      institution_name: conn.institution_name,
    });
  } catch (err) {
    console.error('Plaid transactions error:', err?.response?.data ?? err.message);
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

/**
 * GET /plaid/balances/:child_id
 * Returns current account balances for the connected bank account.
 * Returns: { accounts: PlaidAccount[] }
 */
router.get('/balances/:child_id', async (req, res) => {
  const { data: conn, error } = await supabase
    .from('plaid_connections')
    .select('access_token_encrypted')
    .eq('child_id', req.params.child_id)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !conn) {
    return res.status(404).json({ error: 'No active Plaid connection.' });
  }

  try {
    const { data } = await plaidClient.accountsBalanceGet({
      access_token: decrypt(conn.access_token_encrypted),
    });
    res.json({ accounts: data.accounts });
  } catch (err) {
    console.error('Plaid balance error:', err?.response?.data ?? err.message);
    res.status(500).json({ error: 'Failed to fetch balances.' });
  }
});

/**
 * DELETE /plaid/disconnect/:child_id
 * Disconnects the Plaid bank link for a child.
 */
router.delete('/disconnect/:child_id', async (req, res) => {
  const { error } = await supabase
    .from('plaid_connections')
    .update({ is_active: false })
    .eq('child_id', req.params.child_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;

