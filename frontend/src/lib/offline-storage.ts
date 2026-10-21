import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { OfflineEvent, OfflineEventStatus } from '../types/offline';

const DB_NAME = 'sgms_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_events';

interface SgmsDbSchema extends DBSchema {
  pending_events: {
    key: string;
    value: OfflineEvent;
    indexes: {
      'by-status': OfflineEventStatus;
      'by-created-at': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<SgmsDbSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<SgmsDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<SgmsDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'clientUuid' });
          store.createIndex('by-status', 'status');
          store.createIndex('by-created-at', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export class OfflineStorage {
  /**
   * Salva um evento transacional no buffer do IndexedDB com status PENDING
   */
  static async saveEvent(event: OfflineEvent): Promise<void> {
    const db = await getDb();
    await db.put(STORE_NAME, event);
  }

  /**
   * Recupera todos os eventos pendentes de sincronização
   */
  static async getPendingEvents(): Promise<OfflineEvent[]> {
    const db = await getDb();
    const events = await db.getAllFromIndex(STORE_NAME, 'by-status', 'PENDING');
    // Ordenação ascendente por data de criação
    return events.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  /**
   * Recupera todos os eventos gravados (pendentes e sincronizados)
   */
  static async getAllEvents(): Promise<OfflineEvent[]> {
    const db = await getDb();
    return db.getAll(STORE_NAME);
  }

  /**
   * Marca uma lista de eventos como sincronizados de forma transacional
   */
  static async markAsSynced(clientUuids: string[]): Promise<void> {
    if (clientUuids.length === 0) return;

    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const uuid of clientUuids) {
      const event = await store.get(uuid);
      if (event) {
        event.status = 'SYNCED';
        await store.put(event);
      }
    }

    await tx.done;
  }

  /**
   * Remove eventos que já foram sincronizados com sucesso
   */
  static async clearSyncedEvents(): Promise<void> {
    const db = await getDb();
    const syncedEvents = await db.getAllFromIndex(STORE_NAME, 'by-status', 'SYNCED');
    if (syncedEvents.length === 0) return;

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const event of syncedEvents) {
      await store.delete(event.clientUuid);
    }

    await tx.done;
  }

  /**
   * Exclui um evento pontual pelo seu clientUuid
   */
  static async deleteEvent(clientUuid: string): Promise<void> {
    const db = await getDb();
    await db.delete(STORE_NAME, clientUuid);
  }

  /**
   * Retorna a quantidade de eventos atualmente pendentes
   */
  static async countPending(): Promise<number> {
    const db = await getDb();
    return db.countFromIndex(STORE_NAME, 'by-status', 'PENDING');
  }

  /**
   * Gera um UUID v4 criptograficamente seguro para o clientUuid
   */
  static generateUuid(): string {
    return crypto.randomUUID();
  }
}
