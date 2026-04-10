import supabase from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─── Category mapping ─────────────────────────────────────────────────────────

type PlaidCategory = string[];
type AppCategory   = 'food' | 'shopping' | 'entertainment' | 'transport' | 'savings' | 'other';

/**
 * categorizeTransaction
 * Maps Plaid's nested category array to WealthWise's 6-category system.
 */
export function categorizeTransaction(plaidCategory: PlaidCategory): AppCategory {
  const joined = plaidCategory.join(' ').toLowerCase();

  if (/food|restaurant|grocery|cafe|coffee|bakery|fast food/.test(joined))   return 'food';
  if (/entertainment|movie|music|sport|game|recreation|streaming/.test(joined)) return 'entertainment';
  if (/travel|taxi|uber|lyft|transport|gas|parking|airline|train/.test(joined)) return 'transport';
  if (/transfer|deposit|saving|investment|interest/.test(joined))             return 'savings';
  if (/shop|retail|amazon|walmart|target|clothing|apparel|book/.test(joined)) return 'shopping';

  return 'other';
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

/**
 * syncTransactions
 * Fetches last 90 days of transactions from the backend and upserts into budget_entries.
 */
export async function syncTransactions(childId: string): Promise<void> {
  const response = await fetch(`${API_URL}/plaid/transactions/${childId}`);

  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error ?? 'Failed to sync transactions.');
  }

  const { transactions } = await response.json();

  if (!transactions || transactions.length === 0) return;

  // Map Plaid transactions → budget_entries (upsert to avoid duplicates)
  const entries = transactions.map((t: any) => ({
    child_id: childId,
    entry_type: 'expense' as const,
    amount: Math.abs(t.amount),
    category: categorizeTransaction(t.category ?? ['other']),
    description: t.name,
    entry_date: t.date,
    is_from_plaid: true,
    plaid_transaction_id: t.transaction_id,
  }));

  // Upsert — skip if plaid_transaction_id already exists
  await supabase.from('budget_entries').upsert(entries, {
    onConflict: 'plaid_transaction_id',
    ignoreDuplicates: true,
  });
}
