import { Inflate, deflateSync, strToU8 } from "../../lib/fflate.module.js?v=462b4e5";
import { serialize } from "../model/Save.mjs?v=462b4e5";
import { compose_atlas, extract_pixels, repack_atlas } from "../pack/Atlas.mjs?v=462b4e5";
import { select_models_layered } from "../pack/BlockStates.mjs?v=462b4e5";
import { model_ids } from "../pack/Compiler.mjs?v=462b4e5";
import { normalize_id } from "../pack/PackStack.mjs?v=462b4e5";
import { read_rmpack, write_rmpack } from "../pack/Rmpack.mjs?v=462b4e5";
import { pack as pack_value, unpack as unpack_value } from "./Compact.mjs?v=462b4e5";
import { shorten } from "./Shorten.mjs?v=462b4e5";
import { decode_textures, encode_textures } from "./Textures.mjs?v=462b4e5";
import { MISSING } from "../render/BlockMesher.mjs?v=462b4e5";

/** Start of a share code in the standard form: a `.rmmodel` file as text. Tells it apart from the code of a save, which only holds the blocks. */
export const SHARE_PREFIX = "RMS1.";
/** Start of a share code in the compact form */
export const COMPACT_PREFIX = "RMS2.";
const COMPACT_MAGIC = [0x52, 0x4D, 0x53, 0x32]; // "RMS2"
/** The most a compact share may unpack to */
const MAX_UNPACKED = 64 * 1024 * 1024;
/** Longest message of most chat services */
export const CHAT_LIMIT = 2000;

const MAX_CODE_LENGTH = 64_000_000;
const SHARED_SUFFIX = " (shared)";

/**
 * The block states a model uses, with every property filled in.
 * @param {import("../model/World.mjs?v=462b4e5").World} world
 * @param {import("../pack/CompiledPack.mjs?v=462b4e5").CompiledPack} pack
 * @returns {Map<string, Map<string, Record<string, string>>>} Block id to its states by key
 */
export function used_states(world, pack) {
    const used = new Map();
    for (const [, , , block] of world.entries()) {
        if (!pack.data.blockstates[block.name]) {
            continue;
        }
        const properties = pack.properties(block.name);
        const state = Object.fromEntries(Object.entries(properties).map(([prop, values]) => [prop, block.props[prop] ?? values[0]]));
        if (!used.has(block.name)) {
            used.set(block.name, new Map());
        }
        used.get(block.name).set(JSON.stringify(Object.values(state)), state);
    }
    return used;
}

/**
 * Everything a small resource pack needs for the blocks of a model, except the picture.
 * @param {import("../pack/CompiledPack.mjs?v=462b4e5").CompiledPack} pack
 * @param {ReturnType<typeof used_states>} used
 * @param {object} options
 * @param {"used"|"all"} options.scope `used`: only the states that are placed, `all`: every state of the blocks that are placed
 * @param {string[]} options.languages Language codes to take the block names of
 * @returns {{data: object, texture_ids: string[], lang: Record<string, Record<string, string>>}}
 */
export function build_mini_data(pack, used, { scope, languages }) {
    const blockstates = {};
    const index = {};
    const wanted_models = new Set();

    for (const [name, states] of used) {
        const defs = pack.data.blockstates[name];
        const properties = pack.properties(name);
        if (scope === "all") {
            blockstates[name] = defs;
            index[name] = properties;
            defs.flatMap(model_ids).forEach(id => wanted_models.add(normalize_id(id)));
            continue;
        }
        // One condition per placed state, with the models the layered packs pick for it
        const parts = [];
        const values = Object.fromEntries(Object.keys(properties).map(prop => [prop, new Set()]));
        for (const state of states.values()) {
            for (const prop of Object.keys(properties)) {
                values[prop].add(state[prop]);
            }
            for (const variant of select_models_layered(defs, state) ?? []) {
                const apply = { model: normalize_id(variant.model) };
                if (variant.x) {
                    apply.x = variant.x;
                }
                if (variant.y) {
                    apply.y = variant.y;
                }
                if (variant.uvlock) {
                    apply.uvlock = true;
                }
                parts.push({ when: { ...state }, apply });
                wanted_models.add(apply.model);
            }
        }
        blockstates[name] = [{ multipart: parts }];
        index[name] = Object.fromEntries(Object.entries(properties).map(([prop, list]) => [prop, list.filter(v => values[prop].has(v))]));
    }

    const models = {};
    const textures = new Set([MISSING]);
    for (const id of wanted_models) {
        const model = pack.data.models[id];
        if (model) {
            models[id] = model;
            for (const element of model.elements) {
                for (const face of Object.values(element.faces)) {
                    if (face.texture) {
                        textures.add(face.texture);
                    }
                }
            }
            if (model.particle) {
                textures.add(model.particle);
            }
        }
    }

    const lang = {};
    const language_list = [];
    for (const code of new Set(languages.filter(Boolean))) {
        const all = pack.lang_names(code);
        if (all) {
            lang[code] = Object.fromEntries([...used.keys()].filter(id => all[id]).map(id => [id, all[id]]));
            language_list.push(pack.languages.find(l => l.code === code) ?? { code, name: "", region: "" });
        }
    }

    const data = {
        name: `${pack.name.replace(/ \(shared\)$/, "")}${SHARED_SUFFIX}`,
        created: Date.now(),
        sources: [pack.name],
        atlas: null,
        index,
        blockstates,
        models,
        languages: language_list,
        tint_colors: pack.tint_colors(),
        shared: true,
    };
    return { data, texture_ids: [...textures].sort(), lang };
}

