import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  createMemory,
  fetchMemoryPage,
  type CreateMemoryInput,
  type MemoryRecord,
} from '@/services/memoryService';
import { companionQueryKey, useCompanion } from '@/hooks/useCompanion';
import { useAuthStore } from '@/stores/authStore';

export const memoriesQueryKey = (companionId: string | undefined) =>
  ['memories', companionId] as const;

export function useMemories() {
  const userId = useAuthStore((state) => state.user?.id);
  const { companion } = useCompanion();
  const companionId = companion?.id;
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: memoriesQueryKey(companionId),
    queryFn: async ({ pageParam }) => {
      if (!companionId) {
        return { items: [] as MemoryRecord[], nextCursor: null };
      }
      return fetchMemoryPage(companionId, pageParam ?? null);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(companionId),
  });

  const addMutation = useMutation({
    mutationFn: async (input: Omit<CreateMemoryInput, 'companionId'>) => {
      if (!companionId || !userId) {
        throw new Error('Companion and user required');
      }
      return createMemory({ ...input, companionId }, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: memoriesQueryKey(companionId) });
      await queryClient.invalidateQueries({
        queryKey: companionQueryKey(userId),
      });
    },
  });

  const memories =
    query.data?.pages.flatMap((page) => page.items) ?? [];

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  return {
    memories,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    error: query.error,
    loadMore,
    refetch: query.refetch,
    addMemory: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    addError: addMutation.error,
  };
}
