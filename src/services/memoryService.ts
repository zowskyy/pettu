import { supabase } from '@/lib/supabase';

export interface MemoryRecord {
  id: string;
  companion_id: string;
  created_by: string;
  title: string;
  note: string | null;
  memory_date: string;
  photo_bucket: string | null;
  photo_path: string | null;
  caption: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemoryPage {
  items: MemoryRecord[];
  nextCursor: string | null;
}

export interface CreateMemoryInput {
  companionId: string;
  title: string;
  note?: string | null;
  memoryDate: string;
}

const PAGE_SIZE = 20;

const MEMORY_SELECT =
  'id, companion_id, created_by, title, note, memory_date, photo_bucket, photo_path, caption, is_favorite, created_at, updated_at';

function createIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function fetchMemoryPage(
  companionId: string,
  cursor: string | null = null,
): Promise<MemoryPage> {
  let query = supabase
    .from('memories')
    .select(MEMORY_SELECT)
    .eq('companion_id', companionId)
    .is('deleted_at', null)
    .order('memory_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) {
    query = query.lt('memory_date', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const items = (data ?? []) as MemoryRecord[];
  const last = items[items.length - 1];
  const nextCursor =
    items.length === PAGE_SIZE && last ? last.memory_date : null;

  return { items, nextCursor };
}

export async function createMemory(
  input: CreateMemoryInput,
  userId: string,
): Promise<MemoryRecord> {
  const idempotencyKey = createIdempotencyKey('memory');

  const { data, error } = await supabase
    .from('memories')
    .insert({
      companion_id: input.companionId,
      created_by: userId,
      title: input.title.trim(),
      note: input.note?.trim() || null,
      memory_date: input.memoryDate,
    })
    .select(MEMORY_SELECT)
    .single();

  if (error) {
    void idempotencyKey;
    throw error;
  }

  return data as MemoryRecord;
}

export async function deleteMemory(memoryId: string): Promise<void> {
  const { error } = await supabase
    .from('memories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', memoryId);

  if (error) throw error;
}

export async function toggleMemoryFavorite(
  memoryId: string,
  isFavorite: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('memories')
    .update({ is_favorite: isFavorite })
    .eq('id', memoryId);

  if (error) throw error;
}

export { PAGE_SIZE as MEMORY_PAGE_SIZE };
