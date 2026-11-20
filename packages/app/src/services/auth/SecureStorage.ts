import { invoke, isTauri } from "@tauri-apps/api/core";

const DATABASE = "gitpulse-secure-storage";
const STORE = "vault";
const AAD = new TextEncoder().encode("gitpulse/auth-vault/v1");
interface Envelope {
  version: 1;
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: ArrayBuffer;
}

// Android uses the WebView’s non-exportable Web Crypto key; the Rust keyring backend supports desktop and iOS.
function usesSystemVault() {
  return isTauri() && !/Android/i.test(navigator.userAgent);
}

function cryptoProvider() {
  if (!globalThis.crypto?.subtle || !globalThis.indexedDB)
    throw new Error(
      "当前环境不支持加密存储，请使用原生应用或安全的浏览器环境。",
    );
  return globalThis.crypto;
}
function openDatabase(): Promise<IDBDatabase> {
  cryptoProvider();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("无法打开加密存储，请允许本地存储后重试。"));
    request.onblocked = () =>
      reject(new Error("加密存储正在被其他窗口使用，请重试。"));
  });
}
function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () =>
      reject(new Error("无法保存加密账号数据，请重试。"));
  });
}
async function readEntries(db: IDBDatabase) {
  const tx = db.transaction(STORE, "readonly");
  const done = transactionDone(tx);
  const key = tx.objectStore(STORE).get("key");
  const session = tx.objectStore(STORE).get("session");
  await done;
  return {
    key: key.result as CryptoKey | undefined,
    session: session.result as Envelope | undefined,
  };
}

export const SecureStorage = {
  async read(): Promise<string | null> {
    if (usesSystemVault()) return invoke<string | null>("read_auth_vault");
    const db = await openDatabase();
    try {
      const { key, session } = await readEntries(db);
      if (!session) return null;
      if (!key || session.version !== 1 || session.iv.byteLength !== 12)
        throw new Error("加密账号数据已损坏，无法读取");
      try {
        const plaintext = await cryptoProvider().subtle.decrypt(
          { name: "AES-GCM", iv: session.iv, additionalData: AAD },
          key,
          session.ciphertext,
        );
        return new TextDecoder().decode(plaintext);
      } catch {
        throw new Error("加密账号数据校验失败，无法读取");
      }
    } finally {
      db.close();
    }
  },
  async write(value: string): Promise<void> {
    if (usesSystemVault()) return invoke("write_auth_vault", { value });
    const crypto = cryptoProvider();
    const db = await openDatabase();
    try {
      const stored = await readEntries(db);
      let key = stored.key;
      if (!key) {
        const candidate = await crypto.subtle.generateKey(
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"],
        );
        // Recheck in a write transaction so simultaneous tabs cannot replace an existing key.
        const tx = db.transaction(STORE, "readwrite");
        const done = transactionDone(tx);
        const request = tx.objectStore(STORE).get("key");
        request.onsuccess = () => {
          key = request.result || candidate;
          if (!request.result) tx.objectStore(STORE).put(key, "key");
        };
        await done;
      }
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: AAD },
        key!,
        new TextEncoder().encode(value),
      );
      const tx = db.transaction(STORE, "readwrite");
      const done = transactionDone(tx);
      // Store key and ciphertext atomically, including when another tab just signed out.
      tx.objectStore(STORE).put(key, "key");
      tx.objectStore(STORE).put(
        { version: 1, iv, ciphertext } satisfies Envelope,
        "session",
      );
      await done;
    } finally {
      db.close();
    }
  },
  async clear(): Promise<void> {
    if (usesSystemVault()) return invoke("clear_auth_vault");
    const db = await openDatabase();
    try {
      const tx = db.transaction(STORE, "readwrite");
      const done = transactionDone(tx);
      tx.objectStore(STORE).clear();
      await done;
    } finally {
      db.close();
    }
  },
};
