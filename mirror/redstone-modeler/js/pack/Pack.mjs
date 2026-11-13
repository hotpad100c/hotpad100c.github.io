import { strFromU8, unzipSync } from "../../lib/fflate.module.js?v=462b4e5";

const WANTED = /\.(json|png|mcmeta)$/i;
// Mods that carry other mods inside them (Jar-in-Jar)
const NESTED_JAR = /^META-INF\/(jars|jarjar)\/[^/]+\.jar$/i;
const MAX_NESTED = 32;
const MAX_NESTED_BYTES = 256 * 1024 * 1024;

/**
 * Lenient JSON parser. Minecraft reads JSON leniently, so packs in the wild
 * contain comments, trailing commas and byte order marks.
 * @param {string} text
 */
export function parse_json(text) {
    text = text.replace(/^\u{FEFF}/u, "");
    try {
        return JSON.parse(text);
    }
    catch {
        let out = "";
        let in_string = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (in_string) {
                out += c;
                if (c === "\\") {
                    out += text[++i] ?? "";
                }
                else if (c === "\"") {
                    in_string = false;
                }
            }
            else if (c === "\"") {
                in_string = true;
                out += c;
            }
            else if (c === "/" && text[i + 1] === "/") {
                while (i < text.length && text[i] !== "\n") {
                    i++;
                }
            }
            else if (c === "/" && text[i + 1] === "*") {
                i = text.indexOf("*/", i + 2);
                i = i < 0 ? text.length : i + 1;
            }
            else {
                out += c;
            }
        }
        return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
    }
}

const ASSET_KINDS = new Set(["blockstates", "models", "textures"]);

/**
 * Finds the resource files in an archive or folder listing and maps them to `assets/...` paths.
 *
 * The `assets` folder is searched level by level: at the top, then one folder down, then deeper, so
 * `assets/`, `MyPack/assets/` and `mod/src/main/resources/assets/` all work. Only the shallowest
 * level that has an `assets` folder counts; several `assets` folders at that level (for example
 * the modules of a mod repository) are merged and the first file wins.
 * If there is no `assets` folder at all, folders that look like namespaces (they hold
 * `blockstates`, `models` or `textures`) are used, which covers a zip of the contents of `assets`.
 * @param {string[]} paths
 * @returns {Map<string, string>} Original path to normalized path
 */
export function locate_assets(paths) {
    const find = (segments, is_root) => {
        for (let i = 0; i < segments.length - 2; i++) {
            if (is_root(segments, i)) {
                return i;
            }
        }
        return -1;
    };
    const attempts = [
        {
            is_root: (segments, i) => segments[i] === "assets",
            normalize: (segments, i) => segments.slice(i).join("/"),
        },
        {
            is_root: (segments, i) => ASSET_KINDS.has(segments[i + 1]) && i + 2 < segments.length,
            normalize: (segments, i) => `assets/${segments.slice(i).join("/")}`,
        },
    ];
    for (const { is_root, normalize } of attempts) {
        const found = [];
        for (const path of paths) {
            const segments = path.split("/");
            const depth = find(segments, is_root);
            if (depth >= 0) {
                found.push({ path, depth, normalized: normalize(segments, depth) });
            }
        }
        if (found.length > 0) {
            const shallowest = Math.min(...found.map(f => f.depth));
            const result = new Map();
            for (const { path, depth, normalized } of found) {
                if (depth === shallowest) {
                    result.set(path, normalized);
                }
            }
            return result;
        }
    }
    return new Map();
}

/**
 * Keeps the first file for every normalized path.
 * @param {{path: string, data: Uint8Array}[]} entries
 */
function normalize_entries(entries) {
    const located = locate_assets(entries.map(e => e.path));
    const files = new Map();
    for (const { path, data } of entries) {
        const normalized = located.get(path);
        if (normalized && !files.has(normalized)) {
            files.set(normalized, data);
        }
    }
    return files;
}

/**
 * A single resource pack held in memory. Paths look like `assets/minecraft/models/block/stone.json`.
 */
export class Pack {
    /**
     * @param {string} name
     * @param {Map<string, Uint8Array>} files
     */
    constructor(name, files) {
        this.name = name;
        this.files = files;
        this.json_cache = new Map();
    }

    /**
     * @param {string} name
     * @param {Uint8Array} bytes
     * @param {object} [options]
     * @param {boolean} [options.jar] A mod or game jar: only what is under `assets/` is read, and so are the
     *   mods inside it. The classes, recipes and everything else are skipped without being unpacked.
     */
    static from_zip(name, bytes, { jar = false } = {}) {
        if (!jar) {
            const raw = unzipSync(bytes, {
                filter: file => WANTED.test(file.name) && !file.name.endsWith("/"),
            });
            return new Pack(name, normalize_entries(Object.entries(raw).map(([path, data]) => ({ path, data }))));
        }
        const wanted = file => WANTED.test(file.name) && file.name.startsWith("assets/");
        let nested_count = 0;
        let nested_bytes = 0;
        const raw = unzipSync(bytes, {
            filter: (file) => {
                if (NESTED_JAR.test(file.name)) {
                    nested_bytes += file.originalSize;
                    return ++nested_count <= MAX_NESTED && nested_bytes <= MAX_NESTED_BYTES;
                }
                return wanted(file);
            },
        });
        const entries = [];
        for (const [path, data] of Object.entries(raw)) {
            if (NESTED_JAR.test(path)) {
                // One level only; a bad inner jar must not spoil the rest
                try {
                    const inner = unzipSync(data, { filter: wanted });
                    entries.push(...Object.entries(inner).map(([inner_path, inner_data]) => ({ path: inner_path, data: inner_data })));
                }
                catch (error) {
                    console.warn(`Could not read ${path} inside ${name}`, error);
                }
            }
            else {
                entries.push({ path, data });
            }
        }
        return new Pack(name, normalize_entries(entries));
    }

    /**
     * Reads a folder picked with `<input webkitdirectory>`.
     * @param {string} name
     * @param {File[]} file_list
     */
    static async from_files(name, file_list) {
        // The picked folder itself stays in the path: it may be the `assets` folder
        const entries = file_list
            .map(file => ({ file, path: file.webkitRelativePath || file.name }))
            .filter(({ path }) => WANTED.test(path));
        const loaded = await Promise.all(entries.map(async ({ file, path }) => ({
            path,
            data: new Uint8Array(await file.arrayBuffer()),
        })));
        const files = normalize_entries(loaded);
        return new Pack(name, files);
    }

    has(path) {
        return this.files.has(path);
    }

    get(path) {
        return this.files.get(path);
    }

    paths() {
        return this.files.keys();
    }

    json(path) {
        if (!this.json_cache.has(path)) {
            const data = this.files.get(path);
            let value;
            if (data) {
                try {
                    value = parse_json(strFromU8(data));
                }
                catch {
                    console.warn(`Invalid JSON in ${this.name}: ${path}`);
                }
            }
            this.json_cache.set(path, value);
        }
        return this.json_cache.get(path);
    }
}
