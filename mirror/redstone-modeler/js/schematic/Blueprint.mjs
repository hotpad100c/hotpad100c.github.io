/**
 * What the schematic formats have in common: a box of blocks, each with a state.
 * Air is left out; the position of a block is relative to the corner of the box.
 *
 * @typedef {object} Blueprint
 * @property {{x: number, y: number, z: number}} size
 * @property {{name: string, props: Record<string, string>}[]} palette
 * @property {Int32Array} xs
 * @property {Int32Array} ys
 * @property {Int32Array} zs
 * @property {Int32Array} ps Index into the palette of every block
 * @property {{name?: string, author?: string, data_version?: number, format?: string, ignored: {block_entities: number, entities: number}}} meta
 */

/** Versions that can be written: the name of the game and its `DataVersion` (taken from minecraft-data) */
export const TARGETS = [
    { id: "1.20.1", data_version: 3465 },
    { id: "1.21.1", data_version: 3955 },
    { id: "1.21.4", data_version: 4189 },
    { id: "1.21.8", data_version: 4440 },
    { id: "26.3", data_version: 5023 },
];
export const DEFAULT_TARGET = "1.21.1";

const AIR = new Set(["minecraft:air", "minecraft:cave_air", "minecraft:void_air"]);
export const is_air = name => AIR.has(name);

/** Errors that the interface explains: `code` is `legacy`, `bedrock`, `unknown` or `damaged` */
export class SchematicError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "SchematicError";
        this.code = code;
    }
}

/**
 * `minecraft:oak_stairs[facing=north,half=bottom]` to a state
 * @param {string} text
 */
export function parse_state(text) {
    const open = text.indexOf("[");
    if (open < 0) {
        return { name: text, props: {} };
    }
    const props = {};
    for (const pair of text.slice(open + 1, text.lastIndexOf("]")).split(",")) {
        const eq = pair.indexOf("=");
        if (eq > 0) {
            props[pair.slice(0, eq)] = pair.slice(eq + 1);
        }
    }
    return { name: text.slice(0, open), props };
}

/** @param {{name: string, props: Record<string, string>}} state */
export function format_state({ name, props }) {
    const keys = Object.keys(props).sort();
    return keys.length === 0 ? name : `${name}[${keys.map(key => `${key}=${props[key]}`).join(",")}]`;
}

/** `Properties` of a palette entry (strings; a mod may have used numbers or bytes) to props */
export function props_of(nbt) {
    const props = {};
    for (const [key, value] of Object.entries(nbt ?? {})) {
        props[key] = typeof value === "bigint" ? String(value) : String(value);
    }
    return props;
}

/**
 * Collects blocks while a format is read: palette entries are reused, air is skipped.
 */
export class BlueprintBuilder {
    constructor(size, meta = {}) {
        this.size = size;
        this.palette = [];
        this.index = new Map();
        this.xs = [];
        this.ys = [];
        this.zs = [];
        this.ps = [];
        this.meta = { ignored: { block_entities: 0, entities: 0 }, ...meta };
    }

    /** Index of a state in the palette, or -1 for air */
    entry(state) {
        if (is_air(state.name)) {
            return -1;
        }
        const key = format_state(state);
        let at = this.index.get(key);
        if (at === undefined) {
            at = this.palette.length;
            this.palette.push(state);
            this.index.set(key, at);
        }
        return at;
    }

    add(x, y, z, palette_index) {
        if (palette_index >= 0) {
            this.xs.push(x);
            this.ys.push(y);
            this.zs.push(z);
            this.ps.push(palette_index);
        }
    }

    /** @returns {Blueprint} */
    finish() {
        return {
            size: this.size,
            palette: this.palette,
            xs: Int32Array.from(this.xs),
            ys: Int32Array.from(this.ys),
            zs: Int32Array.from(this.zs),
            ps: Int32Array.from(this.ps),
            meta: this.meta,
        };
    }
}

/**
 * The blocks of a world as a blueprint: the smallest box that holds them all, with its corner at 0,0,0.
 * @param {import("../model/World.mjs?v=462b4e5").World} world
 * @param {object} [meta]
 * @returns {Blueprint|null} null for an empty world
 */
export function blueprint_from_world(world, meta = {}) {
    if (world.count === 0) {
        return null;
    }
    const low = [Infinity, Infinity, Infinity];
    const high = [-Infinity, -Infinity, -Infinity];
    for (const [x, y, z] of world.entries()) {
        for (const [i, v] of [x, y, z].entries()) {
            low[i] = Math.min(low[i], v);
            high[i] = Math.max(high[i], v);
        }
    }
    const builder = new BlueprintBuilder({ x: high[0] - low[0] + 1, y: high[1] - low[1] + 1, z: high[2] - low[2] + 1 }, meta);
    for (const [x, y, z, block] of world.entries()) {
        builder.add(x - low[0], y - low[1], z - low[2], builder.entry({ name: block.name, props: { ...block.props } }));
    }
    return builder.finish();
}

/**
 * Puts a blueprint into a world: the world gets the size of the blueprint and holds nothing else.
 * @param {Blueprint} blueprint
 * @param {import("../model/World.mjs?v=462b4e5").World} world
 * @returns {number} Number of blocks placed
 */
export function fill_world(blueprint, world) {
    world.clear();
    world.resize(blueprint.size);
    const { palette, xs, ys, zs, ps } = blueprint;
    for (let i = 0; i < ps.length; i++) {
        const { name, props } = palette[ps[i]];
        world.set(xs[i], ys[i], zs[i], { name, props: { ...props } });
    }
    return world.count;
}

/** Order for writing: the same as every format indexes cells, so that a file is the same every time */
export function sorted_order(blueprint) {
    const { xs, ys, zs } = blueprint;
    const order = Array.from({ length: xs.length }, (_, i) => i);
    order.sort((a, b) => ys[a] - ys[b] || zs[a] - zs[b] || xs[a] - xs[b]);
    return order;
}
