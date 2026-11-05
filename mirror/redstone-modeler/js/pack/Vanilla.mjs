import { Pack } from "./Pack.mjs?v=462b4e5";

/**
 * Gets the textures, models and block states of the game from Mojang, into the browser of the user
 * who asked for it. Nothing is bundled or forwarded. Block textures and models are only in the
 * client jar; the download service for single files has the languages.
 */

export const MANIFEST_URL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const OBJECTS_URL = "https://resources.download.minecraft.net";
const MAX_JSON = 8 * 1024 * 1024;
const MAX_JAR = 512 * 1024 * 1024;
const MAX_LANG = 8 * 1024 * 1024;
const TIMEOUT = 60_000;
const ID = /^[A-Za-z0-9._ -]{1,64}$/;
const HASH = /^[0-9a-f]{40}$/;

/** `kind`: network, http, format, too_big, changed, version */
export class VanillaError extends Error {
    constructor(kind, message, detail = {}) {
        super(message);
        this.name = "VanillaError";
        this.kind = kind;
        Object.assign(this, detail);
    }
}

const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");

async function sha1(bytes) {
    return hex(await crypto.subtle.digest("SHA-1", bytes));
}

async function request(fetch_fn, url) {
    const controller = new AbortController();
    // The time to the first answer; a long download is not cut off by it
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
        const response = await fetch_fn(url, { credentials: "omit", referrerPolicy: "no-referrer", signal: controller.signal });
        if (!response.ok) {
            throw new VanillaError("http", `Mojang answered ${response.status}`, { status: response.status });
        }
        return response;
    }
    catch (error) {
        if (error instanceof VanillaError) {
            throw error;
        }
        throw new VanillaError("network", controller.signal.aborted ? "Mojang did not answer in time" : "Mojang could not be reached (offline, blocked, or it does not allow this page to ask)", { cause: error });
    }
    finally {
        clearTimeout(timer);
    }
}

/**
 * @param {Response} response
 * @param {number} max
 * @param {(done: number, total: number) => void} [progress]
 */
async function read_bytes(response, max, progress = () => {}) {
    const total = Number(response.headers?.get?.("content-length")) || 0;
    if (total > max) {
        throw new VanillaError("too_big", "The download is too big");
    }
    const chunks = [];
    let done = 0;
    if (response.body?.getReader) {
        const reader = response.body.getReader();
        for (;;) {
            const { value, done: finished } = await reader.read();
            if (finished) {
                break;
            }
            done += value.length;
            if (done > max) {
                await reader.cancel();
                throw new VanillaError("too_big", "The download is too big");
            }
            chunks.push(value);
            progress(done, total);
        }
    }
    else {
        const all = new Uint8Array(await response.arrayBuffer());
        if (all.length > max) {
            throw new VanillaError("too_big", "The download is too big");
        }
        chunks.push(all);
        done = all.length;
    }
    const out = new Uint8Array(done);
    let at = 0;
    for (const chunk of chunks) {
        out.set(chunk, at);
        at += chunk.length;
    }
    return out;
}

async function get_json(fetch_fn, url) {
    const bytes = await read_bytes(await request(fetch_fn, url), MAX_JSON);
    try {
        return JSON.parse(new TextDecoder().decode(bytes));
    }
    catch {
        throw new VanillaError("format", "Mojang answered with something that is not understood");
    }
}

/** Only Mojang's own hosts are followed; the answers are data, not instructions. */
function mojang_url(text) {
    let url;
    try {
        url = new URL(text);
    }
    catch {
        throw new VanillaError("format", "Mojang answered with an address that is not understood");
    }
    if (url.protocol !== "https:" || !/(^|\.)(mojang\.com|minecraft\.net)$/.test(url.hostname)) {
        throw new VanillaError("format", "Mojang answered with an address that is not theirs");
    }
    return url.href;
}

/**
 * @param {typeof fetch} [fetch_fn]
 * @returns {Promise<{latest: string, versions: {id: string, url: string}[]}>} Releases, newest first
 */
export async function list_versions(fetch_fn = fetch) {
    const manifest = await get_json(fetch_fn, MANIFEST_URL);
    const versions = (Array.isArray(manifest?.versions) ? manifest.versions : [])
        .filter(v => v?.type === "release" && typeof v.id === "string" && ID.test(v.id) && typeof v.url === "string")
        .map(v => ({ id: v.id, url: v.url }));
    const latest = manifest?.latest?.release;
    if (versions.length === 0 || typeof latest !== "string") {
        throw new VanillaError("format", "Mojang's list of versions is not in a form that is understood");
    }
    return { latest, versions };
}

/**
 * Downloads the client of a version and reads its assets.
 * @param {object} options
 * @param {string} options.version A version id, or "latest" for the newest release
 * @param {string[]} [options.languages] Codes such as `zh_cn`; `en_us` is in the jar itself
 * @param {typeof fetch} [options.fetch_fn]
 * @param {(stage: "versions"|"jar"|"read"|"languages", done?: number, total?: number, version?: string) => void} [options.progress]
 * @returns {Promise<{name: string, version: string, pack: Pack, languages: string[]}>}
 */
export async function fetch_vanilla({ version, languages = [], fetch_fn = fetch, progress = () => {} }) {
    progress("versions");
    const { latest, versions } = await list_versions(fetch_fn);
    const id = version === "latest" ? latest : version;
    const entry = versions.find(v => v.id === id);
    if (!entry) {
        throw new VanillaError("version", `Mojang has no release ${id}`);
    }
    const info = await get_json(fetch_fn, mojang_url(entry.url));
    const client = info?.downloads?.client;
    if (typeof client?.url !== "string" || !HASH.test(client.sha1 ?? "")) {
        throw new VanillaError("format", "Mojang's description of this version has no client");
    }
    const jar = await read_bytes(await request(fetch_fn, mojang_url(client.url)), MAX_JAR, (done, total) => progress("jar", done, total || client.size, id));
    if (await sha1(jar) !== client.sha1) {
        throw new VanillaError("changed", "The download is not what Mojang announced");
    }
    progress("read", 0, 0, id);
    const pack = Pack.from_zip(`Minecraft ${id}`, jar, { jar: true });

    const got = [];
    const wanted = [...new Set(languages)].filter(code => /^[a-z0-9_]{2,12}$/.test(code) && code !== "en_us");
    if (wanted.length > 0 && typeof info.assetIndex?.url === "string") {
        progress("languages", 0, 0, id);
        try {
            const index = await get_json(fetch_fn, mojang_url(info.assetIndex.url));
            for (const code of wanted) {
                const object = index?.objects?.[`minecraft/lang/${code}.json`];
                if (typeof object?.hash !== "string" || !HASH.test(object.hash)) {
                    continue;
                }
                const bytes = await read_bytes(await request(fetch_fn, `${OBJECTS_URL}/${object.hash.slice(0, 2)}/${object.hash}`), MAX_LANG);
                if (await sha1(bytes) === object.hash) {
                    pack.files.set(`assets/minecraft/lang/${code}.json`, bytes);
                    got.push(code);
                }
            }
        }
        catch (error) {
            // The names of other languages are a bonus; the textures are what was asked for
            console.warn("Could not get the block names of other languages", error);
        }
    }
    return { name: pack.name, version: id, pack, languages: got };
}
