/**
 * Splits `namespace:path` ids. Ids without a namespace belong to `minecraft`.
 * @param {string} id
 * @returns {[string, string]}
 */
export function split_id(id) {
    const colon = id.indexOf(":");
    return colon < 0 ? ["minecraft", id] : [id.slice(0, colon), id.slice(colon + 1)];
}

export function normalize_id(id) {
    const [ns, path] = split_id(id);
    return `${ns}:${path}`;
}

/**
 * @param {"blockstates"|"models"|"textures"} kind
 * @param {string} id
 * @param {string} ext
 */
export function asset_path(kind, id, ext) {
    const [ns, path] = split_id(id);
    return `assets/${ns}/${kind}/${path}.${ext}`;
}

/**
 * Resource packs layered like in Minecraft: the first pack (top) wins.
 */
export class PackStack {
    /**
     * @param {import("./Pack.mjs?v=462b4e5").Pack[]} layers Highest priority first
     */
    constructor(layers) {
        this.layers = layers;
    }

    /**
     * Raw bytes of the topmost file at this path.
     * @param {string} path
     */
    get(path) {
        for (const pack of this.layers) {
            const data = pack.get(path);
            if (data) {
                return data;
            }
        }
        return undefined;
    }

    /** Parsed JSON of the topmost layer that has the file. */
    json(path) {
        for (const pack of this.layers) {
            if (pack.has(path)) {
                const value = pack.json(path);
                if (value !== undefined) {
                    return value;
                }
            }
        }
        return undefined;
    }

    /** Parsed JSON from every layer that has the file, top first. */
    json_all(path) {
        const found = [];
        for (const pack of this.layers) {
            if (pack.has(path)) {
                const value = pack.json(path);
                if (value !== undefined) {
                    found.push(value);
                }
            }
        }
        return found;
    }

    /**
     * Ids of every file of one kind across all layers.
     * @param {"blockstates"|"models"|"textures"} kind
     * @param {string} ext
     * @returns {string[]}
     */
    list_ids(kind, ext) {
        const ids = new Set();
        const pattern = new RegExp(`^assets/([^/]+)/${kind}/(.+)\\.${ext}$`);
        for (const pack of this.layers) {
            for (const path of pack.paths()) {
                const match = pattern.exec(path);
                if (match) {
                    ids.add(`${match[1]}:${match[2]}`);
                }
            }
        }
        return [...ids];
    }
}