/**
 * The same as build_mini_data for the whole pack: every block, model and texture, with the names of the chosen languages.
 * @param {import("../pack/CompiledPack.mjs?v=462b4e5").CompiledPack} pack
 * @param {object} options
 * @param {string[]} options.languages
 * @param {boolean} options.all_languages Keep the names of every language
 */
export function build_pack_data(pack, { languages, all_languages }) {
    const wanted = all_languages ? pack.languages.map(l => l.code) : [...new Set(languages.filter(Boolean))];
    const lang = {};
    const language_list = [];
    for (const code of wanted) {
        const names = pack.lang_names(code);
        if (names) {
            lang[code] = names;
            language_list.push(pack.languages.find(l => l.code === code) ?? { code, name: "", region: "" });
        }
    }
    const rest = { ...pack.data };
    delete rest.atlas;
    const data = {
        ...rest,
        name: `${pack.name.replace(/ \(shared\)$/, "")}${SHARED_SUFFIX}`,
        created: Date.now(),
        sources: [pack.name],
        atlas: null,
        languages: language_list,
        tint_colors: pack.tint_colors(),
        shared: true,
    };
    return { data, texture_ids: Object.keys(pack.data.atlas.textures).sort(), lang };
}

/** Size of some bytes once compressed, for telling where the size of a share goes. */
function packed_size(bytes) {
    return deflateSync(bytes, { level: 9 }).length;
}

/**
 * Colours of grass, leaves and redstone dust, by block. They are worked out from the names of the
 * blocks, which a pack with short codes for names would lose.
 */
function tint_rules_for(resources, ids) {
    const rules = {};
    for (const id of ids) {
        if (id.endsWith(":redstone_wire")) {
            rules[id] = { kind: "redstone", prop: "power" };
            continue;
        }
        const rgb = resources.tint(id, resources.pack.default_state(id));
        if (rgb.some(v => v !== 1)) {
            rules[id] = { kind: "rgb", rgb: rgb.map(v => Math.round(v * 255)) };
        }
    }
    return rules;
}

/** @param {Record<string, Record<string, string>>} lang */
function lang_files(lang) {
    return Object.fromEntries(Object.entries(lang).map(([code, names]) => [code, strToU8(JSON.stringify(names))]));
}

/**
 * The compact form of a model: one stream, not a zip. Everything with a name goes into a string
 * table, numbers are as short as they can be, the textures are palettes of colours or planes of
 * pixels without the border of the atlas, and all of it is compressed together.
 * @param {object} parts
 * @param {object} parts.data The pack data, `atlas` is not needed
 * @param {Record<string, Record<string, string>>} parts.lang
 * @param {object} parts.save A saved model
 * @param {{id: string, w: number, h: number, rgba: Uint8ClampedArray}[]} parts.pictures
 * @param {object} [options]
 * @param {number} [options.max_colors] Reduce the colours of the textures (lossy)
 * @returns {{raw: Uint8Array, parts: {models: number, pictures: number, names: number, model: number}}}
 */
export function pack_compact({ data, lang, save, pictures }, { max_colors = Infinity } = {}) {
    const rest = { ...data };
    delete rest.atlas;
    const pixels = encode_textures(pictures, { max_colors });
    const world = {
        size: save.size,
        packs: save.packs,
        palette: save.palette,
        xs: save.blocks.map(b => b[0]),
        ys: save.blocks.map(b => b[1]),
        zs: save.blocks.map(b => b[2]),
        ps: save.blocks.map(b => b[3]),
    };
    const value = { v: 2, data: rest, ids: pictures.map(p => p.id), pixels, lang, world };
    const packed = deflateSync(pack_value(value), { level: 9 });
    const raw = new Uint8Array(COMPACT_MAGIC.length + packed.length);
    raw.set(COMPACT_MAGIC);
    raw.set(packed, COMPACT_MAGIC.length);
    return {
        raw,
        parts: {
            models: packed_size(pack_value(rest)),
            pictures: packed_size(pixels),
            names: packed_size(pack_value(lang)),
            model: packed_size(pack_value(world)),
        },
    };
}

