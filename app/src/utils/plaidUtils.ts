import supabase from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * syncTransactions
 * Triggers a fresh pull from Plaid-backed transactions endpoint.
 * The backend updates last_synced and returns latest transactions.
 */
export async function syncTransactions(childId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  await fetch(`${API_URL}/plaid/transactions/${childId}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}
