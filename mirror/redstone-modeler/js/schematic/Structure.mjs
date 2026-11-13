import { TAG, list, write_nbt } from "./Nbt.mjs?v=462b4e5";
import { BlueprintBuilder, SchematicError, props_of, sorted_order } from "./Blueprint.mjs?v=462b4e5";

/**
 * The structure blocks of the game (`.nbt`): a palette, and a list of blocks with a position and a
 * state each. Mods add keys of their own (Create has `Railways_DataVersion`), which are left alone.
 */

/** @param {Record<string, any>} root */
export function is_structure(root) {
    return Array.isArray(root.blocks?.items) && Array.isArray((root.palette ?? root.palettes)?.items) && Array.isArray(root.size?.items);
}

/**
 * @param {Record<string, any>} root
 * @returns {import("./Blueprint.mjs?v=462b4e5").Blueprint}
 */
export function read_structure(root) {
    const [sx, sy, sz] = root.size.items;
    // `palettes` is the form with several variants (shipwrecks); the first one is used
    const palette_nbt = root.palette ?? root.palettes.items[0];
    const builder = new BlueprintBuilder({ x: sx, y: sy, z: sz }, { data_version: root.DataVersion });
    const states = palette_nbt.items.map(entry => builder.entry({ name: entry.Name, props: props_of(entry.Properties) }));
    for (const block of root.blocks.items) {
        const entry = states[block.state];
        const [x, y, z] = block.pos?.items ?? block.pos ?? [];
        if (entry === undefined || ![x, y, z].every(Number.isInteger)) {
            throw new SchematicError("damaged", "The structure has a block that is not understood");
        }
        if (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) {
            continue;
        }
        builder.add(x, y, z, entry);
        if (block.nbt) {
            builder.meta.ignored.block_entities++;
        }
    }
    builder.meta.ignored.entities += root.entities?.items?.length ?? 0;
    return builder.finish();
}

/**
 * @param {import("./Blueprint.mjs?v=462b4e5").Blueprint} blueprint
 * @param {{data_version: number}} options
 */
export function write_structure(blueprint, { data_version }) {
    const { size, xs, ys, zs, ps } = blueprint;
    return write_nbt({
        DataVersion: data_version,
        size: list(TAG.INT, [size.x, size.y, size.z]),
        palette: list(TAG.COMPOUND, blueprint.palette.map(({ name, props }) => (
            Object.keys(props).length === 0
                ? { Name: name }
                : { Name: name, Properties: Object.fromEntries(Object.entries(props).map(([key, value]) => [key, String(value)])) }
        ))),
        blocks: list(TAG.COMPOUND, sorted_order(blueprint).map(i => ({ pos: list(TAG.INT, [xs[i], ys[i], zs[i]]), state: ps[i] }))),
        entities: list(TAG.COMPOUND, []),
    }, "");
}