/** Inflates, but gives up when the result would be bigger than `max` bytes. */
function inflate_limited(bytes, max) {
    const chunks = [];
    let total = 0;
    let failure = null;
    const stream = new Inflate((chunk) => {
        total += chunk.length;
        if (total > max) {
            failure = new Error("The share is too big once unpacked");
            stream.terminate();
        }
        else {
            chunks.push(chunk);
        }
    });
    try {
        stream.push(bytes, true);
    }
    catch (error) {
        throw failure ?? new Error(`The share is damaged: ${error.message ?? error}`);
    }
    if (failure) {
        throw failure;
    }
    const out = new Uint8Array(total);
    let at = 0;
    for (const chunk of chunks) {
        out.set(chunk, at);
        at += chunk.length;
    }
    return out;
}

/** @param {Uint8Array} bytes */
export function is_compact(bytes) {
    return COMPACT_MAGIC.every((value, i) => bytes[i] === value);
}

/**
 * @param {Uint8Array} raw The compact form
 * @returns {{data: object, lang: Record<string, Record<string, string>>, save: object, pictures: {id: string, w: number, h: number, rgba: Uint8ClampedArray}[]}}
 */
export function unpack_compact(raw) {
    if (!is_compact(raw)) {
        throw new Error("This is not a compact share");
    }
    let value;
    try {
        value = unpack_value(inflate_limited(raw.subarray(COMPACT_MAGIC.length), MAX_UNPACKED));
    }
    catch (error) {
        throw new Error(error.message.startsWith("The share") ? error.message : `The share is damaged: ${error.message}`);
    }
    if (value?.v !== 2 || !value.data || !Array.isArray(value.ids) || !(value.pixels instanceof Uint8Array) || !value.world) {
        throw new Error("The share is not in a form this version knows");
    }
    const { world } = value;
    const count = world.xs?.length;
    if (![world.ys, world.zs, world.ps].every(list => list?.length === count)) {
        throw new Error("The share is damaged: the blocks do not match");
    }
    const pictures = decode_textures(value.pixels).map((picture, i) => ({ id: value.ids[i], ...picture }));
    if (pictures.length !== value.ids.length || pictures.some(p => typeof p.id !== "string")) {
        throw new Error("The share is damaged: the textures do not match");
    }
    const save = {
        version: 2,
        size: world.size,
        packs: world.packs ?? [],
        palette: world.palette,
        blocks: world.xs.map((x, i) => [x, world.ys[i], world.zs[i], world.ps[i]]),
    };
    return { data: value.data, lang: value.lang ?? {}, save, pictures };
}

/**
 * The standard form, a `.rmmodel`, of a share that may be in either form.
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array>}
 */
export async function to_standard(bytes) {
    if (!is_compact(bytes)) {
        return bytes;
    }
    const { data, lang, save, pictures } = unpack_compact(bytes);
    const { atlas, png } = await compose_atlas(pictures);
    return write_rmpack({ ...data, atlas }, png, {}, lang_files(lang), { "world.json": strToU8(JSON.stringify(save)) });
}

/**
 * @typedef {object} Exported
 * @property {Uint8Array} bytes The `.rmmodel` file
 * @property {Uint8Array} raw What a code or an upload is made of: the compact form if that was asked for, else the same as `bytes`
 * @property {string} code `raw` as a share code
 * @property {{blocks: number, models: number, textures: number, bytes: number, code_length: number, standard_code_length: number,
 *   compact: boolean, parts: {models: number, pictures: number, names: number, model: number}}} stats
 */

/**
 * Packs the model with the resources it needs.
 * @param {import("../render/Resources.mjs?v=462b4e5").Resources} resources
 * @param {import("../model/World.mjs?v=462b4e5").World} world
 * @param {object} options
 * @param {"used"|"all"|"pack"} options.scope `pack`: the whole compiled pack
 * @param {string} options.language Language of the block names to keep next to English, "" for English only
 * @param {boolean} [options.all_languages] With `pack`: keep the names of every language
 * @param {boolean} [options.compact] Make the compact form for codes and uploads (the `.rmmodel` file is always the standard form)
 * @param {boolean} [options.minimal] Smaller still, with a loss: at most 256 colours, and codes for the ids of blocks, states, models and textures. Only the names stay, so the receiver can search by them; implies `compact`.
 * @returns {Promise<Exported>}
 */
