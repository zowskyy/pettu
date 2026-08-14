import { create } from 'zustand';

export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
export type ArtStyle = 'cozy_storybook' | 'playful_3d' | 'pixel_adventure';

export interface OnboardingPhoto {
  id: string;
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileSizeBytes: number;
  contentHash: string;
  isFacial: boolean;
}

export interface OnboardingState {
  species: PetSpecies | null;
  name: string;
  breed: string;
  colorMarkings: string;
  photos: OnboardingPhoto[];
  personalityTraits: string[];
  favoriteThings: string[];
  quirk: string;
  nickname: string;
  artStyle: ArtStyle | null;
  companionId: string | null;

  setSpecies: (species: PetSpecies) => void;
  setIdentity: (fields: { name: string; breed?: string; colorMarkings?: string }) => void;
  addPhoto: (photo: OnboardingPhoto) => void;
  removePhoto: (id: string) => void;
  toggleFacial: (id: string) => void;
  setPersonalityTraits: (traits: string[]) => void;
  togglePersonalityTrait: (trait: string) => void;
  setFavoriteThings: (things: string[]) => void;
  toggleFavoriteThing: (thing: string) => void;
  setQuirk: (quirk: string) => void;
  setNickname: (nickname: string) => void;
  setArtStyle: (style: ArtStyle) => void;
  setCompanionId: (id: string) => void;
  reset: () => void;
}

const initialState = {
  species: null as PetSpecies | null,
  name: '',
  breed: '',
  colorMarkings: '',
  photos: [] as OnboardingPhoto[],
  personalityTraits: [] as string[],
  favoriteThings: [] as string[],
  quirk: '',
  nickname: '',
  artStyle: null as ArtStyle | null,
  companionId: null as string | null,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,

  setSpecies: (species) => set({ species }),

  setIdentity: ({ name, breed = '', colorMarkings = '' }) =>
    set({ name: name.trim(), breed: breed.trim(), colorMarkings: colorMarkings.trim() }),

  addPhoto: (photo) =>
    set((state) => ({
      photos: [...state.photos, photo],
    })),

  removePhoto: (id) =>
    set((state) => ({
      photos: state.photos.filter((p) => p.id !== id),
    })),

  toggleFacial: (id) =>
    set((state) => ({
      photos: state.photos.map((p) =>
        p.id === id ? { ...p, isFacial: !p.isFacial } : p,
      ),
    })),

  setPersonalityTraits: (traits) => set({ personalityTraits: traits }),

  togglePersonalityTrait: (trait) =>
    set((state) => ({
      personalityTraits: state.personalityTraits.includes(trait)
        ? state.personalityTraits.filter((t) => t !== trait)
        : [...state.personalityTraits, trait],
    })),

  setFavoriteThings: (things) => set({ favoriteThings: things }),

  toggleFavoriteThing: (thing) =>
    set((state) => ({
      favoriteThings: state.favoriteThings.includes(thing)
        ? state.favoriteThings.filter((t) => t !== thing)
        : [...state.favoriteThings, thing],
    })),

  setQuirk: (quirk) => set({ quirk: quirk.trim() }),
  setNickname: (nickname) => set({ nickname: nickname.trim() }),
  setArtStyle: (style) => set({ artStyle: style }),
  setCompanionId: (id) => set({ companionId: id }),

  reset: () => set(initialState),
}));
