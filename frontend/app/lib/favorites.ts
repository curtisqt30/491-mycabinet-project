import AsyncStorage from '@react-native-async-storage/async-storage';

export type Favorite = {
  id: string;
  name: string;
  thumbUrl?: string | null;
  addedAt: number;
};

// User-specific key - will be set when user logs in
let currentUserId: string | number | null = null;

function getKey(): string {
  if (!currentUserId) {
    // Fallback for edge cases, but should not happen in normal flow
    console.warn('Favorites accessed without user ID set');
    return 'favorites:anonymous';
  }
  return `favorites:${currentUserId}`;
}

// Call this when user logs in
export function setFavoritesUser(userId: string | number | null) {
  currentUserId = userId;
  emit(); // Notify listeners to refresh with new user's data
}

// Call this when user logs out - clears the current user reference
export function clearFavoritesUser() {
  currentUserId = null;
  emit();
}

// Clear all local data for the current user
export async function clearUserCache(): Promise<void> {
  if (!currentUserId) return;
  
  const key = getKey();
  await AsyncStorage.removeItem(key);
  emit();
}

// Clear ALL favorites data (for all users) - use with caution
export async function clearAllFavoritesCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const favoriteKeys = allKeys.filter(k => k.startsWith('favorites:'));
    if (favoriteKeys.length > 0) {
      await AsyncStorage.multiRemove(favoriteKeys);
    }
    emit();
  } catch (error) {
    console.error('Failed to clear favorites cache:', error);
    throw error;
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();
function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function read(): Promise<Record<string, Favorite>> {
  try {
    const key = getKey();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

async function write(map: Record<string, Favorite>) {
  const key = getKey();
  await AsyncStorage.setItem(key, JSON.stringify(map));
  emit();
}

export async function listFavorites(): Promise<Favorite[]> {
  if (!currentUserId) return []; // No user, no favorites
  const map = await read();
  return Object.values(map).sort((a, b) => b.addedAt - a.addedAt);
}

export async function isFavorite(id: string): Promise<boolean> {
  if (!currentUserId) return false;
  const map = await read();
  return !!map[id];
}

export async function addFavorite(item: Omit<Favorite, 'addedAt'>) {
  if (!currentUserId) return;
  const map = await read();
  map[item.id] = { ...item, addedAt: Date.now() };
  await write(map);
}

export async function removeFavorite(id: string) {
  if (!currentUserId) return;
  const map = await read();
  if (map[id]) {
    delete map[id];
    await write(map);
  }
}

/** Toggle and return the *new* state (true if now favorited) */
export async function toggleFavorite(
  item: Omit<Favorite, 'addedAt'>,
): Promise<boolean> {
  if (!currentUserId) return false;
  const map = await read();
  const exists = !!map[item.id];
  if (exists) {
    delete map[item.id];
  } else {
    map[item.id] = { ...item, addedAt: Date.now() };
  }
  await write(map);
  return !exists;
}