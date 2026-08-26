import {
  patientVision360SavedItemsSchema,
  type PatientVision360SavedItem,
} from "../types/patientVision360.types";

const DATABASE_NAME = "primordial-data-preview";
const DATABASE_VERSION = 1;
const STORE_NAME = "saved-insights";

type SavedItemsRecord = {
  scope: string;
  items: PatientVision360SavedItem[];
  updatedAt: string;
};

let databasePromise: Promise<IDBDatabase> | undefined;
let writeQueue: Promise<unknown> = Promise.resolve();

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "scope" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Falha ao abrir o armazenamento local."));
    request.onblocked = () => reject(new Error("Armazenamento local bloqueado."));
  });
  return databasePromise;
}

async function readRecord(scope: string) {
  const database = await openDatabase();
  return await new Promise<SavedItemsRecord | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(scope);
    request.onsuccess = () => resolve(request.result as SavedItemsRecord | undefined);
    request.onerror = () => reject(new Error("Falha ao ler os itens salvos."));
  });
}

async function writeRecord(record: SavedItemsRecord) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("Falha ao persistir o item salvo."));
    transaction.onabort = () => reject(new Error("Persistência local interrompida."));
  });
}

function enqueueWrite<T>(operation: () => Promise<T>) {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function createSavedItemsScope(clinicId: string, patientId: string) {
  return `${clinicId}:${patientId}`;
}

export async function getLocalSavedItems(
  scope: string,
  seed: PatientVision360SavedItem[],
) {
  const current = await readRecord(scope);
  if (current) return patientVision360SavedItemsSchema.parse(current.items);
  const safeSeed = patientVision360SavedItemsSchema.parse(seed);
  await writeRecord({
    scope,
    items: safeSeed,
    updatedAt: new Date().toISOString(),
  });
  return safeSeed;
}

export async function saveLocalItem(
  scope: string,
  item: PatientVision360SavedItem,
) {
  return await enqueueWrite(async () => {
    const current = await readRecord(scope);
    const items = patientVision360SavedItemsSchema.parse([
      item,
      ...(current?.items ?? []),
    ]);
    await writeRecord({ scope, items, updatedAt: new Date().toISOString() });
    return item;
  });
}

export async function deleteLocalItem(scope: string, itemId: string) {
  await enqueueWrite(async () => {
    const current = await readRecord(scope);
    const items = patientVision360SavedItemsSchema.parse(
      (current?.items ?? []).filter((item) => item.id !== itemId),
    );
    await writeRecord({ scope, items, updatedAt: new Date().toISOString() });
  });
}
