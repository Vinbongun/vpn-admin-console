import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/client";
import type { AdminSubscriptionQuery, SubscriptionSummary } from "@/api/types";

type Status = SubscriptionSummary["status"];

export function useSubscriptions(query: AdminSubscriptionQuery) {
  return useQuery({ queryKey: ["admin-subscriptions", query], queryFn: () => adminApi.listSubscriptions(query), retry: false });
}

export function useSubscription(id: string | undefined) {
  return useQuery({ queryKey: ["admin-subscription", id], queryFn: () => adminApi.getSubscription(id!), enabled: Boolean(id), retry: false });
}

function useInvalidateSubscriptions(id?: string) {
  const queryClient = useQueryClient();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] }), queryClient.invalidateQueries({ queryKey: ["admin-subscription", id] })]);
}

export function useCreateSubscriptionMutation(onDone: () => void, customerId?: string) {
  const invalidate = useInvalidateSubscriptions();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createSubscription,
    onSuccess: async () => {
      onDone();
      await Promise.all([invalidate(), ...(customerId ? [queryClient.invalidateQueries({ queryKey: ["admin-customer", customerId] })] : [])]);
    },
  });
}

export function useUpdateSubscriptionMutation(id: string | undefined) {
  const invalidate = useInvalidateSubscriptions(id);
  return useMutation({
    mutationFn: ({ id: subscriptionId, body }: { id: string; body: { status: Status; planId?: string; reason: string } }) => adminApi.updateSubscription(subscriptionId, body),
    onSuccess: invalidate,
  });
}

export function useRevokeSubscriptionMutation(id: string | undefined, onDone: () => void) {
  const invalidate = useInvalidateSubscriptions(id);
  return useMutation({
    mutationFn: ({ id: subscriptionId, reason }: { id: string; reason: string }) => adminApi.revokeSubscription(subscriptionId, reason),
    onSuccess: async () => {
      onDone();
      await invalidate();
    },
  });
}

export function useRotateSubscriptionTokenMutation(onIssued: (token: Awaited<ReturnType<typeof adminApi.rotateSubscriptionToken>>) => void) {
  return useMutation({
    mutationFn: (id: string) => adminApi.rotateSubscriptionToken(id),
    onSuccess: onIssued,
  });
}

export function useExtendSubscriptionMutation(id: string | undefined, onDone: () => void, customerId?: string) {
  const invalidate = useInvalidateSubscriptions(id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id: subscriptionId, days, reason }: { id: string; days: number; reason: string }) => adminApi.extendSubscription(subscriptionId, { days, reason }),
    onSuccess: async () => {
      onDone();
      await Promise.all([invalidate(), ...(customerId ? [queryClient.invalidateQueries({ queryKey: ["admin-customer", customerId] })] : [])]);
    },
  });
}
