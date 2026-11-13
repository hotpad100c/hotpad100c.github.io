import { default_state, select_models_layered } from "./BlockStates.mjs?v=462b4e5";
import { MISSING, MISSING_MODEL, build_block } from "../render/BlockMesher.mjs?v=462b4e5";
import { sample_colors } from "../render/Tint.mjs?v=462b4e5";
import { normalize_id } from "./PackStack.mjs?v=462b4e5";

/**
 * `oak_slab` to `Oak Slab`: the name used when no language file knows a block.
 * @param {string} id
 */
export function pretty_name(id) {
    const path = id.slice(id.indexOf(":") + 1);
    return path.split("/").pop().split("_").filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
}

const FULL_CUBE_FACES = ["down", "up", "north", "south", "west", "east"];

/**
 * Runtime view of a compiled resource pack stack: which blocks exist, what states they have,
 * and the geometry of every state. Independent of the original zip files.
 */
export class CompiledPack {
    /**
     * @param {object} data Contents of `data.json`
     * @param {object} [extras]
     * @param {object} [extras.colormaps] Decoded colour maps, see Tint.mjs
     * @param {Record<string, Uint8Array>} [extras.lang] JSON bytes of the block names of each language
     */
    constructor(data, extras = {}) {
        this.data = data;
        this.name = data.name ?? "Resource pack";
        this.colormaps = extras.colormaps ?? {};
        this.lang_bytes = extras.lang ?? {};
        this.lang_cache = new Map();
        this.names = Object.keys(data.index).sort();
        this.cache = new Map();
    }

    /** Languages the block names are available in: `{code, name, region}`. Empty for packs compiled before names were read. */
    get languages() {
        return this.data.languages ?? [];
    }

    /**
     * Block names of one language.
     * @param {string} code Language code such as `zh_cn`
     * @returns {Record<string, string>|null}
     */
    lang_names(code) {
        if (!this.lang_cache.has(code)) {
            let names = null;
            const bytes = this.lang_bytes[code];
            if (bytes) {
                try {
                    names = JSON.parse(new TextDecoder().decode(bytes));
                }
                catch {
                    names = null;
                }
            }
            this.lang_cache.set(code, names);
        }
        return this.lang_cache.get(code);
    }

    /**
     * Name of a block in a language, else its English name, else a name made up from the id.
     * @param {string} id
     * @param {string} [code] Language code such as `zh_cn`; empty for English
     */
    display_name(id, code = "") {
        for (const language of [code, "en_us"]) {
            const name = language ? this.lang_names(language)?.[id] : undefined;
            if (name) {
                return name;
            }
        }
        return pretty_name(id);
    }

    /** The colours of grass and leaves: stored in a shared pack, else taken from the colour maps. */
    tint_colors() {
        return this.data.tint_colors ?? sample_colors(this.colormaps);
    }

    properties(name) {
        return this.data.index[name] ?? {};
    }

    default_state(name) {
        return default_state(this.properties(name));
    }

    /**
     * @param {string} id
     * @returns {{x: number, y: number, w: number, h: number, opaque: boolean, translucent: boolean}|undefined}
     */
    texture(id) {
        return this.data.atlas.textures[id] ?? this.data.atlas.textures[MISSING];
    }

    is_opaque(id) {
        return this.texture(id)?.opaque ?? false;
    }

    /**
     * Quads of one block state. Missing models turn into the missing-texture cube;
     * models without elements (entity blocks) become a cube of their particle texture.
     * @param {string} name
     * @param {Record<string, string>} state
     * @returns {{quads: import("../render/BlockMesher.mjs?v=462b4e5").Quad[], occludes: boolean}}
     */
    geometry(name, state) {
        const key = `${name}|${Object.keys(state).sort().map(k => `${k}=${state[k]}`).join(",")}`;
        let geometry = this.cache.get(key);
        if (!geometry) {
            try {
                geometry = this._build(name, { ...this.default_state(name), ...state });
            }
            catch (error) {
                // Data from a shared model can be malformed; the block just shows up as missing
                console.warn(`Could not build ${name}`, error);
                geometry = build_block([{ x: 0, y: 0, uvlock: false, model: MISSING_MODEL }], id => this.is_opaque(id));
            }
            this.cache.set(key, geometry);
        }
        return geometry;
    }

    /**
     * Text that is equal for states that look the same, ignoring tint.
     * @param {string} name
     * @param {Record<string, string>} state
     */
    signature(name, state) {
        const round = v => Math.round(v * 1000) / 1000;
        return JSON.stringify(this.geometry(name, state).quads.map(q => [
            q.pos.map(round), q.uv.map(round), q.tex, q.tint, round(q.shade),
        ]));
    }

    _build(name, state) {
        const defs = this.data.blockstates[name] ?? [];
        const chosen = select_models_layered(defs, state);
        if (!chosen) {
            return build_block([{ x: 0, y: 0, uvlock: false, model: MISSING_MODEL }], id => this.is_opaque(id));
        }
        const variants = chosen.map(variant => ({
            ...variant,
            model: this.data.models[normalize_id(variant.model)] ?? MISSING_MODEL,
        }));
        const result = build_block(variants, id => this.is_opaque(id));
        if (result.quads.length === 0) {
            const particle = variants.map(v => v.model.particle).find(Boolean);
            if (particle) {
                const cube = {
                    elements: [{
                        from: [0, 0, 0],
                        to: [16, 16, 16],
                        faces: Object.fromEntries(FULL_CUBE_FACES.map(dir => [dir, { uv: [0, 0, 16, 16], texture: particle }])),
                    }],
                };
                return build_block([{ x: 0, y: 0, uvlock: false, model: cube }], id => this.is_opaque(id));
            }
        }
        return result;
    }
}
