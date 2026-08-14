export type CatalogCategory = 'accessory' | 'room';

export type CatalogItem = {
  id: string;
  displayName: string;
  category: CatalogCategory;
  pawPointsCost: number;
  isFree: boolean;
  isPremium: boolean;
  description: string;
  previewEmoji: string;
};

/** Free catalog items per Slice 26 spec. */
export const FREE_CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'blue_bandana',
    displayName: 'Blue Bandana',
    category: 'accessory',
    pawPointsCost: 0,
    isFree: true,
    isPremium: false,
    description: 'A cozy blue bandana for everyday adventures.',
    previewEmoji: '🧣',
  },
  {
    id: 'yellow_raincoat',
    displayName: 'Yellow Raincoat',
    category: 'accessory',
    pawPointsCost: 0,
    isFree: true,
    isPremium: false,
    description: 'Stay dry on rainy-day walks.',
    previewEmoji: '🌧️',
  },
  {
    id: 'red_bow_tie',
    displayName: 'Red Bow Tie',
    category: 'accessory',
    pawPointsCost: 0,
    isFree: true,
    isPremium: false,
    description: 'Dress up for special moments.',
    previewEmoji: '🎀',
  },
  {
    id: 'plant_filled_room',
    displayName: 'Plant-Filled Room',
    category: 'room',
    pawPointsCost: 0,
    isFree: true,
    isPremium: false,
    description: 'A lush indoor garden retreat.',
    previewEmoji: '🪴',
  },
  {
    id: 'starry_night_room',
    displayName: 'Starry Night Room',
    category: 'room',
    pawPointsCost: 0,
    isFree: true,
    isPremium: false,
    description: 'Drift off under a gentle night sky.',
    previewEmoji: '🌙',
  },
  {
    id: 'beach_room',
    displayName: 'Beach Room',
    category: 'room',
    pawPointsCost: 0,
    isFree: true,
    isPremium: false,
    description: 'Sandy shores and ocean breezes.',
    previewEmoji: '🏖️',
  },
];

export const PREMIUM_CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'golden_crown',
    displayName: 'Golden Crown',
    category: 'accessory',
    pawPointsCost: 50,
    isFree: false,
    isPremium: true,
    description: 'Royal flair for your companion.',
    previewEmoji: '👑',
  },
  {
    id: 'castle_room',
    displayName: 'Castle Room',
    category: 'room',
    pawPointsCost: 75,
    isFree: false,
    isPremium: true,
    description: 'A majestic castle backdrop.',
    previewEmoji: '🏰',
  },
];

export const SHOP_CATALOG: CatalogItem[] = [...FREE_CATALOG_ITEMS, ...PREMIUM_CATALOG_ITEMS];

export function getCatalogItem(catalogItemId: string): CatalogItem | undefined {
  return SHOP_CATALOG.find((item) => item.id === catalogItemId);
}

export function getCatalogByCategory(category: CatalogCategory): CatalogItem[] {
  return SHOP_CATALOG.filter((item) => item.category === category);
}
