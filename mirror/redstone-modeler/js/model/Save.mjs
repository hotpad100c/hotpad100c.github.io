import { valid_size } from "./Settings.mjs?v=462b4e5";

/** @typedef {import("./World.mjs?v=462b4e5").World} World */

export const SAVE_VERSION = 2;

/**
 * @param {World} world
 * @param {string[]} pack_names Names of the packs the model was built with, for information
 */
export function serialize(world, pack_names = []) {
    const palette = [];
    const lookup = new Map();
    const blocks = [];
    for (const [x, y, z, block] of world.entries()) {
        const key = JSON.stringify([block.name, Object.entries(block.props).sort()]);
        if (!lookup.has(key)) {
            lookup.set(key, palette.length);
            palette.push({ name: block.name, props: block.props });
        }
        blocks.push([x, y, z, lookup.get(key)]);
    }
    return { version: SAVE_VERSION, size: world.size, packs: pack_names, palette, blocks };
}

/**
 * Replaces the contents of `world`. The world takes the size stored in the save.
 * Blocks outside the bounds are dropped.
 * @param {object} save
 * @param {World} world
 * @returns {number} Number of dropped blocks
 */
export function deserialize(save, world) {
    if (save?.version !== SAVE_VERSION) {
        throw new Error("Unsupported save: only version 2 saves can be loaded");
    }
    if (save.size !== undefined) {
        if (!valid_size(save.size)) {
            throw new Error("Unsupported save: the model size is out of range");
        }
        world.resize(save.size);
    }
    world.clear();
    let dropped = 0;
    for (const [x, y, z, index] of save.blocks) {
        const entry = save.palette[index];
        if (!entry || !world.set(x, y, z, { name: entry.name, props: { ...entry.props } })) {
            dropped++;
        }
    }
    return dropped;
}

/**
 * Same code format as the old editor: LZMA compressed JSON as base64.
 * @param {object} save
 * @param {{compress: Function}} lzma
 * @returns {Promise<string>}
 */
export function encode(save, lzma) {
    return new Promise((resolve, reject) => {
        lzma.compress(JSON.stringify(save), 9, (result, error) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(btoa(result.map(v => String.fromCharCode(v + 128)).join("")));
            }
        });
    });
}

/**
 * @param {string} code
 * @param {{decompress: Function}} lzma
 * @returns {Promise<object>}
 */
export function decode(code, lzma) {
    return new Promise((resolve, reject) => {
        try {
            const bytes = atob(code.trim()).split("").map(v => v.codePointAt(0) - 128);
            lzma.decompress(bytes, (result, error) => {
                if (error) {
                    reject(error);
                    return;
                }
                try {
                    resolve(JSON.parse(result));
                }
                catch (e) {
                    reject(e);
                }
            });
        }
        catch (e) {
            reject(e);
        }
    });
}
