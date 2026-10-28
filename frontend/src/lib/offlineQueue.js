const DB_NAME = 'ChatKaroOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_messages';

let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this browser environment'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'tempId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

// In-memory fallback if IndexedDB is unavailable or restricted
const memoryStore = new Map();

export async function saveOfflineMessage(item) {
  if (!item?.tempId) return;
  memoryStore.set(item.tempId, item);
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveOfflineMessage fallback to memory store:', err?.message);
    return true;
  }
}

export async function getOfflineMessages() {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? req.result : [];
        const combined = new Map();
        list.forEach((m) => combined.set(m.tempId, m));
        memoryStore.forEach((m, id) => {
          if (!combined.has(id)) combined.set(id, m);
        });
        const result = Array.from(combined.values()).sort(
          (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getOfflineMessages fallback to memory store:', err?.message);
    return Array.from(memoryStore.values()).sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
  }
}

export async function removeOfflineMessage(tempId) {
  if (!tempId) return;
  memoryStore.delete(tempId);
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(tempId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('removeOfflineMessage fallback error:', err?.message);
    return true;
  }
}

export async function clearAllOfflineMessages() {
  memoryStore.clear();
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('clearAllOfflineMessages fallback error:', err?.message);
    return true;
  }
}
