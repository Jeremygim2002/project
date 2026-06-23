export type SessionRole = 'ADMIN' | 'USER';

export type StoredSession = {
  token: string;
  role: SessionRole | null;
  mypeId: string | null;
  estadoRegistro: string | null;
};

const SESSION_KEY = 'fazil.session';
let memorySession: StoredSession | null = null;

export async function saveSession(session: StoredSession) {
  memorySession = session;

  const secureStore = await getSecureStore();

  if (secureStore) {
    await secureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  }
}

export async function getStoredSession(): Promise<StoredSession | null> {
  const secureStore = await getSecureStore();
  const rawSession = secureStore
    ? await secureStore.getItemAsync(SESSION_KEY)
    : null;

  if (!rawSession) {
    return memorySession;
  }

  try {
    return JSON.parse(rawSession) as StoredSession;
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function clearStoredSession() {
  memorySession = null;

  const secureStore = await getSecureStore();

  if (secureStore) {
    await secureStore.deleteItemAsync(SESSION_KEY);
  }
}

export function isProfileComplete(session?: StoredSession | null) {
  return Boolean(session?.token && session.mypeId && session.role);
}

async function getSecureStore() {
  try {
    return await import('expo-secure-store');
  } catch {
    return null;
  }
}