export async function export_model(resources, world, { scope, language, all_languages = false, compact = false, minimal = false }) {
    const { pack } = resources;
    const save = serialize(world, [pack.name]);
    const used = used_states(world, pack);
    const languages = ["en_us", language];
    const { data, texture_ids, lang } = scope === "pack"
        ? build_pack_data(pack, { languages, all_languages: all_languages && !minimal })
        : build_mini_data(pack, used, { scope, languages });

    // The standard form: a zip with an atlas that was cut out of the loaded one
    const { atlas, png } = await repack_atlas(resources.texture.image, pack.data.atlas.textures, texture_ids);
    const save_bytes = strToU8(JSON.stringify(save));
    const bytes = write_rmpack({ ...data, atlas }, png, {}, lang_files(lang), { "world.json": save_bytes });
    const standard_code = encode_code(bytes);
    const model_count = Object.keys(data.models).length;
    let raw = bytes;
    let code = standard_code;
    let parts = {
        models: packed_size(strToU8(JSON.stringify(data))),
        pictures: png.length,
        names: Object.values(lang_files(lang)).reduce((sum, content) => sum + packed_size(content), 0),
        model: packed_size(save_bytes),
    };

    if (compact || minimal) {
        const pictures = extract_pixels(resources.texture.image, pack.data.atlas.textures, texture_ids);
        const pieces = { data, lang, save, pictures };
        if (minimal) {
            const short = shorten({ data, lang, save, textures: texture_ids, tint_rules: tint_rules_for(resources, Object.keys(data.index)) });
            // The pictures follow the new ids
            const renamed = pictures.map(picture => ({ ...picture, id: short.maps.texture.get(picture.id) ?? picture.id }));
            Object.assign(pieces, { data: short.data, lang: short.lang, save: short.save, pictures: renamed });
        }
        const result = pack_compact(pieces, { max_colors: minimal ? 256 : Infinity });
        raw = result.raw;
        code = encode_code(raw);
        parts = result.parts;
    }
    return {
        bytes,
        raw,
        code,
        stats: {
            blocks: Object.keys(data.index).length,
            models: model_count,
            textures: texture_ids.length,
            bytes: raw.length,
            file_bytes: bytes.length,
            code_length: code.length,
            standard_code_length: standard_code.length,
            compact: compact || minimal,
            parts,
        },
    };
}

/**
 * A share as a code: `RMS2.` for the compact form, `RMS1.` for the standard one, and base64 after it.
 * @param {Uint8Array} bytes
 */
export function encode_code(bytes) {
    const compact = is_compact(bytes);
    const body = compact ? bytes.subarray(COMPACT_MAGIC.length) : bytes;
    let text = "";
    for (let i = 0; i < body.length; i += 0x8000) {
        text += String.fromCharCode(...body.subarray(i, i + 0x8000));
    }
    return (compact ? COMPACT_PREFIX : SHARE_PREFIX) + btoa(text);
}

/**
 * @param {string} code
 * @returns {Uint8Array} The bytes that `encode_code` was given
 */
export function decode_code(code) {
    const text = code.replace(/\s+/g, "");
    const compact = text.startsWith(COMPACT_PREFIX);
    if (!compact && !text.startsWith(SHARE_PREFIX)) {
        throw new Error("This is not a share code");
    }
    if (text.length > MAX_CODE_LENGTH) {
        throw new Error("The share code is too long");
    }
    let body;
    try {
        body = Uint8Array.from(atob(text.slice(SHARE_PREFIX.length)), c => c.charCodeAt(0));
    }
    catch {
        throw new Error("The share code is damaged");
    }
    if (!compact) {
        return body;
    }
    const out = new Uint8Array(COMPACT_MAGIC.length + body.length);
    out.set(COMPACT_MAGIC);
    out.set(body, COMPACT_MAGIC.length);
    return out;
}

/** True for text that is a share code of either form */
export function is_code(text) {
    const start = text.trim().slice(0, SHARE_PREFIX.length);
    return start === SHARE_PREFIX || start === COMPACT_PREFIX;
}

/**
 * Reads a `.rmmodel`: a resource pack that has a model in it.
 * @param {Uint8Array} bytes
 * @returns {{data: object, world: object}}
 */
export function read_model(bytes) {
    let parts;
    try {
        parts = read_rmpack(bytes);
    }
    catch (error) {
        throw new Error(`The shared model could not be read: ${error.message}`);
    }
    if (!parts.world) {
        throw new Error("This file has no model in it");
    }
    return { data: parts.data, world: parts.world };
}
