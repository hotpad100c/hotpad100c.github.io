import { read_nbt } from "./Nbt.mjs?v=462b4e5";
import { DEFAULT_TARGET, SchematicError, TARGETS } from "./Blueprint.mjs?v=462b4e5";
export { DEFAULT_TARGET, SchematicError, TARGETS };
import { is_litematic, read_litematic, write_litematic } from "./Litematic.mjs?v=462b4e5";
import { is_sponge, read_sponge, write_sponge } from "./Sponge.mjs?v=462b4e5";
import { is_structure, read_structure, write_structure } from "./Structure.mjs?v=462b4e5";

export const FORMATS = {
    litematic: { extension: ".litematic", write: write_litematic },
    schem: { extension: ".schem", write: write_sponge },
    nbt: { extension: ".nbt", write: write_structure },
};

/** Most blocks a file may have; more than this is not a model somebody built by hand */
export const MAX_CELLS = 400_000_000;

/**
 * Reads a litematic, a Sponge schematic or a vanilla structure. The format is decided by what is in the
 * file, not by its name.
 * @param {Uint8Array} bytes
 * @returns {import("./Blueprint.mjs?v=462b4e5").Blueprint & {meta: {format: string}}}
 */
export function read_blueprint(bytes) {
    let root;
    try {
        root = read_nbt(bytes).value;
    }
    catch (error) {
        // A Bedrock structure is NBT too, with the other byte order; its first bytes look like a Java one
        const gzip = bytes[0] === 0x1F && bytes[1] === 0x8B;
        if (!gzip && bytes[0] === 0x0A) {
            throw new SchematicError("bedrock", "This looks like a Bedrock Edition structure (.mcstructure), which is not supported");
        }
        throw new SchematicError("unknown", `This is not a schematic: ${error.message}`);
    }
    let format;
    let blueprint;
    if (is_litematic(root)) {
        format = "litematic";
        blueprint = read_litematic(root);
    }
    else if (is_sponge(root)) {
        format = "schem";
        blueprint = read_sponge(root);
    }
    else if (is_structure(root)) {
        format = "nbt";
        blueprint = read_structure(root);
    }
    else if (root.Blocks instanceof Int8Array && (root.Materials !== undefined || root.Data instanceof Int8Array)) {
        throw new SchematicError("legacy", "This is an old .schematic (MCEdit, numbered blocks), which is not supported. Open it in WorldEdit or Litematica of a newer version and save it again as .schem or .litematic");
    }
    else {
        throw new SchematicError("unknown", "This is NBT, but not a litematic, a Sponge schematic or a structure");
    }
    const { x, y, z } = blueprint.size;
    if (![x, y, z].every(n => Number.isInteger(n) && n > 0) || x * y * z > MAX_CELLS) {
        throw new SchematicError("damaged", `The size of the schematic is not usable (${x} x ${y} x ${z})`);
    }
    blueprint.meta.format = format;
    return blueprint;
}

/**
 * @param {import("./Blueprint.mjs?v=462b4e5").Blueprint} blueprint
 * @param {"litematic"|"schem"|"nbt"} format
 * @param {{target?: string, name?: string, author?: string}} [options]
 * @returns {Uint8Array}
 */
export function write_blueprint(blueprint, format, { target = DEFAULT_TARGET, name, author } = {}) {
    const entry = TARGETS.find(t => t.id === target);
    if (!entry || !FORMATS[format]) {
        throw new SchematicError("unknown", "Unknown format or version to write");
    }
    return FORMATS[format].write(blueprint, { data_version: entry.data_version, name, author });
}

export { blueprint_from_world, fill_world } from "./Blueprint.mjs?v=462b4e5";
