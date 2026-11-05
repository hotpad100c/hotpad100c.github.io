import { pretty_name } from "../pack/CompiledPack.mjs?v=462b4e5";
import { normalize_id } from "../pack/PackStack.mjs?v=462b4e5";
import { MISSING } from "../render/BlockMesher.mjs?v=462b4e5";

/**
 * Replaces everything in a shared model that nobody has to read by short codes: block ids, the
 * names and values of block states, model ids and texture ids. What the user sees comes from the
 * language files, so every block gets a name; what is searched is only those names.
 *
 * The codes keep the order of the English names, so that the block list stays in order.
 * Block, model and texture codes contain a `:`, like the ids they replace, because the code that
 * looks them up expects one.
 */

/** @param {number} i */
const short = i => i.toString(36);

/** Codes in the order of a list, most used first. */
function codes_by_use(counts, prefix = "") {
    const sorted = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([key]) => key);
    return new Map(sorted.map((key, i) => [key, `${prefix}${short(i)}`]));
}

function bump(counts, key, n = 1) {
    counts.set(key, (counts.get(key) ?? 0) + n);
}

/** `a=b,c=d` of a variant key to pairs; "" and "normal" mean no conditions */
function split_variant_key(key) {
    if (key === "" || key === "normal") {
        return [];
    }
    return key.split(",").map((pair) => {
        const eq = pair.indexOf("=");
        return eq > 0 ? [pair.slice(0, eq), pair.slice(eq + 1)] : [pair, ""];
    });
}

/** Calls `visit(property, value)` for every condition of a multipart `when` */
function visit_when(when, visit) {
    if (Array.isArray(when.OR) || Array.isArray(when.AND)) {
        (when.OR ?? when.AND).forEach(clause => visit_when(clause, visit));
        return;
    }
    for (const [prop, wanted] of Object.entries(when)) {
        for (const value of String(wanted).split("|")) {
            visit(prop, value);
        }
    }
}

function model_refs(def) {
    const refs = [];
    const take = (entry) => {
        for (const variant of Array.isArray(entry) ? entry : [entry]) {
            if (variant?.model) {
                refs.push(variant.model);
            }
        }
    };
    Object.values(def.variants ?? {}).forEach(take);
    (def.multipart ?? []).forEach(part => take(part.apply));
    return refs;
}

/**
 * @param {object} parts
 * @param {object} parts.data The data of a pack: index, blockstates, models, languages and so on
 * @param {Record<string, Record<string, string>>} parts.lang Language code to `{block id: name}`
 * @param {{palette: {name: string, props: Record<string, string>}[]}} parts.save A saved model
 * @param {string[]} parts.textures Ids of the textures that are kept
 * @param {Record<string, {kind: string, rgb?: number[], prop?: string}>} [parts.tint_rules] By block id
 * @returns {{data: object, lang: object, save: object, textures: string[], maps: {block: Map<string, string>, texture: Map<string, string>, model: Map<string, string>, property: Map<string, string>, value: Map<string, string>}}}
 */
