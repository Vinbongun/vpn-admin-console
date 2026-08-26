import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/client";

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
