import { TAG, list, short, write_nbt } from "./Nbt.mjs?v=462b4e5";
import { BlueprintBuilder, SchematicError, format_state, parse_state } from "./Blueprint.mjs?v=462b4e5";

/**
 * Sponge schematics (`.schem`, WorldEdit and most tools).
 * Version 2 has the fields in the root, which is named `Schematic`; version 3 has a `Schematic`
 * compound in the root, with the blocks in `Blocks`. The cells are palette numbers, one varint each,
 * and the cell of x, y, z is number `x + z * Width + y * Width * Length`.
 */

/** @param {Record<string, any>} root */
export function sponge_body(root) {
    const inner = root.Schematic;
    return inner && typeof inner === "object" && !Array.isArray(inner.items) && !(inner instanceof Int8Array) ? inner : root;
}

/** @param {Record<string, any>} root */
export function is_sponge(root) {
    const body = sponge_body(root);
    const blocks = body.Blocks && typeof body.Blocks === "object" && body.Blocks.Palette ? body.Blocks : body;
    return body.Width !== undefined && body.Length !== undefined && body.Height !== undefined
        && blocks.Palette !== undefined && (blocks.BlockData ?? blocks.Data) instanceof Int8Array;
}

const unsigned_short = value => value & 0xFFFF;

/**
 * @param {Record<string, any>} root
 * @returns {import("./Blueprint.mjs?v=462b4e5").Blueprint}
 */
export function read_sponge(root) {
    const body = sponge_body(root);
    const blocks = body.Blocks && body.Blocks.Palette ? body.Blocks : body;
    const size = { x: unsigned_short(body.Width), y: unsigned_short(body.Height), z: unsigned_short(body.Length) };
    const builder = new BlueprintBuilder(size, { data_version: body.DataVersion, name: body.Metadata?.Name || undefined, author: body.Metadata?.Author || undefined });
    const data = blocks.BlockData ?? blocks.Data;
    const states = [];
    for (const [text, number] of Object.entries(blocks.Palette)) {
        states[number] = builder.entry(parse_state(text));
    }
    const volume = size.x * size.y * size.z;
    let at = 0;
    for (let cell = 0; cell < volume; cell++) {
        let value = 0;
        let shift = 0;
        for (;;) {
            if (at >= data.length) {
                throw new SchematicError("damaged", "The schematic has less blocks than its size says");
            }
            const part = data[at++] & 0xFF;
            value |= (part & 0x7F) << shift;
            if ((part & 0x80) === 0) {
                break;
            }
            shift += 7;
            if (shift > 28) {
                throw new SchematicError("damaged", "The schematic has a number that is too long");
            }
        }
        const entry = states[value];
        if (entry === undefined) {
            throw new SchematicError("damaged", "The schematic uses a block that is not in its palette");
        }
        if (entry >= 0) {
            const x = cell % size.x;
            const z = Math.floor(cell / size.x) % size.z;
            builder.add(x, Math.floor(cell / (size.x * size.z)), z, entry);
        }
    }
    builder.meta.ignored.block_entities += blocks.BlockEntities?.items?.length ?? body.BlockEntities?.items?.length ?? 0;
    builder.meta.ignored.entities += body.Entities?.items?.length ?? 0;
    return builder.finish();
}

/**
 * Version 2, which every tool of the last years reads.
 * @param {import("./Blueprint.mjs?v=462b4e5").Blueprint} blueprint
 * @param {{data_version: number, name?: string, author?: string}} options
 */
export function write_sponge(blueprint, { data_version, name = "", author = "" }) {
    const { size, xs, ys, zs, ps } = blueprint;
    if (size.x > 65535 || size.y > 65535 || size.z > 65535) {
        throw new SchematicError("damaged", "A Sponge schematic can be 65535 blocks at most in each direction");
    }
    const palette = { "minecraft:air": 0 };
    blueprint.palette.forEach((state, i) => {
        palette[format_state(state)] = i + 1;
    });
    const volume = size.x * size.y * size.z;
    const cells = new Uint32Array(volume);
    for (let i = 0; i < ps.length; i++) {
        cells[(ys[i] * size.z + zs[i]) * size.x + xs[i]] = ps[i] + 1;
    }
    const bytes = [];
    for (const value of cells) {
        let rest = value;
        while (rest >= 0x80) {
            bytes.push((rest & 0x7F) | 0x80);
            rest >>>= 7;
        }
        bytes.push(rest);
    }
    return write_nbt({
        Version: 2,
        DataVersion: data_version,
        Metadata: { Name: name, Author: author },
        Width: short(size.x),
        Height: short(size.y),
        Length: short(size.z),
        Offset: Int32Array.of(0, 0, 0),
        PaletteMax: blueprint.palette.length + 1,
        Palette: palette,
        BlockData: Int8Array.from(bytes),
        BlockEntities: list(TAG.COMPOUND, []),
    }, "Schematic");
}
