import { TAG, list, long, write_nbt } from "./Nbt.mjs?v=462b4e5";
import { BlueprintBuilder, SchematicError, props_of } from "./Blueprint.mjs?v=462b4e5";

/**
 * Litematica (`.litematic`): regions with a palette and the cells packed into longs, `bits` per cell
 * (at least 2) in one continuous stream, so a cell may reach into the next long.
 * The cell of x, y, z in a region is number `(y * |size z| + z) * |size x| + x`.
 * A size can be negative, then the region reaches from its position towards smaller coordinates.
 */

const bits_for = palette_size => Math.max(2, 32 - Math.clz32(palette_size - 1));

/** @param {Record<string, any>} root */
export function is_litematic(root) {
    return root.Regions !== undefined && typeof root.Regions === "object" && !Array.isArray(root.Regions?.items);
}

/**
 * @param {Record<string, any>} root
 * @returns {import("./Blueprint.mjs?v=462b4e5").Blueprint}
 */
export function read_litematic(root) {
    const regions = Object.values(root.Regions);
    if (regions.length === 0) {
        throw new SchematicError("damaged", "The litematic has no region");
    }
    const parsed = regions.map((region) => {
        const { Position: p, Size: s } = region;
        if (!p || !s) {
            throw new SchematicError("damaged", "A region of the litematic has no position or size");
        }
        const size = [Math.abs(s.x), Math.abs(s.y), Math.abs(s.z)];
        const low = [p.x + Math.min(0, s.x + 1), p.y + Math.min(0, s.y + 1), p.z + Math.min(0, s.z + 1)];
        const volume = size[0] * size[1] * size[2];
        if (volume > 2 ** 31) {
            throw new SchematicError("damaged", "A region of the litematic is too big");
        }
        return { region, size, low, volume };
    });
    const corner = [0, 1, 2].map(axis => Math.min(...parsed.map(r => r.low[axis])));
    const far = [0, 1, 2].map(axis => Math.max(...parsed.map(r => r.low[axis] + r.size[axis])));
    const builder = new BlueprintBuilder({ x: far[0] - corner[0], y: far[1] - corner[1], z: far[2] - corner[2] }, {
        name: root.Metadata?.Name || undefined,
        author: root.Metadata?.Author || undefined,
        data_version: root.MinecraftDataVersion,
    });

    for (const { region, size, low, volume } of parsed) {
        const palette = (region.BlockStatePalette?.items ?? []).map(entry => ({ name: entry.Name, props: props_of(entry.Properties) }));
        if (palette.length === 0 && volume > 0) {
            throw new SchematicError("damaged", "A region of the litematic has no palette");
        }
        const mapped = palette.map(state => builder.entry(state));
        const longs = region.BlockStates;
        const bits = bits_for(palette.length);
        if (!(longs instanceof BigInt64Array) || longs.length * 64 < volume * bits) {
            throw new SchematicError("damaged", "A region of the litematic has less blocks than its size says");
        }
        // The longs as 32 bit words, low word first: the stream of bits is then the same in either view
        const words = new Uint32Array(longs.buffer, longs.byteOffset, longs.length * 2);
        const mask = bits >= 32 ? 0xFFFFFFFF : (2 ** bits - 1);
        const [sx, sy, sz] = size;
        const dx = low[0] - corner[0];
        const dy = low[1] - corner[1];
        const dz = low[2] - corner[2];
        let at = 0;
        for (let y = 0; y < sy; y++) {
            for (let z = 0; z < sz; z++) {
                for (let x = 0; x < sx; x++, at++) {
                    const bit = at * bits;
                    const word = bit >>> 5;
                    const shift = bit & 31;
                    let value = words[word] >>> shift;
                    if (shift + bits > 32) {
                        value |= words[word + 1] << (32 - shift);
                    }
                    value = (value & mask) >>> 0;
                    if (value >= palette.length) {
                        throw new SchematicError("damaged", "A region of the litematic uses a block that is not in its palette");
                    }
                    builder.add(dx + x, dy + y, dz + z, mapped[value]);
                }
            }
        }
        builder.meta.ignored.block_entities += region.TileEntities?.items?.length ?? 0;
        builder.meta.ignored.entities += region.Entities?.items?.length ?? 0;
    }
    return builder.finish();
}

/**
 * @param {import("./Blueprint.mjs?v=462b4e5").Blueprint} blueprint
 * @param {{data_version: number, name?: string, author?: string}} options
 * @returns {Uint8Array}
 */
export function write_litematic(blueprint, { data_version, name = "Redstone Modeler", author = "" }) {
    const { size, xs, ys, zs, ps } = blueprint;
    // Air is cell 0, as Litematica does it, then the states in the order of the blueprint
    const palette = [{ name: "minecraft:air", props: {} }, ...blueprint.palette];
    const bits = bits_for(palette.length);
    const volume = size.x * size.y * size.z;
    const words = new Uint32Array(Math.ceil(volume * bits / 64) * 2);
    for (let i = 0; i < ps.length; i++) {
        const cell = (ys[i] * size.z + zs[i]) * size.x + xs[i];
        const value = ps[i] + 1;
        const bit = cell * bits;
        const word = bit >>> 5;
        const shift = bit & 31;
        words[word] |= value << shift;
        if (shift + bits > 32) {
            words[word + 1] |= value >>> (32 - shift);
        }
    }
    const longs = new BigInt64Array(words.buffer, 0, words.length / 2);
    const now = BigInt(Date.now());
    return write_nbt({
        MinecraftDataVersion: data_version,
        Version: 6,
        Metadata: {
            Name: name,
            Author: author,
            Description: "",
            RegionCount: 1,
            TotalVolume: volume,
            TotalBlocks: ps.length,
            TimeCreated: long(now),
            TimeModified: long(now),
            EnclosingSize: { x: size.x, y: size.y, z: size.z },
        },
        Regions: {
            [name]: {
                Position: { x: 0, y: 0, z: 0 },
                Size: { x: size.x, y: size.y, z: size.z },
                BlockStatePalette: list(TAG.COMPOUND, palette.map(({ name: block, props }) => (
                    Object.keys(props).length === 0
                        ? { Name: block }
                        : { Name: block, Properties: Object.fromEntries(Object.entries(props).map(([key, value]) => [key, String(value)])) }
                ))),
                BlockStates: longs,
                TileEntities: list(TAG.COMPOUND, []),
                Entities: list(TAG.COMPOUND, []),
                PendingBlockTicks: list(TAG.COMPOUND, []),
                PendingFluidTicks: list(TAG.COMPOUND, []),
            },
        },
    }, "");
}
