import { create } from 'zustand';
import type { CareActionType } from '../../lib/companionEngine/types';
import type { DialogueResponse } from '@/services/ai/types';

/**
 * UI-only cache for Home screen presentation.
 * Authoritative companion stats always come from Supabase via TanStack Query.
 */
interface CompanionUiState {
  /** Latest validated dialogue bubble (AI or fallback). */
  dialogue: DialogueResponse | null;
  /** Care action currently in flight (button loading state). */
  pendingAction: CareActionType | null;
  /** Transient error message for care actions. */
  careError: string | null;
  setDialogue: (dialogue: DialogueResponse | null) => void;
  setPendingAction: (action: CareActionType | null) => void;
  setCareError: (message: string | null) => void;
  reset: () => void;
}

export const useCompanionStore = create<CompanionUiState>((set) => ({
  dialogue: null,
  pendingAction: null,
  careError: null,
  setDialogue: (dialogue) => set({ dialogue }),
  setPendingAction: (pendingAction) => set({ pendingAction }),
  setCareError: (careError) => set({ careError }),
  reset: () =>
    set({
      dialogue: null,
      pendingAction: null,
      careError: null,
    }),
}));
