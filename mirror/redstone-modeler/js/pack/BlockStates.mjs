/**
 * Blockstate JSON handling: property discovery and model selection.
 * A "state" is a plain object of strings, e.g. `{ facing: "north", powered: "true" }`.
 */

const FACING_ORDER = ["north", "east", "south", "west", "up", "down"];

/**
 * @param {string} key Variant key such as `facing=north,powered=true`
 * @returns {Record<string, string>}
 */
export function parse_variant_key(key) {
    const out = {};
    if (key === "" || key === "normal") {
        return out;
    }
    for (const pair of key.split(",")) {
        const eq = pair.indexOf("=");
        if (eq > 0) {
            out[pair.slice(0, eq)] = pair.slice(eq + 1);
        }
    }
    return out;
}

/**
 * Multipart `when` clause: a map of property to `a|b` alternatives,
 * or a single-key `OR` / `AND` list of such maps.
 * @param {object} when
 * @param {Record<string, string>} state
 */
export function when_matches(when, state) {
    if (Array.isArray(when.OR)) {
        return when.OR.some(clause => when_matches(clause, state));
    }
    if (Array.isArray(when.AND)) {
        return when.AND.every(clause => when_matches(clause, state));
    }
    return Object.entries(when).every(([prop, wanted]) =>
        String(wanted).split("|").includes(state[prop]),
    );
}

/**
 * Picks the first entry of a weighted variant list. Weighted randomness would make
 * the preview change between redraws, so the choice is deterministic.
 */
function first_variant(entry) {
    const variant = Array.isArray(entry) ? entry[0] : entry;
    if (!variant?.model) {
        return null;
    }
    return {
        model: variant.model,
        x: variant.x ?? 0,
        y: variant.y ?? 0,
        uvlock: variant.uvlock ?? false,
    };
}

/**
 * Chooses the models a blockstate file uses for a state.
 * @param {object} def Parsed blockstate JSON
 * @param {Record<string, string>} state
 * @returns {{model: string, x: number, y: number, uvlock: boolean}[]|null}
 *   null when the file has no entry for the state
 */
export function select_models(def, state) {
    if (def.variants) {
        let best = null;
        let best_score = -1;
        for (const [key, entry] of Object.entries(def.variants)) {
            const conditions = Object.entries(parse_variant_key(key));
            if (conditions.every(([prop, value]) => state[prop] === value) && conditions.length > best_score) {
                best = entry;
                best_score = conditions.length;
            }
        }
        const variant = best ? first_variant(best) : null;
        return variant ? [variant] : null;
    }
    if (Array.isArray(def.multipart)) {
        const out = [];
        for (const part of def.multipart) {
            if (!part.when || when_matches(part.when, state)) {
                const variant = first_variant(part.apply);
                if (variant) {
                    out.push(variant);
                }
            }
        }
        return out.length > 0 ? out : null;
    }
    return null;
}

/**
 * Same as select_models over several layers: the top layer that has an entry wins.
 * @param {object[]} defs Blockstate files of one block, top layer first
 * @param {Record<string, string>} state
 */
export function select_models_layered(defs, state) {
    for (const def of defs) {
        const models = select_models(def, state);
        if (models) {
            return models;
        }
    }
    return null;
}

/**
 * Every property value mentioned in one blockstate file.
 * @param {object} def
 * @returns {Map<string, Set<string>>}
 */
export function collect_properties(def) {
    const props = new Map();
    const add = (prop, value) => {
        if (!props.has(prop)) {
            props.set(prop, new Set());
        }
        props.get(prop).add(value);
    };
    const add_when = (when) => {
        if (Array.isArray(when.OR) || Array.isArray(when.AND)) {
            (when.OR ?? when.AND).forEach(add_when);
            return;
        }
        for (const [prop, wanted] of Object.entries(when)) {
            String(wanted).split("|").forEach(value => add(prop, value));
        }
    };
    for (const key of Object.keys(def.variants ?? {})) {
        for (const [prop, value] of Object.entries(parse_variant_key(key))) {
            add(prop, value);
        }
    }
    for (const part of def.multipart ?? []) {
        if (part.when) {
            add_when(part.when);
        }
    }
    return props;
}

/**
 * @param {Iterable<string>} values
 * @returns {string[]}
 */
export function sort_values(values) {
    const list = [...new Set(values)];
    if (list.every(v => v === "true" || v === "false")) {
        // A file that only mentions `powered=true` still describes a boolean property.
        return ["false", "true"];
    }
    if (list.every(v => /^-?\d+$/.test(v))) {
        return list.sort((a, b) => Number(a) - Number(b));
    }
    if (list.every(v => FACING_ORDER.includes(v))) {
        return FACING_ORDER.filter(v => list.includes(v));
    }
    return list;
}

/**
 * Builds the property table for one block.
 * @param {object[]} defs Blockstate files, any layer order
 * @param {Record<string, string[]>} [extra] Properties the block is known to have even when no file mentions them
 * @returns {Record<string, string[]>} property to ordered values; the first value is the default
 */
export function block_properties(defs, extra = {}) {
    const merged = new Map();
    const add = (prop, values) => {
        if (!merged.has(prop)) {
            merged.set(prop, new Set());
        }
        values.forEach(v => merged.get(prop).add(v));
    };
    for (const def of defs) {
        for (const [prop, values] of collect_properties(def)) {
            add(prop, values);
        }
    }
    for (const [prop, values] of Object.entries(extra)) {
        add(prop, values);
    }
    const out = {};
    for (const [prop, values] of merged) {
        // Variant keys can contain placeholders like "_false" that no real state has.
        const clean = [...values].filter(v => !v.startsWith("_"));
        out[prop] = sort_values(clean.length > 0 ? clean : values);
    }
    return out;
}

/**
 * First value of every property.
 * @param {Record<string, string[]>} properties
 */
export function default_state(properties) {
    return Object.fromEntries(Object.entries(properties).map(([prop, values]) => [prop, values[0]]));
}

/**
 * Number of state combinations.
 * @param {Record<string, string[]>} properties
 */
export function state_count(properties) {
    return Object.values(properties).reduce((n, values) => n * values.length, 1);
}

/**
 * Every combination of property values. The last property changes fastest.
 * @param {Record<string, string[]>} properties
 * @param {Record<string, string>} [filters] Property to the only value that is allowed
 * @returns {Generator<Record<string, string>>}
 */
export function* enumerate_states(properties, filters = {}) {
    const entries = Object.entries(properties).map(([prop, values]) => [
        prop,
        filters[prop] ? values.filter(v => v === filters[prop]) : values,
    ]);
    if (entries.some(([, values]) => values.length === 0)) {
        return;
    }
    const counters = entries.map(() => 0);
    for (;;) {
        yield Object.fromEntries(entries.map(([prop, values], i) => [prop, values[counters[i]]]));
        let i = entries.length - 1;
        while (i >= 0) {
            counters[i]++;
            if (counters[i] < entries[i][1].length) {
                break;
            }
            counters[i] = 0;
            i--;
        }
        if (i < 0) {
            return;
        }
    }
}
