/**
 * Keeps compiled resource packs (`.rmpack` bytes) in IndexedDB so the user only has to
 * import and compile them once per browser.
 */

const DB_NAME = "redstone-modeler";
const INFO = "packs";
const BLOBS = "blobs";
const META = "meta";
const OPEN_TIMEOUT_MS = 5000;

/** @returns {Promise<IDBDatabase>} */
function open() {
    return new Promise((resolve, reject) => {
        // Some browsers never answer when storage is blocked; do not wait forever
        const timer = setTimeout(() => reject(new Error("Browser storage did not respond")), OPEN_TIMEOUT_MS);
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(INFO, { keyPath: "id" });
            request.result.createObjectStore(BLOBS);
            request.result.createObjectStore(META);
        };
        request.onsuccess = () => {
            clearTimeout(timer);
            resolve(request.result);
        };
        request.onerror = () => {
            clearTimeout(timer);
            reject(request.error);
        };
        request.onblocked = () => {
            clearTimeout(timer);
            reject(new Error("Browser storage is blocked by another tab"));
        };
    });
}

/**
 * @param {string[]} stores
 * @param {IDBTransactionMode} mode
 * @param {(tx: IDBTransaction) => IDBRequest|void} work
 */
async function run(stores, mode, work) {
    const db = await open();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(stores, mode);
            const request = work(tx);
            tx.oncomplete = () => resolve(request?.result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }
    finally {
        db.close();
    }
}

/**
 * @typedef {object} PackInfo
 * @property {string} id
 * @property {string} name
 * @property {number} created
 * @property {number} size Bytes
 * @property {string[]} sources
 */

/**
 * Stable id for a list of source files.
 * @param {{name: string, size: number, lastModified?: number}[]} sources
 */
export async function fingerprint(sources) {
    const text = JSON.stringify(sources.map(s => [s.name, s.size, s.lastModified ?? 0]));
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Id for a pack that is known by its content.
 * @param {Uint8Array} bytes
 */
export async function hash_bytes(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** @returns {Promise<PackInfo[]>} Newest first */
export async function list_packs() {
    const infos = await run([INFO], "readonly", tx => tx.objectStore(INFO).getAll());
    return infos.sort((a, b) => b.created - a.created);
}

/**
 * @param {PackInfo} info
 * @param {Uint8Array} bytes
 */
export async function put_pack(info, bytes) {
    await run([INFO, BLOBS], "readwrite", (tx) => {
        tx.objectStore(INFO).put(info);
        tx.objectStore(BLOBS).put(bytes, info.id);
    });
}

/** @returns {Promise<Uint8Array|undefined>} */
export function get_pack_bytes(id) {
    return run([BLOBS], "readonly", tx => tx.objectStore(BLOBS).get(id));
}

export async function delete_pack(id) {
    await run([INFO, BLOBS, META], "readwrite", (tx) => {
        tx.objectStore(INFO).delete(id);
        tx.objectStore(BLOBS).delete(id);
    });
    if (await get_active() === id) {
        await set_active(null);
    }
}

export async function set_active(id) {
    await run([META], "readwrite", tx => tx.objectStore(META).put(id, "active"));
}

/** @returns {Promise<string|null>} */
export async function get_active() {
    return (await run([META], "readonly", tx => tx.objectStore(META).get("active"))) ?? null;
}

/**
 * The last model, kept here when it is too big for localStorage (which holds a few megabytes).
 * @param {string|null} text JSON of the model, or null to forget it
 */
export async function set_model(text) {
    await run([META], "readwrite", tx => text === null ? tx.objectStore(META).delete("model") : tx.objectStore(META).put(text, "model"));
}

/** @returns {Promise<string|null>} */
export async function get_model() {
    return (await run([META], "readonly", tx => tx.objectStore(META).get("model"))) ?? null;
}

/**
 * Asks the browser not to evict our data under storage pressure.
 * @returns {Promise<boolean>}
 */
export async function request_persistence() {
    try {
        return await navigator.storage?.persist?.() ?? false;
    }
    catch {
        return false;
    }
}
