import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface SubscriptionStatus {
  plan: 'free' | 'individual' | 'family';
  isActive: boolean;
  expiresAt: string | null;
}

async function fetchSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const res = await fetch(`${API_URL}/subscriptions/status/${userId}`);
  if (!res.ok) return { plan: 'free', isActive: false, expiresAt: null };
  const data = await res.json();
  return {
    plan: data.plan ?? 'free',
    isActive: data.is_active ?? false,
    expiresAt: data.current_period_end ?? null,
  };
}

export function useSubscription(): SubscriptionStatus & { isLoading: boolean } {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => fetchSubscriptionStatus(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  return {
    plan: data?.plan ?? 'free',
    isActive: data?.isActive ?? false,
    expiresAt: data?.expiresAt ?? null,
    isLoading,
  };
}
