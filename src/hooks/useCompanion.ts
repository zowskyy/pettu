import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { calculateMood } from '../../lib/companionEngine/mood';
import type { CareActionType } from '../../lib/companionEngine/types';
import {
  fetchActiveCompanion,
  performCareAction,
  syncCompanionMood,
  type CompanionState,
  type CompanionView,
} from '@/services/companionService';
import { generateDialogue } from '@/services/ai/DialogueService';
import { useCompanionStore } from '@/stores/companionStore';
import { useAuthStore } from '@/stores/authStore';

export const companionQueryKey = (ownerId: string | undefined) =>
  ['companion', 'active', ownerId] as const;

export function useCompanion() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const { setDialogue, setPendingAction, setCareError } = useCompanionStore();

  const query = useQuery({
    queryKey: companionQueryKey(userId),
    queryFn: async (): Promise<CompanionView | null> => {
      if (!userId) return null;
      const view = await fetchActiveCompanion(userId);
      if (view) {
        await syncCompanionMood(view.companion.id, view.computedMood).catch(() => {
          // Non-blocking mood sync; meters remain authoritative.
        });
      }
      return view;
    },
    enabled: Boolean(userId),
  });

  const companion: CompanionState | null = query.data?.companion ?? null;
  const mood = query.data?.computedMood ?? null;

  const careMutation = useMutation({
    mutationFn: async (actionType: CareActionType) => {
      const companionId = query.data?.companion.id;
      if (!companionId) {
        throw new Error('No active companion');
      }
      return performCareAction(companionId, actionType);
    },
    onMutate: (actionType) => {
      setPendingAction(actionType);
      setCareError(null);
    },
    onSuccess: async (result, actionType) => {
      await queryClient.invalidateQueries({ queryKey: companionQueryKey(userId) });

      const current = query.data?.companion;
      if (current) {
        const computedMood = calculateMood({
          joy: result.joy,
          energy: result.energy,
          bond: result.bond,
        });
        const dialogue = await generateDialogue({
          companionId: current.id,
          companionName: current.nickname ?? current.name,
          species: current.species,
          personalityTraits: [],
          mood: computedMood,
          recentAction: actionType,
        });
        setDialogue(dialogue);
      }
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Care action failed. Please try again.';
      setCareError(message);
    },
    onSettled: () => {
      setPendingAction(null);
    },
  });

  const performAction = useCallback(
    (actionType: CareActionType) => {
      careMutation.mutate(actionType);
    },
    [careMutation],
  );

  return {
    companion,
    mood,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
    performAction,
    isPerformingAction: careMutation.isPending,
  };
}
