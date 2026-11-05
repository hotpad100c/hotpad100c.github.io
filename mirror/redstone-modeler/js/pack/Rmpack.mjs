import { strFromU8, strToU8, unzipSync, zipSync } from "../../lib/fflate.module.js?v=462b4e5";

export const FORMAT_VERSION = 1;

/**
 * `.rmpack` is a zip holding the compiled result of a resource pack stack:
 * `data.json` (blockstates, flattened models, property index, atlas layout),
 * `atlas.png`, optional `colormap/*.png` and `lang/<code>.json` (block names of one language each).
 * @param {object} data
 * @param {Uint8Array} atlas_png
 * @param {Record<string, Uint8Array>} colormaps File name to PNG bytes
 * @param {Record<string, Uint8Array>} lang Language code to the JSON bytes of `{block id: name}`
 * @param {Record<string, Uint8Array>} extra More files, for example `world.json` of a shared model
 * @returns {Uint8Array}
 */
export function write_rmpack(data, atlas_png, colormaps = {}, lang = {}, extra = {}) {
    const files = {
        "data.json": strToU8(JSON.stringify({ ...data, format: FORMAT_VERSION })),
        "atlas.png": [atlas_png, { level: 0 }],
    };
    for (const [name, bytes] of Object.entries(colormaps)) {
        files[`colormap/${name}`] = [bytes, { level: 0 }];
    }
    for (const [code, bytes] of Object.entries(lang)) {
        files[`lang/${code}.json`] = bytes;
    }
    for (const [path, bytes] of Object.entries(extra)) {
        files[path] = bytes;
    }
    return zipSync(files, { level: 9 });
}

/**
 * Whether bytes are a compiled pack (`.rmpack`, `.rmmodel`), whatever the file is called:
 * a zip with `data.json` and `atlas.png` at the top. Browsers and chat apps rename files.
 * @param {Uint8Array} bytes
 */
export function is_rmpack(bytes) {
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && has_entries(bytes, ["data.json", "atlas.png"]);
}

/** Looks at the names in the zip without unpacking anything. */
function has_entries(bytes, names) {
    const seen = new Set();
    try {
        unzipSync(bytes, {
            filter: (file) => {
                if (names.includes(file.name)) {
                    seen.add(file.name);
                }
                return false;
            },
        });
    }
    catch {
        return false;
    }
    return names.every(name => seen.has(name));
}

const MAX_UNPACKED = 256 * 1024 * 1024;
const MAX_FILES = 1000;

/**
 * @param {Uint8Array} bytes
 * @param {number} [max_size] Limit for the size of everything unpacked, in bytes
 */
export function read_rmpack(bytes, max_size = MAX_UNPACKED) {
    let total = 0;
    let count = 0;
    const files = unzipSync(bytes, {
        filter: (file) => {
            total += file.originalSize;
            if (total > max_size || ++count > MAX_FILES) {
                throw new Error("The file is too big or has too many parts");
            }
            return true;
        },
    });
    if (!files["data.json"] || !files["atlas.png"]) {
        throw new Error("Not a valid .rmpack file");
    }
    const data = JSON.parse(strFromU8(files["data.json"]));
    if (data.format !== FORMAT_VERSION) {
        throw new Error(`Unsupported .rmpack format ${data.format}`);
    }
    const colormaps = {};
    const lang = {};
    for (const [path, content] of Object.entries(files)) {
        if (path.startsWith("colormap/")) {
            colormaps[path.slice("colormap/".length)] = content;
        }
        else if (path.startsWith("lang/") && path.endsWith(".json")) {
            lang[path.slice("lang/".length, -".json".length)] = content;
        }
    }
    const world = files["world.json"] ? JSON.parse(strFromU8(files["world.json"])) : null;
    return { data, atlas_png: files["atlas.png"], colormaps, lang, world };
}
