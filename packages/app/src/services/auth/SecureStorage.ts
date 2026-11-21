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
// A revision survives clear(), so an older encryption result cannot resurrect a
// deleted vault. The transaction commits ciphertext and revision together.
async function snapshot(db: IDBDatabase) {
  const tx = db.transaction(STORE, "readonly"),
    done = transactionDone(tx);
  const key = tx.objectStore(STORE).get("key"),
    session = tx.objectStore(STORE).get("session"),
    revision = tx.objectStore(STORE).get("revision");
  await done;
  return {
    key: key.result as CryptoKey | undefined,
    session: session.result as Envelope | undefined,
    revision: Number(revision.result) || 0,
  };
}
async function decrypt(
  key: CryptoKey | undefined,
  session: Envelope | undefined,
): Promise<string | null> {
  if (!session) return null;
  if (!key || session.version !== 1 || session.iv.byteLength !== 12)
    throw new Error("加密账号数据已损坏，无法读取");
  try {
    return new TextDecoder().decode(
      await cryptoProvider().subtle.decrypt(
        { name: "AES-GCM", iv: session.iv, additionalData: AAD },
        key,
        session.ciphertext,
      ),
    );
  } catch {
    throw new Error("加密账号数据校验失败，无法读取");
  }
}
export const SecureStorage = {
  async read(): Promise<string | null> {
    if (usesSystemVault()) return invoke<string | null>("read_auth_vault");
    const db = await openDatabase();
    try {
      const value = await snapshot(db);
      return await decrypt(value.key, value.session);
    } finally {
      db.close();
    }
  },
  /** transform is synchronous and may run again after a concurrent commit. */
  async update(
    transform: (current: string | null) => string | null,
    replace = false,
  ): Promise<string | null> {
    if (usesSystemVault()) {
      if (replace) {
        const value = transform(null);
        if (value === null) await invoke("clear_auth_vault");
        else await invoke("write_auth_vault", { value });
        return value;
      }
      for (let attempt = 0; attempt < 32; attempt++) {
        const expected = await SecureStorage.read();
        const value = transform(expected);
        if (value === expected) return value;
        if (await invoke<boolean>("compare_auth_vault", { expected, value }))
          return value;
      }
      throw new Error("账号数据正在其他窗口更新，请重试");
    }
    const db = await openDatabase();
    try {
      for (let attempt = 0; attempt < 32; attempt++) {
        const stored = await snapshot(db);
        const current = replace
          ? null
          : await decrypt(stored.key, stored.session);
        const value = transform(current);
        if (!replace && value === current) return value;
        let key = stored.key,
          session: Envelope | undefined;
        if (value !== null) {
          key ||= await cryptoProvider().subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"],
          );
          const iv = cryptoProvider().getRandomValues(new Uint8Array(12));
          const ciphertext = await cryptoProvider().subtle.encrypt(
            { name: "AES-GCM", iv, additionalData: AAD },
            key,
            new TextEncoder().encode(value),
          );
          session = { version: 1, iv, ciphertext };
        }
        const tx = db.transaction(STORE, "readwrite"),
          done = transactionDone(tx);
        const store = tx.objectStore(STORE),
          check = store.get("revision");
        let committed = false;
        check.onsuccess = () => {
          if ((Number(check.result) || 0) !== stored.revision) return;
          if (value === null) {
            store.delete("key");
            store.delete("session");
          } else {
            store.put(key, "key");
            store.put(session, "session");
          }
          store.put(stored.revision + 1, "revision");
          committed = true;
        };
        await done;
        if (committed) return value;
      }
      throw new Error("账号数据正在其他窗口更新，请重试");
    } finally {
      db.close();
    }
  },
  async write(value: string): Promise<void> {
    // Retain the low-level native API for migration/platform integrations.
    if (usesSystemVault()) return invoke("write_auth_vault", { value });
    await SecureStorage.update(() => value, true);
  },
  async clear(): Promise<void> {
    if (usesSystemVault()) return invoke("clear_auth_vault");
    await SecureStorage.update(() => null, true);
  },
};
