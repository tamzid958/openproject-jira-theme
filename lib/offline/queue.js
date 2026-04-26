"use client";

// Offline-friendly mutation queue.
//
// Persists pending mutations to IndexedDB so a user who edits work
// packages on a flaky train tunnel doesn't lose their changes when the
// tab closes or the page refreshes. When the browser comes back online
// (`window.online` event) the runner drains the queue, replaying each
// mutation against the original API endpoint.
//
// We deliberately use the route handlers (`/api/openproject/*`) for
// replay rather than Server Actions because the route handlers are
// idempotent given the same input and have a stable, payload-identifiable
// URL — easy to inspect in devtools, easy to authenticate the same way
// across all queued items.
//
// Storage shape (IndexedDB store `mutations`):
//   { id: number (auto), kind: string, payload: object, queuedAt: number,
//     attempts: number, lastError?: string }
//
// `kind` is a stable identifier from `KIND_REPLAY_MAP` below — adding a
// new kind requires adding a replay entry, otherwise the runner skips
// the row and surfaces an error.

const DB_NAME = "opira-offline";
const STORE = "mutations";
const VERSION = 1;

let _db = null;
function openDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => resolve(null);
  });
}

export function isOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

export async function enqueueOfflineMutation({ kind, payload }) {
  const db = await openDb();
  if (!db) return null;
  const row = {
    kind,
    payload,
    queuedAt: Date.now(),
    attempts: 0,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(row);
    req.onsuccess = () => {
      const id = req.result;
      window.dispatchEvent(new CustomEvent("opira:offline-queue-changed"));
      resolve(id);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listQueuedMutations() {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedMutation(id) {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => {
      window.dispatchEvent(new CustomEvent("opira:offline-queue-changed"));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateQueuedMutation(id, patch) {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const row = getReq.result;
      if (!row) return resolve();
      const next = { ...row, ...patch };
      const putReq = store.put(next);
      putReq.onsuccess = () => {
        window.dispatchEvent(new CustomEvent("opira:offline-queue-changed"));
        resolve();
      };
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// Replay table — kind → fetch function. Each entry returns a Promise; on
// success the row is removed from the queue. On failure the runner
// increments `attempts` and waits for the next online tick.
const KIND_REPLAY_MAP = {
  "task.update": ({ id, patch }) =>
    fetch(`/api/openproject/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(patch),
    }),
  "task.delete": ({ id }) =>
    fetch(`/api/openproject/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    }),
  "task.create": (data) =>
    fetch("/api/openproject/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data),
    }),
};

export async function replayMutation(row) {
  const replayer = KIND_REPLAY_MAP[row.kind];
  if (!replayer) {
    throw new Error(`Unknown queued mutation kind: ${row.kind}`);
  }
  const res = await replayer(row.payload);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || `Replay failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res;
}

export async function drainQueue({ onProgress } = {}) {
  if (!isOnline()) return { processed: 0, failed: 0 };
  const rows = await listQueuedMutations();
  let processed = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await replayMutation(row);
      await removeQueuedMutation(row.id);
      processed += 1;
      onProgress?.({ row, ok: true });
    } catch (e) {
      // 4xx errors are usually permanent (validation, auth) — bumping
      // attempts indefinitely would loop forever. Drop after 3 tries.
      const next = (row.attempts ?? 0) + 1;
      if (next >= 3 || (e.status >= 400 && e.status < 500 && e.status !== 408)) {
        await removeQueuedMutation(row.id);
        failed += 1;
        onProgress?.({ row, ok: false, error: e });
      } else {
        await updateQueuedMutation(row.id, {
          attempts: next,
          lastError: e?.message || String(e),
        });
      }
      // Don't keep hammering once we've had a network-class failure —
      // the next online event will reschedule.
      if (e?.status === 0 || !navigator.onLine) break;
    }
  }
  return { processed, failed };
}
