import { normalize_id } from "./PackStack.mjs?v=462b4e5";

/**
 * Follows `#name` texture references to a resource id.
 * A texture can be a plain id, or since the game of 2026 an object `{"sprite": id, "force_translucent": true}`.
 * @param {Record<string, string|{sprite?: string, force_translucent?: boolean}>} textures
 * @param {string|{sprite?: string, force_translucent?: boolean}|undefined} ref
 * @param {Set<string>} [forced] Receives the ids of textures that must be drawn as see-through
 * @returns {string|null} null when the reference never resolves
 */
export function resolve_texture(textures, ref, forced) {
    const seen = new Set();
    let force = false;
    for (;;) {
        if (ref !== null && typeof ref === "object") {
            force ||= ref.force_translucent === true;
            ref = ref.sprite;
        }
        if (typeof ref === "string" && ref.startsWith("#")) {
            const name = ref.slice(1);
            if (seen.has(name)) {
                return null;
            }
            seen.add(name);
            ref = textures[name];
            continue;
        }
        break;
    }
    if (typeof ref !== "string") {
        return null;
    }
    const id = normalize_id(ref);
    if (force) {
        forced?.add(id);
    }
    return id;
}

/**
 * Flattens model files: follows `parent`, merges textures and replaces face
 * texture references with final resource ids.
 */
export class ModelResolver {
    /**
     * @param {(id: string) => object|undefined} load Returns the parsed model JSON for a normalized id
     */
    constructor(load) {
        this.load = load;
        this.cache = new Map();
    }

    /**
     * @param {string} id
     * @returns {{elements: object[], builtin: string|null, particle: string|null}|null} null when the model does not exist
     */
    resolve(id) {
        id = normalize_id(id);
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }
        this.cache.set(id, null); // Guards against parent cycles
        const result = this._resolve(id);
        this.cache.set(id, result);
        return result;
    }

    _resolve(id) {
        const chain = [];
        let builtin = null;
        let current = id;
        while (current && chain.length < 32) {
            const json = this.load(current);
            if (!json) {
                return chain.length === 0 ? null : this._flatten(chain, builtin);
            }
            chain.push(json);
            const parent = json.parent ? normalize_id(json.parent) : null;
            if (parent && parent.startsWith("minecraft:builtin/")) {
                builtin = parent.slice("minecraft:builtin/".length);
                break;
            }
            current = parent;
        }
        return this._flatten(chain, builtin);
    }

    _flatten(chain, builtin) {
        const textures = {};
        for (const json of [...chain].reverse()) {
            Object.assign(textures, json.textures);
        }
        const source = chain.find(json => Array.isArray(json.elements));
        const forced = new Set();
        const elements = (source?.elements ?? []).map(el => ({
            ...el,
            faces: Object.fromEntries(Object.entries(el.faces ?? {}).map(([dir, face]) => [
                dir,
                { ...face, texture: resolve_texture(textures, face.texture, forced) },
            ])),
        }));
        const result = { elements, builtin, particle: resolve_texture(textures, "#particle", forced) };
        if (forced.size > 0) {
            result.force_translucent = [...forced];
        }
        return result;
    }
}