export function shorten({ data, lang, save, textures, tint_rules = {} }) {
    const ids = Object.keys(data.index);

    // Blocks, in the order of their English names
    const english = lang.en_us ?? {};
    const english_name = id => english[id] ?? pretty_name(id);
    const ordered = [...ids].sort((a, b) => english_name(a).localeCompare(english_name(b)) || (a < b ? -1 : 1));
    const width = Math.max(2, Math.ceil(Math.log(Math.max(1, ids.length)) / Math.log(36)));
    const block = new Map(ordered.map((id, i) => [id, `b:${short(i).padStart(width, "0")}`]));

    // Properties and their values
    const property_counts = new Map();
    const value_counts = new Map();
    for (const props of Object.values(data.index)) {
        for (const [prop, values] of Object.entries(props)) {
            bump(property_counts, prop);
            values.forEach(value => bump(value_counts, value));
        }
    }
    for (const defs of Object.values(data.blockstates)) {
        for (const def of defs) {
            for (const key of Object.keys(def.variants ?? {})) {
                for (const [prop, value] of split_variant_key(key)) {
                    bump(property_counts, prop);
                    bump(value_counts, value);
                }
            }
            for (const part of def.multipart ?? []) {
                if (part.when) {
                    visit_when(part.when, (prop, value) => {
                        bump(property_counts, prop);
                        bump(value_counts, value);
                    });
                }
            }
        }
    }
    const property = codes_by_use(property_counts);
    const value = codes_by_use(value_counts);
    const prop_code = prop => property.get(prop) ?? prop;
    const value_code = v => value.get(v) ?? v;

    // Models and textures
    const model_counts = new Map();
    for (const defs of Object.values(data.blockstates)) {
        for (const def of defs) {
            model_refs(def).forEach(ref => bump(model_counts, normalize_id(ref)));
        }
    }
    for (const id of Object.keys(data.models)) {
        bump(model_counts, id, 0);
    }
    const model = codes_by_use(model_counts, "m:");
    const texture_counts = new Map();
    for (const id of textures) {
        bump(texture_counts, id, 0);
    }
    for (const entry of Object.values(data.models)) {
        for (const element of entry.elements ?? []) {
            for (const face of Object.values(element.faces ?? {})) {
                if (face.texture) {
                    bump(texture_counts, face.texture);
                }
            }
        }
    }
    texture_counts.delete(MISSING);
    const texture = codes_by_use(texture_counts, "t:");
    texture.set(MISSING, MISSING);
    const model_code = ref => model.get(normalize_id(ref)) ?? ref;
    const texture_code = id => texture.get(id) ?? id;

    const rename_entry = (entry) => {
        const one = variant => (variant?.model ? { ...variant, model: model_code(variant.model) } : variant);
        return Array.isArray(entry) ? entry.map(one) : one(entry);
    };
    const rename_when = (when) => {
        if (Array.isArray(when.OR) || Array.isArray(when.AND)) {
            const key = when.OR ? "OR" : "AND";
            return { [key]: when[key].map(rename_when) };
        }
        return Object.fromEntries(Object.entries(when).map(([prop, wanted]) => [
            prop_code(prop),
            String(wanted).split("|").map(value_code).join("|"),
        ]));
    };
    const rename_def = (def) => {
        if (def.variants) {
            return {
                ...def,
                variants: Object.fromEntries(Object.entries(def.variants).map(([key, entry]) => [
                    split_variant_key(key).map(([prop, v]) => `${prop_code(prop)}=${value_code(v)}`).join(","),
                    rename_entry(entry),
                ])),
            };
        }
        return {
            ...def,
            multipart: (def.multipart ?? []).map(part => ({
                ...part,
                ...(part.when ? { when: rename_when(part.when) } : {}),
                apply: rename_entry(part.apply),
            })),
        };
    };

    const renamed = {
        ...data,
        index: Object.fromEntries(Object.entries(data.index).map(([id, props]) => [
            block.get(id),
            Object.fromEntries(Object.entries(props).map(([prop, values]) => [prop_code(prop), values.map(value_code)])),
        ])),
        blockstates: Object.fromEntries(Object.entries(data.blockstates).map(([id, defs]) => [block.get(id), defs.map(rename_def)])),
        models: Object.fromEntries(Object.entries(data.models).map(([id, entry]) => [
            model_code(id),
            {
                ...entry,
                particle: entry.particle ? texture_code(entry.particle) : entry.particle,
                elements: (entry.elements ?? []).map(element => ({
                    ...element,
                    faces: Object.fromEntries(Object.entries(element.faces ?? {}).map(([dir, face]) => [dir, face.texture ? { ...face, texture: texture_code(face.texture) } : face])),
                })),
            },
        ])),
        minimal: true,
    };

    // Names: every block has one, or it could not be told apart from the others
    const names = {};
    for (const [code, entries] of Object.entries(lang)) {
        names[code] = Object.fromEntries(Object.entries(entries).filter(([id]) => block.has(id)).map(([id, name]) => [block.get(id), name]));
    }
    names.en_us ??= {};
    for (const id of ids) {
        const code = block.get(id);
        if (!names.en_us[code] && !Object.values(names).some(entries => entries[code])) {
            names.en_us[code] = pretty_name(id);
        }
    }

    // Colours of grass, leaves and redstone dust came from the names of the blocks; keep them as rules
    const rules = {};
    for (const [id, rule] of Object.entries(tint_rules)) {
        if (!block.has(id)) {
            continue;
        }
        if (rule.kind === "redstone") {
            const levels = {};
            for (const [v, code] of value) {
                if (/^\d+$/.test(v)) {
                    levels[code] = Number(v);
                }
            }
            rules[block.get(id)] = { kind: "redstone", prop: prop_code(rule.prop), levels };
        }
        else {
            rules[block.get(id)] = rule;
        }
    }
    renamed.tint_rules = rules;

    const renamed_save = {
        ...save,
        palette: save.palette.map(({ name, props }) => ({
            name: block.get(name) ?? name,
            props: Object.fromEntries(Object.entries(props).map(([prop, v]) => [prop_code(prop), value_code(v)])),
        })),
    };

    return {
        data: renamed,
        lang: names,
        save: renamed_save,
        textures: textures.map(texture_code),
        maps: { block, texture, model, property, value },
    };
}
